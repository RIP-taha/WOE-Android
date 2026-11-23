/* WORLD OF EMPIRES — military & conquest system (conventional forces; hooks into the engine via WOE_MIL) */
(() => {
"use strict";
const D = window.WOE_DATA, E = window.WOE, G = window.WOE_GEO, M = D.MIL, U = M.units, MS = M.missiles, MT = M.techs, TGK = Object.keys(M.targets);
const clamp = E.clamp, rnd = E.rnd;
const adj = {}; for (const [a, b] of M.borders) { (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a); }
const nbrs = id => [...(adj[id] || [])];
const isLandlocked = id => M.landlocked.includes(id);
const MORDER = ["hyper", "mrbm", "cruise", "srbm"];
const fail = (key, p) => ({ ok: false, key, p });
const own = w => [w.playerCountry.id, ...(w.playerCountry.territories || [])];
const isOwn = (w, id) => own(w).includes(id);
const q = tech => .6 + .8 * tech / 100;

/* ---------- force generation ---------- */
const techsFor = tech => M.startTechs.filter(([t]) => tech >= t).flatMap(([, l]) => l);
function forcesFor(id, pop, gdp, tech, bloc) {
  const def = M.defShare[id] ?? (bloc === "east" ? .02 : .016), f = def / .02, gb = Math.sqrt(gdp / 1e9), landl = isLandlocked(id), tc = techsFor(tech), has = t => tc.includes(t);
  return { def, techs: tc, div: 55 * Math.sqrt(pop) * Math.sqrt(f) / 10000, air: has("aviation") ? gb * f * .35 * (.4 + tech / 100) : 0, navy: has("shipbuilding") && !landl ? gb * f * .2 * (.3 + tech / 100) : 0, missiles: has("rocketry") ? gb * f * .25 * (tech / 100 + .3) : 0, ad: clamp(10 + tech * .6 + f * 5, 5, 90) };
}
function aiMil(n) {
  const f = forcesFor(n.id, n.pop, n.gdp, n.technology, n.bloc), army = f.div * (.7 + .9 * n.technology / 100);
  return { army, air: f.air, navy: f.navy, missiles: f.missiles, ad: f.ad, ready: clamp(55 + n.stability * .3, 40, 90), techs: f.techs, base: { army, air: f.air, navy: f.navy, missiles: f.missiles }, tg: Object.fromEntries(TGK.map(k => [k, 100])), weary: 0, mobil: 0 };
}
function playerMil(P) {
  const f = forcesFor(P.id, P.pop, P.gdp, P.technology, P.bloc), has = t => f.techs.includes(t), r = Math.round, tc = P.technology / 100;
  const units = Object.fromEntries(Object.keys(U).map(k => [k, 0]));
  units.infantry = r(f.div * .62); units.armor = has("armor") ? r(f.div * .12 * (.5 + tc)) : 0; units.artillery = has("artillery") ? r(f.div * .1) : 0;
  units.fighter = has("aviation") ? r(f.air * .65) : 0; units.bomber = has("jets") ? r(f.air * .25) : 0; units.drone = has("drones") ? r(f.air * .4) : 0;
  units.corvette = has("shipbuilding") ? r(f.navy * .5) : 0; units.destroyer = has("bluewater") ? r(f.navy * .22) : 0; units.transport = has("amphibious") ? Math.max(f.navy > 1 ? 1 : 0, r(f.navy * .15)) : 0; units.submarine = has("submarines") ? r(f.navy * .08) : 0; units.carrier = has("carriers") && f.navy > 25 ? 1 : 0;
  units.sam = r(f.ad / 8); units.shield = has("missileshield") ? r(f.ad / 30) : 0;
  const ms = Object.fromEntries(Object.keys(MS).map(k => [k, 0])), best = MORDER.find(k => has(MS[k].tech)); if (best) { ms[best] = r(f.missiles * (best === "srbm" ? 1 : .6)); if (best !== "srbm" && has("rocketry")) ms.srbm = r(f.missiles * .4); }
  return { units, missiles: ms, techs: f.techs.slice(), research: { active: null, progress: 0 }, queue: [], ready: 62, permits: { air: {}, land: {} }, weary: 0 };
}
function init(w) { w.wars = []; w.turnNotes = []; ensure(w); }
function ensure(w) {
  const P = w.playerCountry; w.wars = w.wars || []; w.turnNotes = w.turnNotes || [];
  if (!P.territories) P.territories = []; if (!P.occ) P.occ = {};
  if (!P.mil) P.mil = playerMil(P);
  for (const n of w.countries) if (!n.mil) n.mil = aiMil(n);
}
const bestMissile = techs => MORDER.find(k => techs.includes(MS[k].tech));

/* ---------- derived values ---------- */
const men = P => Object.entries(P.mil.units).reduce((a, [k, v]) => a + v * U[k].men, 0) + P.mil.queue.filter(o => o.kind === "unit").reduce((a, o) => a + o.qty * U[o.type].men, 0); // thousands
const manCap = P => P.pop * .011 / 1000;
const hasTech = (P, t) => P.mil.techs.includes(t);
function adOf(P) { const u = P.mil.units; return clamp(8 + P.technology * .1 + u.sam * U.sam.ad + u.shield * U.shield.ad, 0, 92); }
const fortOf = P => hasTech(P, "fortify") ? .15 : 0;
const effArmy = n => n.mil.army * (.6 + .4 * n.mil.tg.bases / 100), effAir = n => n.mil.air * (.3 + .7 * n.mil.tg.airfields / 100), effAd = n => n.mil.ad * (.2 + .8 * n.mil.tg.sam / 100), effNavy = n => n.mil.navy * (.4 + .6 * n.mil.tg.ports / 100), effReady = n => n.mil.ready * (.7 + .3 * n.mil.tg.command / 100);
function milOf(w, id) {
  const P = w.playerCountry;
  if (isOwn(w, id)) {
    const u = P.mil.units, ms = P.mil.missiles, qq = q(P.technology);
    const ground = u.infantry + u.armor * 2.3 + u.artillery * 1.6, air = u.fighter + u.bomber * 1.2 + u.drone * .3, navy = u.corvette + u.destroyer * 2.4 + u.submarine * 3 + u.carrier * 4 + u.transport * .4;
    const missiles = Object.entries(ms).reduce((a, [k, v]) => a + v * MS[k].dmg * MS[k].acc, 0);
    return { id, player: true, troops: men(P) * 1000, ground, air, navy, missiles, ad: adOf(P), ready: P.mil.ready, q: qq, techs: P.mil.techs, power: (ground + 2.2 * air + 1.6 * navy + 1.2 * missiles) * qq, weary: P.mil.weary };
  }
  const n = E.nodeById(w, id); if (!n || !n.mil) return null; const qq = q(n.technology), m = n.mil;
  const missiles = m.missiles * .7;
  return { id, troops: m.army * 10000, ground: effArmy(n), air: effAir(n), navy: effNavy(n), missiles, ad: effAd(n), ready: effReady(n), q: qq, techs: m.techs, tg: m.tg, weary: m.weary, power: (effArmy(n) + 2.2 * effAir(n) + 1.6 * effNavy(n) + 1.2 * missiles) * qq };
}
function ranking(w) { const ids = [w.playerCountry.id, ...w.countries.map(c => c.id)]; return ids.map(id => [id, milOf(w, id).power]).sort((a, b) => b[1] - a[1]); }
const rating = (w, id) => { const r = ranking(w); const top = r[0][1] || 1; const x = (r.find(a => a[0] === id) || [0, 0])[1]; return Math.round(Math.sqrt(x / top) * 100); };
const upkeep = w => { const P = w.playerCountry; if (!P.mil || w.sandbox) return 0; const sc = E.scale(w); let s = 0; for (const [k, v] of Object.entries(P.mil.units)) s += v * U[k].cost * U[k].up; for (const [k, v] of Object.entries(P.mil.missiles)) s += v * MS[k].cost * .004; return s * 1e9 * sc * (w.wars.some(x => x.status === "active") ? 1.4 : 1); };

/* ---------- production & research ---------- */
function unlocked(P, tech) { return !tech || hasTech(P, tech); }
function orderUnit(w, kind, type, qty) {
  const P = w.playerCountry, spec = kind === "missile" ? MS[type] : U[type]; qty = Math.max(1, Math.min(50, Math.round(qty))); if (!spec) return fail("msg.unknown");
  if (!unlocked(P, spec.tech)) return fail("msg.mil.locked", { mt: spec.tech });
  if (!w.sandbox && P.mil.queue.length >= 8) return fail("msg.mil.queueFull");
  const cost = spec.cost * qty * 1e9 * E.scale(w); if (P.treasury < cost) return fail("msg.noTreasury");
  if (!w.sandbox && kind === "unit" && U[type].men && men(P) + U[type].men * qty > manCap(P)) return fail("msg.mil.manpower");
  P.treasury -= cost; const mo = w.sandbox ? 1 : spec.months; P.mil.queue.push({ id: Math.random().toString(36).slice(2, 8), kind, type, qty, remaining: mo, total: mo });
  E.log(w, "log.mil.order", { qty, un: kind === "missile" ? "ms." + type : "un." + type, cost$: cost }); return { ok: true, key: "msg.mil.ordered", p: { qty, un: kind === "missile" ? "ms." + type : "un." + type } };
}
function startTech(w, key) {
  const P = w.playerCountry, t = MT[key]; if (!t) return fail("msg.unknown"); if (hasTech(P, key)) return fail("msg.researchDone"); if (P.mil.research.active) return fail("msg.researchBusy");
  const miss = t.req.find(r => !hasTech(P, r)); if (miss) return fail("msg.mil.needTech", { mt: miss });
  if (t.civil && !P.research.completed.includes(t.civil)) return fail("msg.mil.needCivil", { tech: t.civil });
  const cost = t.cost * 1e9 * E.scale(w); if (P.treasury < cost) return fail("msg.noTreasury");
  P.treasury -= cost; const mo = w.sandbox ? 1 : t.months; P.mil.research.active = { key, remaining: mo, months: mo }; P.mil.research.progress = 0; E.log(w, "log.mil.research", { mt: key, cost$: cost }); return { ok: true, key: "msg.researchStarted" };
}

/* ---------- reach: land borders, sea, airspace ---------- */
function landRoute(w, target) {
  const set = new Set(own(w)); if (set.has(target)) return null; const prev = {}, seen = new Set(set), qq = [...set];
  while (qq.length) { const c = qq.shift(); for (const nb of nbrs(c)) { if (seen.has(nb)) continue; if (!E.nodeById(w, nb) || isOwn(w, nb)) continue; seen.add(nb); prev[nb] = c; if (nb === target) { const path = []; let x = prev[target]; while (x && !set.has(x)) { path.unshift(x); x = prev[x]; } return path.length > 2 ? null : { transit: path, hops: path.length + 1 }; } qq.push(nb); } }
  return null;
}
const seaCapacity = P => P.mil.units.transport * U.transport.carry;
const reachKm = (w, id) => Math.min(...own(w).map(o => E.dist(o, id)));
const bbCache = {}; function countryAt(lon, lat) {
  if (!G) return null;
  for (const [id, rings] of Object.entries(G.countries)) { if (id === "CUS") continue; const bb = bbCache[id] || (bbCache[id] = rings.map(r => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of r) { a = Math.min(a, p[0]); c = Math.max(c, p[0]); b = Math.min(b, p[1]); d = Math.max(d, p[1]); } return [a, b, c, d]; }));
    rings.forEach((r, i) => { }); for (let i = 0; i < rings.length; i++) { const b = bb[i]; if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue; let c = false; const r = rings[i]; for (let a = 0, z = r.length - 1; a < r.length; z = a++) { const [xi, yi] = r[a], [xj, yj] = r[z]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c; } if (c) return id; } }
  return null;
}
function gc(a, b, t) { const r = Math.PI / 180, la1 = a[1] * r, lo1 = a[0] * r, la2 = b[1] * r, lo2 = b[0] * r, d = Math.acos(clamp(Math.sin(la1) * Math.sin(la2) + Math.cos(la1) * Math.cos(la2) * Math.cos(lo2 - lo1), -1, 1)); if (d < 1e-6) return a; const A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d), x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2), y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2), z = A * Math.sin(la1) + B * Math.sin(la2); return [Math.atan2(y, x) / r, Math.atan2(z, Math.hypot(x, y)) / r]; }
const routeCache = {};
function airTransit(w, target) {
  const mine = own(w); let o = mine[0], bd = 1e9; for (const m of mine) { const d = E.dist(m, target); if (d < bd) { bd = d; o = m; } }
  const key = o + ">" + target; if (routeCache[key]) return routeCache[key];
  const A = E.capOf(o), B = E.capOf(target), out = []; if (!A || !B) return (routeCache[key] = []);
  for (let i = 1; i < 60; i++) { const p = gc(A, B, i / 60), c = countryAt(p[0], p[1]); if (c && c !== target && !mine.includes(c) && !out.includes(c) && E.nodeById(w, c)) out.push(c); }
  return (routeCache[key] = out);
}
const permitOk = (w, id, kind) => { if (w.sandbox) return true; const P = w.playerCountry, n = E.nodeById(w, id); return (P.mil.permits[kind][id] || 0) > w.turn && n && n.relation > -10; };
function requestPermit(w, id, kind, target) {
  const P = w.playerCountry, t = w.countries.find(x => x.id === id), tg = target && w.countries.find(x => x.id === target); if (!t) return fail("msg.unknown"); if (!w.sandbox && permitOk(w, id, kind)) return fail("msg.alreadyPact");
  if (w.sandbox) { P.mil.permits[kind][id] = w.turn + 12; return { ok: true, key: "msg.mil.permitYes", p: { cid: id } }; }
  let s = t.relation + (P.trade.pacts.includes(id) ? 15 : 0) - (P.trade.embargo.includes(id) ? 60 : 0) - (kind === "land" ? 15 : 0);
  if (tg && tg.bloc !== "neutral" && tg.bloc === t.bloc) s -= 40; const need = 15;
  if (s >= need || (s >= 0 && rnd(w) < s / need * .6)) { P.mil.permits[kind][id] = w.turn + 12; E.log(w, "log.mil.permit", { cid: id, pm: kind }); return { ok: true, key: "msg.mil.permitYes", p: { cid: id } }; }
  t.relation = clamp(t.relation - 1, -100, 100); return fail("msg.mil.permitNo", { cid: id });
}
function violate(w, ids, kind) { for (const id of ids) { const n = E.nodeById(w, id); if (n && n.role === "ai") { n.relation = clamp(n.relation - 35, -100, 100); n.baseRel = clamp(n.baseRel - 6, -100, 100); E.log(w, "log.mil.violation", { cid: id, pm: kind }); } } }
function route(w, target) {
  const P = w.playerCountry, land = landRoute(w, target), lr = land ? { ...land, missing: land.transit.filter(id => !permitOk(w, id, "land")) } : null;
  const tr = airTransit(w, target), cap = seaCapacity(P);
  return { km: reachKm(w, target), land: lr, sea: { coastal: !isLandlocked(target), capacity: cap, ok: !isLandlocked(target) && cap > 0 }, air: { transit: tr, missing: tr.filter(id => !permitOk(w, id, "air")) } };
}

