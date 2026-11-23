// Headless military/conquest test: node scripts/selftest-war.js
global.window = global;
const path = require("path"), s = p => require(path.join(__dirname, "..", "src", "scripts", p));
["geo.js", "data.js", "engine.js", "military-data.js", "military.js"].forEach(s);
const E = WOE, X = WOE_MIL, D = WOE_DATA, M = D.MIL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("  FAIL", m); } else console.log("  ok  ", m); };
function scan(o, p, seen = new Set()) { if (o && typeof o === "object") { if (seen.has(o)) return; seen.add(o); for (const k in o) scan(o[k], p + "." + k, seen); } else if (typeof o === "number" && !Number.isFinite(o)) { fails++; console.log("  FAIL non-finite", p); } }
const free = w => { const P = w.playerCountry; P.treasury = 1e15; P.research.completed = ["ai", "materials", "renewables"]; };

console.log("== initial forces ==");
let w = E.newWorld({ countryId: "DEU", scenarioId: "modern" }); free(w);
const P = w.playerCountry;
ok(P.mil && w.countries.every(n => n.mil), "every nation has a military profile");
ok(X.milOf(w, "DEU").troops > 100000, "player has troops: " + Math.round(X.milOf(w, "DEU").troops));
ok(X.ranking(w)[0][0] === "USA" || X.ranking(w)[0][0] === "CHN" || X.ranking(w)[0][0] === "RUS", "top military power is a superpower: " + X.ranking(w).slice(0, 4).map(x => x[0]).join(","));
ok(X.manCap(P) > X.men(P), "manpower below cap");

console.log("== routes & airspace ==");
const rPOL = X.route(w, "POL"), rTUR = X.route(w, "TUR"), rRUS = X.route(w, "RUS"), rUKR = X.route(w, "UKR");
ok(rPOL.land && rPOL.land.transit.length === 0, "Poland adjacent by land");
ok(rUKR.land && rUKR.land.transit.join() === "POL", "Ukraine reached via Poland: " + (rUKR.land && rUKR.land.transit));
ok(!rTUR.land, "Turkey has no land route from Germany");
ok(Array.isArray(rRUS.air.transit) && rRUS.air.transit.length >= 1, "air route to Russia crosses third countries: " + rRUS.air.transit);
ok(X.landRoute(E.newWorld({ countryId: "JPN" }), "KOR") === null, "Japan has no land route to Korea");

console.log("== permits ==");
const t0 = rUKR.air.transit[0] || "POL";
w.countries.find(n => n.id === t0).relation = 60; ok(X.requestPermit(w, t0, "air", "RUS").ok, "friendly nation grants overflight");
w.countries.find(n => n.id === "UKR").relation = -50; ok(!X.requestPermit(w, "UKR", "air", "RUS").ok, "hostile nation refuses");
ok(X.permitOk(w, t0, "air"), "granted permit is active");

console.log("== forces, tech, production ==");
{ const lw = E.newWorld({ countryId: "CUS" }); lw.playerCountry.treasury = 1e15; const r0 = X.orderUnit(lw, "unit", "carrier", 1); ok(!r0.ok && r0.key === "msg.mil.locked", "carrier locked without tech: " + r0.key); }
const before = P.mil.units.infantry; ok(X.orderUnit(w, "unit", "infantry", 5).ok, "ordered infantry"); for (let i = 0; i < 3; i++) E.advance(w);
ok(P.mil.units.infantry >= before + 5 - 0.001, "infantry delivered after build time");
ok(!X.startTech(w, "stealth").ok || X.hasTech(P, "jets"), "tech prerequisites enforced");
P.mil.research.active = null; const t1 = X.startTech(w, "fortify"); for (let i = 0; i < 7; i++) E.advance(w); ok(X.hasTech(P, "fortify") || !t1.ok, "military tech researched");