/* ---------- war ---------- */
const warOf = (w, id) => w.wars.find(x => x.enemy === id && x.status === "active");
const activeWars = w => w.wars.filter(x => x.status === "active");
function declareWar(w, id) {
  const P = w.playerCountry, n = w.countries.find(x => x.id === id); if (!n) return fail("msg.unknown"); if (warOf(w, id) || w.wars.some(x => x.enemy === id && x.status === "won")) return fail("msg.mil.atWar");
  if (!w.sandbox && activeWars(w).length >= 2) return fail("msg.mil.tooMany");
  const justified = n.relation <= -40 || P.trade.embargo.includes(id);
  const war = { id: Math.random().toString(36).slice(2, 8), enemy: id, initiator: "player", start: w.turn, progress: 0, enemyProgress: 0, commit: 0, mode: "land", seaControl: 0, status: "active", justified, report: [], cas: { mine: 0, theirs: 0 } };
  w.wars.push(war); P.trade.embargo = [...new Set([...P.trade.embargo, id])]; P.trade.pacts = P.trade.pacts.filter(x => x !== id); n.relation = -90; n.baseRel = Math.min(n.baseRel, -40);
  for (const o of w.countries) { if (o.id === id) continue; if (!justified) o.relation = clamp(o.relation - 8, -100, 100); if (o.bloc !== "neutral" && o.bloc === n.bloc) o.relation = clamp(o.relation - (justified ? 6 : 20), -100, 100); }
  P.publicSatisfaction = clamp(P.publicSatisfaction - (justified ? 0 : 2)); E.log(w, "log.mil.declare", { cid: id }); return { ok: true, key: "msg.mil.declared", p: { cid: id }, war };
}
function setStance(w, warId, commit, mode, force) {
  const war = w.wars.find(x => x.id === warId && x.status === "active"); if (!war) return fail("msg.mil.noWar"); const P = w.playerCountry; commit = clamp(Math.round(commit), 0, 100);
  if (commit > 0) {
    const r = route(w, war.enemy);
    if (mode === "land") { if (!r.land) return fail("msg.mil.noLandRoute"); if (r.land.missing.length) { if (!force) return fail("msg.mil.noPassage", { list: r.land.missing.map(id => id) }); violate(w, r.land.missing, "land"); war.forced = true; } else war.forced = false; }
    else { if (!r.sea.coastal) return fail("msg.mil.landlocked"); if (r.sea.capacity <= 0) return fail("msg.mil.noTransports"); }
  }
  war.commit = commit; war.mode = mode; E.log(w, "log.mil.stance", { cid: war.enemy, v: commit }); return { ok: true, key: "msg.mil.stance" };
}
function fireMissiles(w, enemyId, type, salvos, cat, force) {
  const P = w.playerCountry, war = warOf(w, enemyId), n = w.countries.find(x => x.id === enemyId), s = MS[type]; if (!war || !n) return fail("msg.mil.noWar");
  salvos = Math.round(salvos); if (salvos <= 0 || (P.mil.missiles[type] || 0) < salvos) return fail("msg.mil.noMissiles");
  const r = route(w, enemyId); if (!w.sandbox && r.km - 300 > s.range) return fail("msg.mil.outOfRange", { km: Math.round(r.km), rng: s.range });
  if (r.air.missing.length) { if (!force) return fail("msg.mil.noAirspace", { list: r.air.missing }); violate(w, r.air.missing, "air"); }
  const ad = effAd(n), p = s.acc * (1 - .6 * ad / 100 * s.ic), hits = salvos * p, dmg = hits * 14 * s.dmg / M.targets[cat] * (.8 + rnd(w) * .4);
  P.mil.missiles[type] -= salvos; n.mil.tg[cat] = Math.max(0, n.mil.tg[cat] - dmg); n.stability = clamp(n.stability - .25 * hits, 5, 98);
  if (cat === "power" || cat === "industry") n.gdp = Math.max(1e9, n.gdp * (1 - .0006 * dmg));
  war.report.unshift({ turn: w.turn, k: "strike", mt: type, n: salvos, hits: +hits.toFixed(1), cat, tg: Math.round(n.mil.tg[cat]) }); war.report.length = Math.min(war.report.length, 12);
  E.log(w, "log.mil.missile", { n: salvos, un: "ms." + type, cid: enemyId, tg: cat, hits: +hits.toFixed(1) });
  return { ok: true, key: "msg.mil.strikeDone", p: { hits: +hits.toFixed(1), n: salvos, tg: cat, v: Math.round(n.mil.tg[cat]) }, fx: { from: nearestOwn(w, enemyId), to: enemyId, n: Math.min(5, Math.ceil(salvos / 3)) } };
}
const nearestOwn = (w, id) => own(w).reduce((b, o) => E.dist(o, id) < E.dist(b, id) ? o : b, own(w)[0]);
function airStrike(w, enemyId, kind, squads, cat, force) {
  const P = w.playerCountry, war = warOf(w, enemyId), n = w.countries.find(x => x.id === enemyId), u = U[kind], have = P.mil.units[kind]; if (!war || !n) return fail("msg.mil.noWar");
  squads = Math.round(squads); if (squads <= 0 || have < squads) return fail("msg.mil.noUnits");
  if (kind === "fighter" && cat !== "airforce") return fail("msg.mil.fighterOnly"); if (kind !== "fighter" && cat === "airforce") return fail("msg.mil.fighterOnly2");
  const reach = 2500 + (P.mil.units.carrier > 0 ? 1500 : 0), r = route(w, enemyId); if (!w.sandbox && r.km - 300 > reach) return fail("msg.mil.outOfRange", { km: Math.round(r.km), rng: reach });
  if (r.air.missing.length) { if (!force) return fail("msg.mil.noAirspace", { list: r.air.missing }); violate(w, r.air.missing, "air"); }
  const qm = q(P.technology), qe = q(n.technology), ad = effAd(n), stealth = hasTech(P, "stealth") ? .5 : 1; let loss, effect = 0;
  if (kind === "fighter") { const ratio = qm / qe; effect = Math.min(n.mil.air * .25, squads * .8 * ratio); n.mil.air = Math.max(0, n.mil.air - effect); loss = squads * (.04 + .1 * Math.min(1, effAir(n) / (squads * 3 + 1))) * stealth; }
  else {
    loss = squads * (.03 + .14 * ad / 100) * stealth * (kind === "drone" ? 2.2 : 1); const pow = squads * u.strike * (1 - .5 * ad / 100) * (.8 + rnd(w) * .4);
    if (cat === "army") { effect = Math.min(n.mil.army * .1, pow * .25); n.mil.army = Math.max(0, n.mil.army - effect); }
    else { effect = pow * 6 / M.targets[cat]; n.mil.tg[cat] = Math.max(0, n.mil.tg[cat] - effect); if (cat === "power" || cat === "industry") n.gdp = Math.max(1e9, n.gdp * (1 - .0006 * effect)); }
  }
  loss = Math.min(have, loss); P.mil.units[kind] = Math.max(0, have - loss); war.report.unshift({ turn: w.turn, k: "air", un: kind, n: squads, cat, v: +effect.toFixed(1), lost: +loss.toFixed(1) }); war.report.length = Math.min(war.report.length, 12);
  E.log(w, "log.mil.air", { n: squads, un: "un." + kind, cid: enemyId, tg: cat, lost: +loss.toFixed(1) });
  return { ok: true, key: "msg.mil.airDone", p: { n: squads, tg: cat, lost: +loss.toFixed(1) }, fx: { from: nearestOwn(w, enemyId), to: enemyId, n: 2 } };
}
function airSup(P, n) { const u = P.mil.units, mine = (u.fighter + u.bomber * .2 + u.drone * .15) * q(P.technology), theirs = effAir(n) * q(n.technology) + effAd(n) * .05; return clamp((mine - theirs) / (mine + theirs + 1e-6), -1, 1); }
function ceasefire(w, warId) {
  const war = w.wars.find(x => x.id === warId && x.status === "active"); if (!war) return fail("msg.mil.noWar"); const n = w.countries.find(x => x.id === war.enemy), months = w.turn - war.start;
  const score = n.mil.weary + war.progress * .5 + months * 3 - (war.enemyProgress > 50 ? 30 : 0); if (score < 30 && !w.sandbox) return fail("msg.mil.refused");
  war.status = "ceasefire"; war.commit = 0; w.playerCountry.mil.weary = Math.max(0, w.playerCountry.mil.weary - 10); n.relation = clamp(n.relation + 20, -100, 100); E.log(w, "log.mil.ceasefire", { cid: war.enemy }); return { ok: true, key: "msg.mil.ceasefire" };
}
function annex(w, id) {
  const P = w.playerCountry, i = w.countries.findIndex(x => x.id === id); if (i < 0) return; const n = w.countries[i], f = .65;
  P.pop = P.population = P.pop + n.pop * .9; P.gdp += n.gdp * f; P.gdp0 += n.gdp0 * f; P.treasury += n.treasury * .25; P.growth = (P.growth * P.gdp + n.growth * n.gdp * f) / (P.gdp + n.gdp * f);
  for (const c of E.CIDS) { P.prod0[c] += n.prod0[c] * f; P.cons0[c] += n.cons0[c] * f; P.stock[c] = (P.stock[c] || 0) + 0; }
  P.mil.units.infantry += n.mil.army * .15; P.territories.push(id); w.countries.splice(i, 1);
  P.trade.pacts = P.trade.pacts.filter(x => x !== id); P.trade.embargo = P.trade.embargo.filter(x => x !== id); delete P.mil.permits.air[id]; delete P.mil.permits.land[id]; P.occ[id] = { unrest: 60, since: w.turn };
  for (const o of w.countries) o.relation = clamp(o.relation - (o.bloc !== "neutral" && o.bloc === n.bloc ? 20 : 12), -100, 100);
  for (const x of w.wars) if (x.enemy === id) x.status = "ended";
}
function settle(w, warId, kind) {
  const war = w.wars.find(x => x.id === warId && x.status === "won"); if (!war) return fail("msg.mil.noWar"); const P = w.playerCountry, n = w.countries.find(x => x.id === war.enemy); if (!n) return fail("msg.unknown");
  if (kind === "annex") { annex(w, war.enemy); }
  else if (kind === "puppet") { n.bloc = P.bloc; n.relation = 85; n.baseRel = 70; n.stability = clamp(n.stability - 10, 5, 98); P.trade.pacts = [...new Set([...P.trade.pacts, n.id])]; P.trade.embargo = P.trade.embargo.filter(x => x !== n.id); n.mil.army *= .6; war.status = "ended"; }
  else if (kind === "reparations") { const sum = n.gdp * .12; P.treasury += sum; n.gdp *= .92; n.relation = -50; n.baseRel = Math.min(n.baseRel, -30); P.trade.embargo = P.trade.embargo.filter(x => x !== n.id); war.status = "ended"; }
  else return fail("msg.unknown");
  P.mil.weary = Math.max(0, P.mil.weary - 25); P.publicSatisfaction = clamp(P.publicSatisfaction + (kind === "annex" ? 2 : 4)); E.log(w, "log.mil.settle", { cid: war.enemy, sk: kind }); return { ok: true, key: "msg.mil.settled", p: { cid: war.enemy } };
}