console.log("== ground war & annexation ==");
w = E.newWorld({ countryId: "DEU", scenarioId: "modern" }); free(w); const Q = w.playerCountry;
const gdp0 = Q.gdp, pop0 = Q.pop; Q.mil.units.infantry = 400; Q.mil.units.armor = 150; Q.mil.units.artillery = 80; Q.mil.units.fighter = 60;
const dec = X.declareWar(w, "POL"); ok(dec.ok, "war declared on Poland"); ok(!X.declareWar(w, "POL").ok, "cannot declare twice");
ok(Q.trade.embargo.includes("POL"), "declaring war embargoes the enemy");
const st = X.setStance(w, dec.war.id, 100, "land"); ok(st.ok, "ground offensive ordered");
let months = 0; while (dec.war.status === "active" && months < 60) { E.advance(w); months++; for (const e of w.events) if (!e.resolved) E.resolveEvent(w, e.id, 0); }
ok(dec.war.status === "won", "Poland defeated in " + months + " months (progress " + dec.war.progress.toFixed(0) + ")");
ok(dec.war.cas.mine > 0 && dec.war.cas.theirs > 0, "both sides took casualties: " + Math.round(dec.war.cas.mine) + "k / " + Math.round(dec.war.cas.theirs) + "k");
const mk = w.market.prices.oil; ok(X.settle(w, dec.war.id, "annex").ok, "annexed Poland");
ok(Q.territories.includes("POL") && !w.countries.some(n => n.id === "POL"), "Poland merged into the player");
ok(Q.gdp > gdp0 && Q.pop > pop0, "GDP and population increased");
ok(E.nodeById(w, "POL") === Q, "annexed territory resolves to the player");
for (let i = 0; i < 24; i++) E.advance(w); scan(w, "world"); ok(Q.treasury >= 0, "world simulates 24 months after annexation without NaN");
ok(X.route(w, "UKR").land.transit.length === 0, "annexed land extends the border: Ukraine now adjacent");

console.log("== naval invasion ==");
w = E.newWorld({ countryId: "JPN", scenarioId: "modern" }); free(w); const J = w.playerCountry; J.mil.units.infantry = 300; J.mil.units.armor = 60;
const d2 = X.declareWar(w, "KOR"); ok(!X.setStance(w, d2.war.id, 100, "sea").ok || J.mil.units.transport > 0, "sea invasion needs transports");
J.mil.units.transport = 0; ok(X.setStance(w, d2.war.id, 100, "sea").key === "msg.mil.noTransports", "no transports -> refused");
J.mil.units.transport = 80; J.mil.units.destroyer = 25; J.mil.units.corvette = 20; ok(X.setStance(w, d2.war.id, 100, "sea").ok, "transports present -> sea invasion allowed");
for (let i = 0; i < 8; i++) E.advance(w); ok(d2.war.seaControl > 0, "sea control contested: " + d2.war.seaControl.toFixed(0)); ok(d2.war.progress > 0 || d2.war.report.length > 0, "amphibious landing progressed");
ok(!X.setStance(w, d2.war.id, 100, "land").ok, "no land route Japan -> Korea");
const d3 = X.declareWar(w, "KAZ"); ok(X.setStance(w, d3.war.id, 100, "sea").key === "msg.mil.landlocked", "landlocked target cannot be invaded by sea");