/* ---------- monthly simulation ---------- */
function note(w, key, p, err) { w.turnNotes.push({ key, p, err: !!err }); }
function groundStep(w, war, n) {
  const P = w.playerCountry, m = P.mil, u = m.units, e = n.mil; if (war.commit <= 0) return;
  if (war.mode === "land") { const r = landRoute(w, war.enemy); if (!r) { war.commit = 0; note(w, "msg.mil.stanceLost", {}, true); return; } const miss = r.transit.filter(id => !permitOk(w, id, "land")); if (miss.length && !war.forced) { war.commit = 0; note(w, "msg.mil.stanceLost", {}, true); return; } }
  const frac = war.commit / 100; let inf = u.infantry * frac, arm = u.armor * frac, art = u.artillery * frac;
  if (war.mode === "sea") { const cap = seaCapacity(P), need = inf + arm + art * .5, k = need > cap ? cap / Math.max(1e-9, need) : 1; inf *= k; arm *= k; art *= k;
    const mine = (u.corvette * U.corvette.naval + u.destroyer * U.destroyer.naval + u.submarine * U.submarine.naval + u.carrier * U.carrier.naval) * q(P.technology), theirs = effNavy(n) * q(n.technology) + .01;
    war.seaControl = clamp(war.seaControl + (mine / (mine + theirs) - .5) * 40, 0, 100); const lossN = Math.min(1, theirs / (mine + theirs)) * .04; for (const k2 of ["corvette", "destroyer", "submarine"]) u[k2] *= 1 - lossN; e.navy *= 1 - (mine / (mine + theirs)) * .06; }
  const sup = airSup(P, n), qm = q(P.technology), qe = q(n.technology);
  let Pa = (inf * U.infantry.att + arm * U.armor.att + art * U.artillery.att) * qm * (m.ready / 100) * (1 + .25 * sup); if (war.mode === "sea") Pa *= .7 * (.4 + .6 * war.seaControl / 100);
  const Pd = effArmy(n) * qe * 1.25 * (M.terrain[n.id] || 1) * (effReady(n) / 100) * (1 + e.mobil) * (1 - .12 * sup) + .01;
  const r = Pa / (Pa + Pd), size = clamp(Math.sqrt(n.pop / 20e6), .6, 3); let d = (r - .45) * 70 / size; if (e.army < e.base.army * .15) d *= 1.4;
  war.progress = clamp(war.progress + d, 0, 100); const la = (.03 + .08 * (1 - r)) * (r < .45 ? 1.3 : 1), ld = .03 + .08 * r;
  const mineK = (inf * 10 + arm * 4 + art * 2) * la, theirK = e.army * 10 * ld;
  u.infantry -= inf * la; u.armor -= arm * la; u.artillery -= art * la; e.army = Math.max(0, e.army * (1 - ld)); e.mobil = Math.min(.6, e.mobil + .04);
  war.cas.mine += mineK; war.cas.theirs += theirK; m.weary = clamp(m.weary + .6 + mineK / (men(P) + 1) * 30, 0, 100); e.weary = clamp(e.weary + 1.2 + theirK / (e.army * 10 + 1) * 40 + war.progress * .02, 0, 100);
  n.stability = clamp(n.stability - .6, 5, 98); n.gdp = Math.max(1e9, n.gdp * (1 - .002 * (war.progress / 50 + 1)));
  war.report.unshift({ turn: w.turn, k: "ground", r: +r.toFixed(2), d: +d.toFixed(1), mine: +mineK.toFixed(0), theirs: +theirK.toFixed(0) }); war.report.length = Math.min(war.report.length, 12);
  if (war.progress >= 100) { war.status = "won"; war.commit = 0; P.publicSatisfaction = clamp(P.publicSatisfaction + 3); E.log(w, "log.mil.won", { cid: war.enemy }); note(w, "msg.mil.won", { cid: war.enemy }); }
}
function enemyOffense(w, war, n) {
  const P = w.playerCountry, u = P.mil.units, e = n.mil, set = new Set(own(w)); const landAdj = nbrs(n.id).some(x => set.has(x)), seaOk = !isLandlocked(n.id) && e.navy > 3;
  if (!landAdj && !seaOk) { war.enemyProgress = Math.max(0, war.enemyProgress - 2); return; }
  const months = w.turn - war.start, qm = q(P.technology), qe = q(n.technology), intens = war.initiator === "ai" ? .45 : .22;
  const Pe = effArmy(n) * qe * (effReady(n) / 100) * intens * (landAdj ? 1 : .55) * (1 - .1 * airSup(P, n));
  const Pd = (u.infantry * U.infantry.def + u.armor * U.armor.def + u.artillery * U.artillery.def) * qm * (P.mil.ready / 100) * 1.25 * (1 + fortOf(P)) * (M.terrain[P.id] || 1) * (1 + Math.min(.5, months * .03)) + .01;
  const r = Pe / (Pe + Pd), size = clamp(Math.sqrt(P.pop / 20e6), .6, 3), d = (r - .5) * 45 / size; war.enemyProgress = clamp(war.enemyProgress + d, 0, 100);
  const lm = (.02 + .06 * r), le = .02 + .06 * (1 - r); u.infantry *= 1 - lm; u.armor *= 1 - lm; u.artillery *= 1 - lm; e.army *= 1 - le; P.mil.weary = clamp(P.mil.weary + .4, 0, 100);
  war.report.unshift({ turn: w.turn, k: "defense", r: +r.toFixed(2), d: +d.toFixed(1) }); war.report.length = Math.min(war.report.length, 12);
  if (war.enemyProgress >= 100) { war.status = "lost"; P.gdp *= .85; P.treasury *= .6; P.stability = clamp(P.stability - 15); P.publicSatisfaction = clamp(P.publicSatisfaction - 10); P.mil.weary = Math.max(0, P.mil.weary - 30); n.relation = clamp(n.relation + 10, -100, 100); E.log(w, "log.mil.lost", { cid: n.id }); note(w, "msg.mil.lost", { cid: n.id }, true); }
}
function enemyStrikes(w, war, n) {
  const P = w.playerCountry, e = n.mil, mt = bestMissile(e.techs); if (!mt || e.missiles < 1) return; const s = MS[mt]; if (Math.min(...own(w).map(o => E.dist(n.id, o))) - 300 > s.range) return;
  const salvos = Math.min(e.missiles, Math.max(1, Math.ceil(e.base.missiles * .07))), ad = adOf(P), hits = salvos * s.acc * (1 - .6 * ad / 100 * s.ic); e.missiles -= salvos;
  let whole = Math.floor(hits) + (rnd(w) < hits % 1 ? 1 : 0), lost = 0;
  for (let i = 0; i < whole; i++) {
    if (P.buildings.length && rnd(w) < .4) { const wt = P.buildings.map(b => ({ power: 3, factory: 2.5, port: 2 }[b.type] || 1)), tot = wt.reduce((a, b) => a + b, 0); let x = rnd(w) * tot, k = 0; while (k < wt.length - 1 && x > wt[k]) { x -= wt[k]; k++; } const b = P.buildings.splice(k, 1)[0]; lost++; E.log(w, "log.mil.buildingLost", { b: b.type }); note(w, "msg.mil.buildingLost", { b: b.type }, true); }
    else P.infrastructure = clamp(P.infrastructure - .8);
  }
  P.publicSatisfaction = clamp(P.publicSatisfaction - .4 * hits); P.mil.ready = clamp(P.mil.ready - 1.5 * hits);
  war.report.unshift({ turn: w.turn, k: "incoming", n: salvos, hits: +hits.toFixed(1), lost }); war.report.length = Math.min(war.report.length, 12);
  if (hits > .2) note(w, "msg.mil.incoming", { n: salvos, hits: +hits.toFixed(1) }, true);
}
function step(w) {
  ensure(w); const P = w.playerCountry, m = P.mil; w.turnNotes = [];
  /* production queue + research */
  for (const o of m.queue) { o.remaining--; if (o.remaining <= 0) { if (o.kind === "missile") m.missiles[o.type] = (m.missiles[o.type] || 0) + o.qty; else m.units[o.type] = (m.units[o.type] || 0) + o.qty; E.log(w, "log.mil.done", { qty: o.qty, un: (o.kind === "missile" ? "ms." : "un.") + o.type }); note(w, "msg.mil.delivered", { qty: o.qty, un: (o.kind === "missile" ? "ms." : "un.") + o.type }); } }
  m.queue = m.queue.filter(o => o.remaining > 0);
  if (m.research.active) { const a = m.research.active; a.remaining--; m.research.progress = (a.months - a.remaining) / a.months * 100; if (a.remaining <= 0) { m.techs.push(a.key); E.log(w, "log.mil.techDone", { mt: a.key }); note(w, "msg.mil.techDone", { mt: a.key }); m.research.active = null; m.research.progress = 0; } }
  /* readiness, weariness */
  const wars = activeWars(w); m.ready = clamp(m.ready + (clamp(35 + P.policies.defense * 6 - (m.weary > 50 ? 10 : 0), 20, 95) - m.ready) * .1);
  if (!wars.length) m.weary = Math.max(0, m.weary - 2);
  /* AI regeneration */
  const atWar = id => wars.some(x => x.enemy === id);
  for (const n of w.countries) { const e = n.mil, k = atWar(n.id) ? .015 : .04; e.army += (e.base.army - e.army) * k; e.air += (e.base.air - e.air) * k; e.navy += (e.base.navy - e.navy) * k; e.missiles = Math.min(e.base.missiles * 1.1, e.missiles + e.base.missiles * (atWar(n.id) ? .01 : .02)); e.mobil = atWar(n.id) ? e.mobil : Math.max(0, e.mobil - .05); e.ready = clamp(e.ready + (clamp(55 + n.stability * .3, 40, 90) - e.ready) * .05, 20, 95); e.weary = atWar(n.id) ? e.weary : Math.max(0, e.weary - 2); for (const t of TGK) e.tg[t] = Math.min(100, e.tg[t] + (atWar(n.id) ? 1 : 3)); }
  /* wars */
  for (const war of wars) {
    const n = w.countries.find(x => x.id === war.enemy); if (!n) { war.status = "ended"; continue; }
    groundStep(w, war, n); if (war.status === "active") { enemyOffense(w, war, n); } if (war.status === "active") enemyStrikes(w, war, n);
    P.gdp = Math.max(5e9, P.gdp * .9985); P.inflation = clamp(P.inflation + .08, 0, 60); P.publicSatisfaction = clamp(P.publicSatisfaction - (.08 + m.weary / 200));
    if (m.weary > 60) P.stability = clamp(P.stability - .25);
  }
  /* occupation unrest */
  const occ = Object.keys(P.occ); if (occ.length) { const garrison = m.units.infantry / (occ.length + 1) * .08; for (const id of occ) { const o = P.occ[id]; o.unrest = Math.max(0, o.unrest - (1.2 + garrison)); P.publicSatisfaction = clamp(P.publicSatisfaction - o.unrest / 100 * .5); if (o.unrest <= 0) delete P.occ[id]; } }
  /* AI aggression */
  if (wars.length < 2 && w.turn > 6) for (const n of w.countries) {
    if (n.relation > -65 || rnd(w) > .025 || atWar(n.id)) continue; const set = new Set(own(w)), adjc = nbrs(n.id).some(x => set.has(x)), sea = !isLandlocked(n.id) && n.mil.navy > 3; if (!adjc && !sea) continue; if (milOf(w, n.id).power < milOf(w, P.id).power * .7) continue;
    const war = { id: Math.random().toString(36).slice(2, 8), enemy: n.id, initiator: "ai", start: w.turn, progress: 0, enemyProgress: 0, commit: 0, mode: "land", seaControl: 0, status: "active", justified: true, report: [], cas: { mine: 0, theirs: 0 } }; w.wars.push(war);
    P.trade.embargo = [...new Set([...P.trade.embargo, n.id])]; E.log(w, "log.mil.aiDeclare", { cid: n.id }); note(w, "msg.mil.aiDeclare", { cid: n.id }, true); break;
  }
  w.wars = w.wars.filter(x => x.status === "active" || x.status === "won" || w.turn - (x.end || (x.end = w.turn)) < 24);
}
/* sandbox tools */
function sandboxWin(w) { let n = 0; for (const war of activeWars(w)) { war.progress = 100; war.status = "won"; war.commit = 0; E.log(w, "log.mil.won", { cid: war.enemy }); n++; } return n; }
function sandboxArm(w) { const P = w.playerCountry; for (const k of Object.keys(U)) P.mil.units[k] = (P.mil.units[k] || 0) + (U[k].cat === "land" ? 300 : U[k].cat === "air" ? 80 : U[k].cat === "sea" ? 40 : 30); for (const k of Object.keys(MS)) P.mil.missiles[k] = (P.mil.missiles[k] || 0) + 100; }
function sandboxHeal(w) { for (const n of w.countries) { n.mil.army = n.mil.base.army; n.mil.air = n.mil.base.air; n.mil.navy = n.mil.base.navy; n.mil.missiles = n.mil.base.missiles; for (const k of TGK) n.mil.tg[k] = 100; n.mil.weary = 0; } }
/* player nation destroyed buildings etc. are already applied; helper for UI */
const status = w => ({ wars: activeWars(w), pending: w.wars.filter(x => x.status === "won") });
window.WOE_MIL = { sandboxWin, sandboxArm, sandboxHeal, init, ensure, step, upkeep, milOf, ranking, rating, orderUnit, startTech, route, requestPermit, permitOk, declareWar, setStance, fireMissiles, airStrike, ceasefire, settle, warOf, activeWars, status, men, manCap, hasTech, adOf, seaCapacity, bestMissile, nbrs, isLandlocked, airTransit, landRoute, aiMil, playerMil };
})();