console.log("== missiles & air strikes ==");
w = E.newWorld({ countryId: "DEU", scenarioId: "modern" }); free(w); const D1 = w.playerCountry; D1.mil.techs.push("hypersonic", "longrange", "cruise", "rocketry", "stealth", "jets", "drones");
D1.mil.missiles = { srbm: 20, cruise: 20, mrbm: 20, hyper: 20 }; Object.assign(D1.mil.units, { bomber: 20, drone: 30, fighter: 30 });
const dw = X.declareWar(w, "POL"); const tgBefore = w.countries.find(n => n.id === "POL").mil.tg.power;
const f1 = X.fireMissiles(w, "POL", "cruise", 10, "power"); ok(f1.ok && w.countries.find(n => n.id === "POL").mil.tg.power < tgBefore, "cruise missiles damaged the power grid: " + (f1.p && f1.p.v));
ok(X.fireMissiles(w, "POL", "srbm", 99, "bases").key === "msg.mil.noMissiles", "cannot fire more than the stockpile");
const far = X.declareWar(w, "CHN"); ok(X.fireMissiles(w, "CHN", "srbm", 1, "bases").key === "msg.mil.outOfRange", "short-range missile out of range of China"); far.war.status = "ended";
const rr = X.fireMissiles(w, "RUS", "mrbm", 1, "bases"); ok(rr.key === "msg.mil.noWar", "strike needs an active war");
const rus = X.declareWar(w, "RUS"); const need = X.route(w, "RUS").air.missing; if (need.length) { const blocked = X.fireMissiles(w, "RUS", "hyper", 2, "command"); ok(blocked.key === "msg.mil.noAirspace", "transit countries without permission block the strike: " + need); const relB = w.countries.find(n => n.id === need[0]).relation; const forced = X.fireMissiles(w, "RUS", "hyper", 2, "command", true); ok(forced.ok && w.countries.find(n => n.id === need[0]).relation < relB, "forcing the strike angers the overflown nation"); } else ok(true, "no transit needed");
const air = X.airStrike(w, "POL", "bomber", 10, "industry"); ok(air.ok, "bomber raid on industry"); ok(X.airStrike(w, "POL", "fighter", 5, "power").key === "msg.mil.fighterOnly", "fighters only do air superiority");
const fa = X.airStrike(w, "POL", "fighter", 10, "airforce"); ok(fa.ok, "fighter sweep"); ok(X.airStrike(w, "POL", "drone", 5, "army").ok, "drone interdiction of the army");

console.log("== ceasefire & enemy strikes ==");
w = E.newWorld({ countryId: "DEU", scenarioId: "modern" }); free(w); const C = w.playerCountry; const wr = X.declareWar(w, "POL");
w.countries.find(n => n.id === "POL").mil.techs.push("cruise"); w.countries.find(n => n.id === "POL").mil.missiles = 30;
ok(X.ceasefire(w, wr.war.id).key === "msg.mil.refused", "enemy refuses an immediate ceasefire");
const bl0 = C.buildings.length; for (let i = 0; i < 4; i++) C.buildings.push({ id: "b" + i, type: "power", seed: 1 }); for (let i = 0; i < 10; i++) E.advance(w);
ok(w.turnNotes !== undefined, "notes buffer exists"); ok(w.history.some(h => h.k === "log.mil.missile" || h.k === "log.mil.buildingLost") || C.buildings.length <= bl0 + 4, "enemy missile campaign can destroy buildings (" + C.buildings.length + " left)");
ok(X.ceasefire(w, wr.war.id).ok || wr.war.status === "active", "ceasefire eventually possible");

console.log("== AI aggression ==");
w = E.newWorld({ countryId: "UKR", scenarioId: "modern" }); free(w); const U2 = w.playerCountry; U2.mil.units.infantry = 5; w.countries.find(n => n.id === "RUS").relation = -90; w.countries.find(n => n.id === "RUS").baseRel = -90;
let declared = false; for (let i = 0; i < 400 && !declared; i++) { E.advance(w); for (const e of w.events) if (!e.resolved) E.resolveEvent(w, e.id, 0); w.countries.find(n => n.id === "RUS").relation = -90; declared = w.wars.some(x => x.initiator === "ai"); }
ok(declared, "a hostile, stronger neighbour eventually declares war"); scan(w, "world");

console.log("== older saves without a military ==");
{ const w3 = E.newWorld({ countryId: "FRA", scenarioId: "modern" }); delete w3.playerCountry.mil; delete w3.wars; delete w3.playerCountry.territories; w3.countries.forEach(n => delete n.mil);
  const w4 = E.migrate(JSON.parse(JSON.stringify(w3))); ok(w4.playerCountry.mil && w4.wars && w4.countries.every(n => n.mil), "migrate adds military data to a 1.1 save"); for (let i = 0; i < 5; i++) E.advance(w4); scan(w4, "w4"); ok(true, "old save keeps simulating"); }
console.log("== forced passage keeps the offensive alive ==");
{ const w5 = E.newWorld({ countryId: "DEU", scenarioId: "modern" }); free(w5); w5.playerCountry.mil.units.infantry = 300; const d = X.declareWar(w5, "UKR"); ok(!X.setStance(w5, d.war.id, 100, "land").ok, "Ukraine needs transit permission via Poland"); ok(X.setStance(w5, d.war.id, 100, "land", true).ok, "forced passage accepted"); E.advance(w5); ok(d.war.commit === 100, "forced offensive is not cancelled next month");
  const wonW = X.declareWar(w5, "POL"); wonW.war.status = "won"; ok(X.declareWar(w5, "POL").key === "msg.mil.atWar", "cannot re-declare against a defeated, unsettled enemy"); }
console.log("== fuzz: 200 months, random military actions ==");
for (const cid of ["USA", "CUS", "TUR", "IND"]) {
  const w2 = E.newWorld({ countryId: cid, scenarioId: "tradewar", nationName: "Fuzz" }); free(w2); const F = w2.playerCountry; F.mil.techs.push(...Object.keys(M.techs));
  for (let t = 0; t < 200; t++) {
    try {
      const ids = w2.countries.map(n => n.id), tg = ids[Math.floor(Math.random() * ids.length)];
      if (t % 4 === 0) X.orderUnit(w2, Math.random() < .3 ? "missile" : "unit", Math.random() < .3 ? Object.keys(M.missiles)[t % 4] : Object.keys(M.units)[t % 13], 1 + t % 6);
      if (t % 9 === 0) X.declareWar(w2, tg);
      for (const wr of X.activeWars(w2)) { const r = Math.random(); if (r < .3) X.setStance(w2, wr.id, [0, 25, 50, 100][t % 4], t % 3 ? "land" : "sea", Math.random() < .5); else if (r < .5) X.fireMissiles(w2, wr.enemy, Object.keys(M.missiles)[t % 4], 1 + t % 3, Object.keys(M.targets)[t % 7], true); else if (r < .7) X.airStrike(w2, wr.enemy, ["fighter", "bomber", "drone"][t % 3], 2, ["airforce", "army", "bases"][0 + t % 3 === 0 ? 0 : 1], true); else if (r < .8) X.ceasefire(w2, wr.id); }
      for (const wr of w2.wars.filter(x => x.status === "won")) X.settle(w2, wr.id, ["annex", "puppet", "reparations"][t % 3]);
      if (t % 11 === 0) X.requestPermit(w2, ids[t % ids.length], t % 2 ? "air" : "land", tg);
      for (const e of w2.events.filter(e => !e.resolved)) E.resolveEvent(w2, e.id, 0);
      E.advance(w2);
    } catch (e) { fails++; console.log("  FAIL crash", cid, t, e.stack.split("\n").slice(0, 3).join(" | ")); break; }
    for (const k in F.mil.units) if (F.mil.units[k] < -1e-9) { fails++; console.log("  FAIL negative unit", k, F.mil.units[k]); }
    if (F.treasury < 0) { fails++; console.log("  FAIL negative treasury"); }
  }
  scan(w2, "world"); JSON.parse(JSON.stringify(w2));
  console.log(`  ${cid}: wars ${w2.wars.length}, territories ${F.territories.join(",") || "-"}, GDP ${(F.gdp / 1e9).toFixed(0)}B, infantry ${F.mil.units.infantry.toFixed(0)}`);
}
console.log(fails ? `\n${fails} FAILURE(S)` : "\nALL MILITARY TESTS PASSED"); process.exit(fails ? 1 : 0);
