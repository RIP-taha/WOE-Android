/* WORLD OF EMPIRES — management panels (open beside the permanent map) */
(() => {
"use strict";
const UI = window.UI, E = WOE, D = WOE_DATA, T = I18N, A = WOE_AUDIO, t = T.t, esc = UI.esc, P = UI.panels, M = UI.metric, B = UI.bar, R = UI.row;
const me = () => UI.w.playerCountry;
const sc = () => E.scale(UI.w);
const select = (opts, cur, attrs) => `<select ${attrs}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const price = (c, p) => { const d = p < 10 ? 2 : p < 1000 ? 1 : 0; return T.lang() === "fa" ? `${T.num(p, d)} ${t("cur")}` : `$${T.num(p, d)}`; };
const units = (c, v) => `${T.num(v, v < 10 ? 2 : v < 100 ? 1 : 0)} ${t("u." + c)}`;
const chg = (a, b) => b ? (a / b - 1) * 100 : 0;
const arrow = v => `<span class="${v > .05 ? "up" : v < -.05 ? "down" : "muted"}">${v > .05 ? "▲" : v < -.05 ? "▼" : "•"} ${T.num(Math.abs(v), 1)}%</span>`;
const desc = k => `<p class="desc">${t(k)}</p>`;
const card = (title, body, descKey) => `<div class="card">${title ? `<h3>${title}</h3>` : ""}${descKey ? desc(descKey) : ""}${body}</div>`;

/* ================= Overview ================= */
P.overview = () => {
  const w = UI.w, p = me(), open = w.events.filter(e => !e.resolved);
  const powers = [...E.allNodes(w).filter(n => n.id !== "ROW")].sort((a, b) => b.gdp - a.gdp).slice(0, 12);
  const rank = [...E.allNodes(w).filter(n => n.id !== "ROW")].sort((a, b) => b.gdp - a.gdp).findIndex(n => n.id === p.id) + 1;
  return `<div class="grid2">${M(t("top.gdp"), T.money(p.gdp), t("ov.rank", { n: rank }))}${M(t("top.treasury"), T.money(p.treasury), t("ov.debt", { d: T.money(p.debt) }))}${M(t("top.pop"), T.big(p.pop))}${M(t("top.approval"), T.pct(p.publicSatisfaction), t("ov.stab", { s: T.pct(p.stability) }))}</div>
  <div style="height:12px"></div>
  ${open.length ? `<div class="note">⚑ ${t("bar.pending", { n: open.length })} <button class="chip-btn gold" style="margin-inline-start:8px" data-act="tab" data-v="events">${t("ov.review")}</button></div>` : ""}
  ${card(t("ov.indicators"), B(t("ind.education"), p.education) + B(t("ind.health"), p.health) + B(t("ind.infrastructure"), p.infrastructure) + B(t("ind.technology"), p.technology, "blue") + B(t("ind.environment"), p.environment) + B(t("ind.defense"), p.defense, "gold") + B(t("ind.internet"), p.internet, "blue") + B(t("ind.foodSecurity"), p.foodSecurity))}
  ${card(t("ov.resources"), B(t("res.energy"), p.resources.energy) + B(t("res.freshwater"), p.resources.freshwater, "blue") + B(t("res.food"), p.resources.food) + B(t("res.rawMaterials"), p.resources.rawMaterials, "gold"), "ov.resDesc")}
  ${card(t("ov.powers"), `<div class="tablewrap"><table><thead><tr><th>#</th><th>${t("th.nation")}</th><th class="r">${t("cc.gdp")}</th><th class="r">${t("cc.stab")}</th></tr></thead><tbody>${powers.map((n, i) => `<tr class="click ${n.id === p.id ? "sel" : ""}" data-act="pickCountry" data-id="${n.id}"><td>${T.num(i + 1)}</td><td>${esc(T.cname(n.id))}</td><td class="r">${T.money(n.gdp)}</td><td class="r">${T.pct(n.stability)}</td></tr>`).join("")}</tbody></table></div>`, "ov.powersDesc")}`;
};

/* ================= Economy ================= */
const POL = { taxes: [5, 8, 12, 16, 20], subsidies: [0, 2, 4, 7, 10], investment: [0, 1, 2, 4, 6], defense: [1, 2, 4, 6, 9], environment: [0, 1, 2, 4, 6] };
P.economy = () => {
  const w = UI.w, p = me(), f = p.lastFinance, H = w.market.history;
  return `<div class="grid2">${M(t("ec.revenue"), T.money(f.revenue))}${M(t("ec.expenses"), T.money(f.expenses))}${M(t("ec.balance"), (f.balance >= 0 ? "+" : "") + T.money(f.balance), "", f.balance >= 0 ? "up" : "down")}${M(t("ec.interest"), T.money(f.interest), t("ec.tariffs", { v: T.money(f.tariffs) }))}</div><div style="height:12px"></div>
  ${card(t("ec.health"), R(t("ec.debt"), T.money(p.debt)) + R(t("ec.debtgdp"), T.pct(p.debt / p.gdp * 100)) + R(t("top.inflation"), T.pct(p.inflation, 1)) + R(t("ec.growth"), T.pct(p.growth, 1)) + `<div class="btn-row" style="margin-top:10px"><button data-act="repay">${t("ec.repay")}</button></div>`, "ec.healthDesc")}
  ${card(t("ec.policies"), Object.keys(POL).map(k => `<div class="row"><span>${t("pol." + k)}</span>${select(POL[k].map(v => [v, T.pct(v)]), p.policies[k], `data-chg="policy" data-k="${k}"`)}</div>`).join(""), "ec.policiesDesc")}
  ${H.length > 2 ? card(t("ec.trend"), `<p class="mini">${t("top.gdp")}</p>${UI.spark(H.map(x => x.gdp), H[0].gdp, "#e0b14f")}<p class="mini">${t("top.treasury")}</p>${UI.spark(H.map(x => x.treasury), H[0].treasury, "#46c2ae")}`) : ""}`;
};
UI.chg.policy = el => { if (E.setPolicy(UI.w, el.dataset.k, el.value)) { UI.toast(t("msg.policySet")); UI.render(); UI.saveSilently(); } };
UI.act.repay = () => { const r = E.repayDebt(UI.w); UI.say(r); UI.render(); UI.saveSilently(); };

/* ================= Construction ================= */
P.construction = () => {
  const w = UI.w, p = me(), cfg = E.getCfg(w), s = sc(), counts = {}; p.buildings.forEach(b => counts[b.type] = (counts[b.type] || 0) + 1);
  const list = cfg.buildingKeys().map(k => { const sp = cfg.buildingSpec(k), cost = sp.cost * 1e9 * s, can = p.treasury >= cost && p.resources.rawMaterials >= sp.materials;
    const nm = UI.bname(k), ds = D.buildings[k] ? t("bd." + k) : T.tx(cfg.newB[k].desc);
    return `<div class="build-card"><div class="glyph" style="color:${sp.color};border-color:${sp.color}">${esc(sp.icon)}</div><div><h4>${esc(nm)} ${counts[k] ? `<span class="tag gold">×${T.num(counts[k])}</span>` : ""}</h4><p>${esc(ds)}</p><p class="mini">${T.money(cost)} · ${t("cs.months", { n: sp.months })} · ${t("cs.materials", { n: sp.materials })}</p></div><button class="${can ? "primary" : "ghost"}" data-act="build" data-v="${k}" ${can ? "" : 'title="' + esc(t(p.treasury < cost ? "msg.noTreasury" : "msg.noMaterials")) + '"'}>${t("cs.build")}</button></div>`; }).join("");
  const q = p.construction.map(c => `<div class="row"><span>${esc(UI.bname(c.type))}</span><b>${t("cs.remaining", { n: c.remaining })}</b></div><div class="bar blue"><i style="width:${(1 - c.remaining / c.total) * 100}%"></i></div>`).join("");
  return `<div class="note">${t("cs.mapHint")} <button class="chip-btn gold" style="margin-top:6px" data-act="focusMine">${t("cs.showMap")}</button></div>${card(t("cs.queue"), q || `<p class="mini">${t("cs.noQueue")}</p>`)}${card(t("cs.catalog"), list, "cs.catalogDesc")}${card(t("cs.built"), `<p>${T.num(p.buildings.length)} ${t("cs.structures")}</p>`)}`;
};
UI.act.build = el => { const r = E.build(UI.w, el.dataset.v); UI.say(r); if (r.ok) { A.play("build"); UI.render(); UI.saveSilently(); const pid = me().id; if (UI.map && UI.map.v.k < UI.map.kMin * 2.2) UI.map.focus(pid, .3); window.WOE_BUS.emit("build"); } };
UI.act.focusMine = () => UI.map.focus(me().id, .3);
UI.act.pickCountry = el => { UI.selectCountry(el.dataset.id); UI.map.focus(el.dataset.id); };

/* ================= Global market ================= */
UI.spot = { pct: 10 };
P.market = () => {
  const w = UI.w, Mk = w.market, p = me(), c = UI.com, com = D.commodities[c], pr = Mk.prices[c], hist = Mk.hist[c] || [pr], lm = p.tradeLast, pl = Mk.pl[c], sd = Mk.sd[c];
  const tar = p.trade.tariffs[c] ?? p.trade.tariff, spotU = p.cons[c] * UI.spot.pct / 100, buyCost = spotU * pr * com.vm * 1e6 * (1 + tar / 100 + .03), sellRev = spotU * pr * com.vm * 1e6 * .97;
  const rows = E.CIDS.map(k => { const h = Mk.hist[k] || [], pp = Mk.prices[k], prev = h[h.length - 2] || pp; return `<div class="com-row ${k === c ? "sel" : ""}" data-act="com" data-v="${k}"><span class="ic" style="color:${D.commodities[k].color}">${D.commodities[k].icon}</span><span>${esc(t("c." + k))}</span><span class="num">${price(k, pp)}</span>${arrow(chg(pp, prev))}</div>`; }).join("");
  const prods = E.allNodes(w).map(n => [n.id, n.prod[c]]).sort((a, b) => b[1] - a[1]).slice(0, 5), cons = E.allNodes(w).map(n => [n.id, n.cons[c]]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const share = (arr, tot) => arr.map(([id, v]) => `<div class="row"><span>${esc(T.cname(id))}</span><b>${T.pct(v / tot * 100, 1)}</b></div>`).join("");
  const fl = Mk.pflows[c], flist = (arr, key) => arr.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, u]) => `<div class="row"><span>${esc(T.cname(id))}</span><b>${units(c, u)}</b></div>`).join("") || `<p class="mini">${t("mk.none")}</p>`;
  const shocks = Mk.shocks.filter(s => s.c === "all" || s.c === c);
  const cover = pl.cons ? p.stock[c] / pl.cons : 0;
  return `<div class="grid2">${M(t("mk.balance"), (lm.balance >= 0 ? "+" : "") + T.money(lm.balance), t("cc.tradebal"), lm.balance >= 0 ? "up" : "down")}${M(t("mk.tariffRev"), T.money(p.lastFinance.tariffs), t("mk.perMonth"))}${M(t("mk.exports"), T.money(lm.expVal))}${M(t("mk.imports"), T.money(lm.impVal))}</div>
  <div style="height:12px"></div>${card(t("mk.prices"), `<div class="coms">${rows}</div>`, "mk.pricesDesc")}
  <div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><h3 style="color:${com.color}">${com.icon} ${esc(t("c." + c))}</h3><b class="num" style="font-size:20px">${price(c, pr)}</b></div><p class="mini">${t("mk.vsBase", { v: T.num(chg(pr, com.base), 0) })} · ${t("mk.unitNote", { u: t("u." + c) })}</p>
  ${UI.spark(hist, com.base, com.color)}
  <div class="row"><span>${t("mk.worldSupply")}</span><b>${units(c, sd.S)}</b></div><div class="row"><span>${t("mk.worldDemand")}</span><b>${units(c, sd.D)}</b></div>${B(t("mk.coverage"), Math.min(100, sd.S / sd.D * 100), sd.S / sd.D < .97 ? "bad" : sd.S / sd.D < 1 ? "warn" : "", T.pct(sd.S / sd.D * 100, 1))}
  ${shocks.length ? `<div class="sep"></div>` + shocks.map(s => `<div class="legend-dot"><span class="tag ${s.kind === "supply" ? "red" : "blue"}">${t("mk." + s.kind)}</span>${esc(T.tx(s.title))} <span class="mini">×${T.num(s.mult, 2)} · ${t("mk.monthsLeft", { n: s.left })}</span></div>`).join("") : ""}</div>
  ${card(t("mk.yourPos"), R(t("mk.production"), units(c, pl.prod)) + R(t("mk.consumption"), units(c, pl.cons)) + R(t("mk.imports"), units(c, pl.imp)) + R(t("mk.exports"), units(c, pl.exp)) + R(t("mk.reserve"), t("mk.months", { n: T.num(cover, 1) })) + B(t("mk.supplyRatio"), Math.min(100, (pl.ratio || 1) * 100), (pl.ratio || 1) < .97 ? "bad" : "", T.pct((pl.ratio || 1) * 100)), "")}
  <div class="grid2"><div class="card"><h3>${t("mk.suppliers")}</h3>${flist(fl.imports.slice())}</div><div class="card"><h3>${t("mk.buyers")}</h3>${flist(fl.exports.slice())}</div></div>
  <div class="grid2"><div class="card"><h3>${t("mk.topProd")}</h3>${share(prods, sd.S)}</div><div class="card"><h3>${t("mk.topCons")}</h3>${share(cons, sd.D)}</div></div>
  ${card(t("mk.policy"), R(t("mk.tariff"), select([0, 5, 10, 15, 25, 40].map(v => [v, T.pct(v)]), tar, `data-chg="tariff" data-c="${c}"`)) + R(t("mk.tariffAll"), select([0, 5, 10, 15, 25, 40].map(v => [v, T.pct(v)]), p.trade.tariff, `data-chg="tariff" data-c="*"`)) + `<div class="btn-row" style="margin-top:10px"><button data-act="ban" data-v="${c}" class="${p.trade.exportBan[c] ? "on" : ""}">${p.trade.exportBan[c] ? t("mk.banOn") : t("mk.banOff")}</button></div>`, "mk.policyDesc")}
  ${card(t("mk.spot"), R(t("mk.amount"), select([5, 10, 25, 50].map(v => [v, t("mk.ofMonth", { p: T.pct(v) })]), UI.spot.pct, `data-chg="spot"`)) + R(t("mk.reserve"), units(c, p.stock[c] || 0)) + `<div class="btn-row" style="margin-top:10px"><button class="primary" data-act="spot" data-a="buy" data-v="${c}">${t("mk.buy")} · ${T.money(buyCost)}</button><button data-act="spot" data-a="sell" data-v="${c}">${t("mk.sell")} · ${T.money(sellRev)}</button></div>`, "mk.spotDesc")}`;
};
UI.act.com = el => { UI.com = el.dataset.v; UI.render(); window.WOE_BUS.emit("com"); };
UI.chg.tariff = el => { E.setTariff(UI.w, el.dataset.c, el.value); UI.toast(t("msg.policySet")); UI.render(); UI.saveSilently(); };
UI.act.ban = el => { E.toggleBan(UI.w, el.dataset.v); UI.render(); UI.saveSilently(); };
UI.chg.spot = el => { UI.spot.pct = +el.value; UI.renderPanel(); };
UI.act.spot = el => { const r = E.tradeSpot(UI.w, el.dataset.a, el.dataset.v, UI.spot.pct); UI.say(r); if (r.ok) { A.play("trade"); UI.render(); UI.saveSilently(); window.WOE_BUS.emit("trade"); } };

/* ================= Population / Infrastructure ================= */
P.population = () => {
  const p = me(), reg = p.regions;
  return `<div class="grid2">${M(t("top.pop"), T.big(p.pop))}${M(t("top.approval"), T.pct(p.publicSatisfaction))}</div><div style="height:12px"></div>${card(t("pop.life"), B(t("ind.education"), p.education) + B(t("ind.health"), p.health) + B(t("ind.internet"), p.internet, "blue") + B(t("ind.foodSecurity"), p.foodSecurity) + B(t("pop.satisfaction"), p.publicSatisfaction, "gold"), "pop.lifeDesc")}${card(t("pop.regions"), reg.map(r => R(t("reg." + r.id), T.big(r.population))).join(""))}`;
};
P.infrastructure = () => {
  const p = me(), c = {}; p.buildings.forEach(b => c[b.type] = (c[b.type] || 0) + 1);
  return `${card(t("nav.infrastructure"), B(t("ind.infrastructure"), p.infrastructure) + B(t("res.energy"), p.resources.energy) + B(t("res.freshwater"), p.resources.freshwater, "blue") + B(t("ind.internet"), p.internet, "blue"), "inf.desc")}${card(t("inf.assets"), ["power", "road", "water", "internet", "port", "factory"].map(k => R(UI.bname(k), T.num(c[k] || 0))).join(""))}<div class="btn-row"><button class="primary" data-act="tab" data-v="construction">${t("nav.construction")}</button></div>`;
};

/* ================= Diplomacy ================= */
P.diplomacy = () => {
  const w = UI.w, p = me(), T2 = p.trade, list = [...w.countries].sort((a, b) => b.relation - a.relation);
  return `<div class="grid3">${M(t("dp.pacts"), T.num(T2.pacts.length))}${M(t("dp.embargoes"), T.num(T2.embargo.length))}${M(t("dp.research"), T.num((p.researchPartners || []).length))}</div><div style="height:12px"></div>${card(t("dp.relations"), `<div class="tablewrap"><table><thead><tr><th>${t("th.nation")}</th><th>${t("cc.bloc")}</th><th class="r">${t("cc.rel")}</th><th></th></tr></thead><tbody>${list.map(n => `<tr class="click ${UI.sel === n.id ? "sel" : ""}" data-act="pickCountry" data-id="${n.id}"><td>${esc(T.cname(n.id))} ${T2.pacts.includes(n.id) ? "<span class=\"tag teal\">✓</span>" : ""}${T2.embargo.includes(n.id) ? "<span class=\"tag red\">✕</span>" : ""}</td><td><span class="dot" style="background:${D.blocs[n.bloc].color}"></span></td><td class="r ${n.relation >= 0 ? "up" : "down"}">${T.num(n.relation)}</td><td class="r"><button class="chip-btn" data-act="dip" data-a="summit" data-id="${n.id}">${t("dipa.summit")}</button></td></tr>`).join("")}</tbody></table></div>`, "dp.desc")}<p class="mini">${t("dp.hint")}</p>`;
};

/* ================= Politics / Security / Environment / Regions ================= */
P.politics = () => {
  const p = me(), win = p.lastElection;
  return `<div class="grid2">${M(t("pl.gov"), esc(D.gov[p.government] ? T.tx(D.gov[p.government]) : "—"))}${M(t("cc.stab"), T.pct(p.stability))}</div><div style="height:12px"></div>${card(t("pl.parties"), p.parties.map(x => B(t("party." + x.k), x.support, "gold", T.pct(x.support))).join("") + (win ? `<p class="mini">${t("pl.last", { pk: win.winner })}</p>` : ""), "pl.partiesDesc")}${card(t("pl.actions"), `<div class="btn-row"><button data-act="pol" data-v="election">${t("pl.election")}</button><button data-act="pol" data-v="reform">${t("pl.reform")}</button><button data-act="pol" data-v="dialogue">${t("pl.dialogue")}</button></div>`, "pl.actionsDesc")}`;
};
UI.act.pol = el => { const r = E.political(UI.w, el.dataset.v); UI.say(r); UI.render(); UI.saveSilently(); };
P.security = () => { const p = me(); return `${card(t("nav.security"), B(t("ind.defense"), p.defense, "gold") + B(t("cc.stab"), p.stability), "sec.desc")}${card(t("sec.actions"), `<div class="btn-row"><button data-act="sec" data-v="drill">${t("sec.drill")}</button><button data-act="sec" data-v="patrol">${t("sec.patrol")}</button></div>`)}`; };
UI.act.sec = el => { const r = E.security(UI.w, el.dataset.v); UI.say(r); UI.render(); UI.saveSilently(); };
P.environment = () => { const p = me(); return `${card(t("nav.environment"), B(t("ind.environment"), p.environment) + B(t("res.freshwater"), p.resources.freshwater, "blue"), "env.desc")}${card(t("env.actions"), `<div class="btn-row"><button data-act="env" data-v="restore">${t("env.restore")}</button><button data-act="env" data-v="regulate">${t("env.regulate")}</button></div>`)}`; };
UI.act.env = el => { const r = E.environment(UI.w, el.dataset.v); UI.say(r); UI.render(); UI.saveSilently(); };
P.regions = () => { const p = me(); return `<div class="note">${t("rg.desc")}</div>` + p.regions.map(r => card(esc(t("reg." + r.id)), B(t("rg.dev"), r.development, "blue") + R(t("top.pop"), T.big(r.population)) + R(t("rg.focus"), t("rgres." + r.resource)) + `<div class="btn-row" style="margin-top:8px"><button data-act="region" data-v="${r.id}">${t("rg.invest")}</button></div>`)).join(""); };
UI.act.region = el => { const r = E.investRegion(UI.w, el.dataset.v); UI.say(r); UI.render(); UI.saveSilently(); };

/* ================= Research ================= */
P.research = () => {
  const p = me(), act = p.research.active, rm = E.getCfg(UI.w).rules.researchCostMult, s = sc();
  return `${act ? card(t("rs.active"), `<h4>${t("tech." + act.key)}</h4><div class="bar blue"><i style="width:${p.research.progress}%"></i></div><p class="mini">${t("cs.remaining", { n: act.remaining })}</p>`) : ""}${card(t("rs.catalog"), Object.entries(D.techs).map(([k, tc]) => { const done = p.research.completed.includes(k), cost = tc.cost * 1e9 * s * rm; return `<div class="build-card"><div class="glyph" style="color:var(--violet);border-color:var(--violet)">⚗</div><div><h4>${t("tech." + k)} ${done ? `<span class="tag teal">✓</span>` : ""}</h4><p>${t("td." + k)}</p><p class="mini">${T.money(cost)} · ${t("cs.months", { n: tc.months })}</p></div><button class="${done || act ? "ghost" : "primary"}" data-act="research" data-v="${k}" ${done || act ? "disabled" : ""}>${t("rs.start")}</button></div>`; }).join(""), "rs.desc")}${(p.researchPartners || []).length ? card(t("dp.research"), (p.researchPartners || []).map(id => R(esc(T.cname(id)), "✓")).join("")) : ""}`;
};
UI.act.research = el => { const r = E.startResearch(UI.w, el.dataset.v); UI.say(r); UI.render(); UI.saveSilently(); window.WOE_BUS.emit("research"); };

/* ================= Events ================= */
P.events = () => {
  const w = UI.w, open = w.events.filter(e => !e.resolved), done = w.events.filter(e => e.resolved).slice(0, 8);
  const one = e => `<div class="card event ${e.resolved ? "done" : ""}"><span class="tag gold">${t("evt." + (e.type || "World"))}</span><h3 style="margin-top:6px">${esc(T.tx(e.title))}</h3><p class="desc">${esc(T.tx(e.description))}</p>${e.resolved ? `<p class="mini">${t("evt.chose")} <b>${esc(T.tx(e.outcome))}</b></p>` : `<div class="choices">${e.choices.map((c, i) => `<button data-act="choice" data-id="${e.id}" data-idx="${i}">${esc(T.tx(c.label))}</button>`).join("")}</div>`}</div>`;
  return (open.length ? open.map(one).join("") : `<div class="empty">${t("evt.none")}</div>`) + (done.length ? `<h3 style="margin:18px 0 10px">${t("evt.past")}</h3>` + done.map(one).join("") : "");
};
UI.act.choice = el => { if (E.resolveEvent(UI.w, el.dataset.id, +el.dataset.idx)) { A.play("success"); UI.toast(t("msg.decisionMade")); UI.render(); UI.saveSilently(); window.WOE_BUS.emit("event"); } };

/* ================= Scenario ================= */
P.scenario = () => {
  const w = UI.w, sc2 = D.scenarios[w.scenarioId] || D.scenarios.modern, mk = w.market;
  const obj = w.objectives.map(o => `<div class="bar-row"><div class="top"><span>${esc(t("obj." + o.type, { n: o.value ?? o.mult ?? "", m: o.months ?? "", y: o.years ?? "", v: o.value ?? "", x: o.mult ? T.num((o.mult - 1) * 100) : "" }))}</span><span class="tag ${o.state === "done" ? "teal" : o.state === "failed" ? "red" : "gold"}">${t("obj." + o.state)}</span></div><div class="bar ${o.state === "failed" ? "bad" : o.state === "done" ? "" : "gold"}"><i style="width:${o.state === "done" ? 100 : o.progress || 0}%"></i></div></div>`).join("");
  return `<div class="card"><p class="eyebrow">${t("sc.current")}</p><h3 style="font-size:20px">${esc(T.tx(sc2.name))}</h3><p class="desc">${esc(T.tx(sc2.desc))}</p>${R(t("sc.start"), T.date(w.startYear, sc2.month))}${R(t("sc.difficulty"), t("diff." + w.difficulty))}${R(t("sc.mods"), w.mods.length ? w.mods.map(id => esc(modName(id))).join(", ") : "—")}</div>
  ${w.status.won ? `<div class="note">${t("vic.title")} — ${t("vic.text")}</div>` : ""}${card(t("sc.objectives"), obj || `<p class="mini">${t("sc.noObj")}</p>`, "sc.objDesc")}
  ${card(t("sc.shocks"), mk.shocks.length ? mk.shocks.map(s => `<div class="legend-dot"><span class="tag ${s.kind === "supply" ? "red" : "blue"}">${t("mk." + s.kind)}</span>${esc(s.c === "all" ? t("c.all") : t("c." + s.c))} · ${esc(T.tx(s.title))} <span class="mini">· ${t("mk.monthsLeft", { n: s.left })}</span></div>`).join("") : `<p class="mini">${t("sc.noShocks")}</p>`, "sc.shocksDesc")}`;
};
const modName = id => { const m = E.allMods().find(x => x.id === id); return m ? T.tx(m.name) : id; };

/* ================= Mods ================= */
const EXAMPLE = `{
  "id": "my_mod",
  "name": { "en": "My Mod", "fa": "مود من" },
  "description": { "en": "Short text", "fa": "توضیح کوتاه" },
  "version": "1.0", "author": "you",
  "countries": { "IRN": { "growth": 1.0, "stability": 5 } },
  "production": { "SAU": { "oil": 0.9 } },
  "commodities": { "copper": { "demandTrend": 0.001 } },
  "buildings": { "factory": { "costMult": 0.8 } },
  "newBuildings": { "solar": { "cost": 1.0, "materials": 3, "months": 3,
      "effect": "energy", "icon": "☼", "color": "#f2c14e",
      "name": { "en": "Solar farm", "fa": "مزرعه خورشیدی" },
      "desc": { "en": "Clean power", "fa": "برق پاک" } } },
  "rules": { "tariffBase": 3, "globalGrowthAdd": 0.2 },
  "events": [ { "id": "boom", "every": 14,
      "title": { "en": "Boom", "fa": "رونق" }, "text": { "en": "Text", "fa": "متن" },
      "market": { "c": "copper", "kind": "demand", "mult": 1.15, "months": 6 },
      "choices": [ { "label": { "en": "OK", "fa": "باشه" }, "effects": { "satisfaction": 1 } } ] } ]
}`;
UI.modsList = (inGame) => E.allMods().map(m => `<div class="modrow">${inGame ? `<span class="tg"><input type="checkbox" data-chg="modtoggle" data-v="${esc(m.id)}" ${UI.w.mods.includes(m.id) ? "checked" : ""}><i></i></span>` : `<span class="tag ${m.builtin ? "gold" : "teal"}">${m.builtin ? t("md.builtin") : t("md.user")}</span>`}<div><b>${esc(T.tx(m.name))} <span class="mini">v${esc(m.version)}${m.author ? " · " + esc(m.author) : ""}</span></b><p>${esc(T.tx(m.description))}</p>${m.builtin ? "" : `<button class="chip-btn danger" data-act="modDelete" data-v="${esc(m.id)}">${t("md.delete")}</button>`}</div></div>`).join("");
P.mods = () => `<div class="note">${t("md.note")}</div>${card(t("md.installed"), `<div class="modlist">${UI.modsList(true)}</div>`, "md.desc")}<div class="btn-row" style="margin-bottom:12px"><button class="primary" data-act="modImport">${t("md.import")}</button>${window.worldAPI && window.worldAPI.openModsFolder ? `<button data-act="modFolder">${t("md.folder")}</button>` : ""}</div>${card(t("md.format"), `<p class="desc">${t("md.formatDesc")}</p><pre class="code">${esc(EXAMPLE)}</pre>`)}`;
UI.chg.modtoggle = el => { const w = UI.w, id = el.dataset.v; w.mods = el.checked ? [...new Set([...w.mods, id])] : w.mods.filter(x => x !== id); UI.toast(t("msg.modsChanged")); UI.render(); UI.saveSilently(); };
UI.importMods = async () => {
  let files = [];
  if (window.worldAPI && window.worldAPI.importMods) { try { files = await window.worldAPI.importMods(); } catch (e) { UI.toast(String(e.message || e), true); return; } }
  else files = await new Promise(res => { const i = document.createElement("input"); i.type = "file"; i.accept = ".json"; i.multiple = true; i.onchange = async () => { const o = []; for (const f of i.files) { try { o.push(JSON.parse(await f.text())); } catch {} } res(o); }; i.click(); });
  if (!files.length) return; let ok = 0, bad = 0; const saved = (window.worldAPI ? await UI.store.mods() : JSON.parse(localStorage.getItem("woe.mods") || "[]"));
  for (const m of files) { const v = E.validateMod(m); if (v.ok) { ok++; if (!window.worldAPI) { const i = saved.findIndex(x => x.id === v.mod.id); i >= 0 ? saved[i] = m : saved.push(m); } } else bad++; }
  if (!window.worldAPI) localStorage.setItem("woe.mods", JSON.stringify(saved));
  E.setUserMods(await UI.store.mods()); UI.toast(t("msg.modsImported", { ok, bad }), bad > 0 && !ok); A.play(ok ? "success" : "error"); UI.refreshModUI();
};
UI.refreshModUI = () => { if (UI.w) UI.renderPanel(); const m = document.querySelector("#modalRoot .modlist"); if (m && !UI.w) m.innerHTML = UI.modsList(false); const h = document.querySelector("#homeModList"); if (h) h.innerHTML = UI.modsList(false); };
UI.act.modImport = () => UI.importMods();
UI.act.modFolder = () => window.worldAPI.openModsFolder();
UI.act.modDelete = async el => { const id = el.dataset.v; if (window.worldAPI && window.worldAPI.deleteMod) await window.worldAPI.deleteMod(id); else localStorage.setItem("woe.mods", JSON.stringify(JSON.parse(localStorage.getItem("woe.mods") || "[]").filter(m => m.id !== id))); E.setUserMods(await UI.store.mods()); if (UI.w) UI.w.mods = UI.w.mods.filter(x => x !== id); UI.refreshModUI(); };

/* ================= Reports ================= */
P.reports = () => { const w = UI.w, H = w.market.history; return `${H.length > 2 ? card(t("rp.charts"), `<p class="mini">${t("top.gdp")}</p>${UI.spark(H.map(x => x.gdp), H[0].gdp, "#e0b14f")}<p class="mini">${t("top.inflation")}</p>${UI.spark(H.map(x => x.infl), 3, "#e8695c")}<p class="mini">${t("cc.tradebal")}</p>${UI.spark(H.map(x => x.bal), 0, "#46c2ae")}`) : ""}${card(t("rp.log"), w.history.slice(-40).reverse().map(h => `<div class="row"><span>${esc(T.isoDate(h.date))}</span><span style="text-align:start;flex:1;color:var(--ink);font-weight:400">${esc(UI.logText(h))}</span></div>`).join(""))}${card(t("rp.decisions"), w.decisions.slice(0, 12).map(d => R(esc(T.tx(d.title)), esc(T.tx(d.choice)))).join("") || `<p class="mini">${t("evt.none")}</p>`)}`; };

/* ================= Settings ================= */
const slider = (k, label) => `<div class="field"><label>${label} <b>${T.pct(A.state()[k] * 100)}</b></label><input type="range" min="0" max="100" value="${Math.round(A.state()[k] * 100)}" data-inp="vol" data-k="${k}"></div>`;
const tog = (k, label, v, on) => `<label class="switch"><span>${label}</span><span class="tg"><input type="checkbox" data-chg="${on}" data-v="${k}" ${v ? "checked" : ""}><i></i></span></label>`;
P.settings = () => {
  const s = A.state(), mu = A.music, w = UI.w;
  return `${card(t("set.language"), select([["en", "English"], ["fa", "فارسی (Persian)"]], T.lang(), `data-chg="lang"`), "set.langDesc")}
  ${card(t("set.audio"), tog("mute", t("set.mute"), s.mute, "audtog") + tog("ambientOn", t("set.ambient"), s.ambientOn, "audtog") + slider("master", t("set.vMaster")) + slider("sfx", t("set.vSfx")) + slider("ambient", t("set.vAmbient")) + slider("music", t("set.vMusic")), "set.audioDesc")}
  ${card(t("set.music"), `<div class="player"><button class="icon-btn" data-act="mPrev" aria-label="prev"><svg viewBox="0 0 24 24"><path d="M6 5v14M18 5L9 12l9 7z"/></svg></button><button class="icon-btn on" data-act="mToggle" aria-label="play"><svg viewBox="0 0 24 24"><path d="${mu.playing ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z"}"/></svg></button><button class="icon-btn" data-act="mStop" aria-label="stop"><svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg></button><button class="icon-btn" data-act="mNext" aria-label="next"><svg viewBox="0 0 24 24"><path d="M18 5v14M6 5l9 7-9 7z"/></svg></button></div>${mu.error ? `<p class="mini down">${t("set.musicErr")}</p>` : ""}${mu.list.length ? mu.list.map((tr, i) => `<div class="track ${i === mu.index ? "on" : ""}"><button data-act="mPlay" data-v="${i}">${i === mu.index && mu.playing ? "▮▮" : "▶"}</button><span title="${esc(tr.name)}">${esc(tr.name)}</span><button data-act="mDel" data-v="${i}">✕</button></div>`).join("") : `<p class="mini" style="margin-bottom:8px">${t("set.noTracks")}</p>`}<div class="btn-row" style="margin-top:8px"><button class="primary" data-act="mAdd">${t("set.addMusic")}</button></div>${tog("loop", t("set.loop"), s.loop, "audtog")}${tog("shuffle", t("set.shuffle"), s.shuffle, "audtog")}`, "set.musicDesc")}
  ${card(t("set.game"), tog("autosave", t("set.autosave"), w.settings.autosave, "gametog") + `<div class="row"><span>${t("set.speed")}</span>${select([[1, "1×"], [2, "2×"], [4, "4×"]], UI.speed, `data-chg="speed"`)}</div>`)}
  ${card(t("set.mapdata"), `<p class="desc">${t("set.mapdataDesc")}</p><div class="row"><span>${t("set.mapSource")}</span><b>${esc(UI.geoSource || t("set.builtinMap"))}</b></div>${window.worldAPI && window.worldAPI.openMapsFolder ? `<div class="btn-row" style="margin-top:8px"><button data-act="mapsFolder">${t("set.openMaps")}</button></div>` : ""}`)}
  ${card(t("set.backup"), `<div class="btn-row"><button data-act="export">${t("set.export")}</button><button data-act="importBackup">${t("set.import")}</button></div>`, "set.backupDesc")}
  ${card(t("set.session"), `<div class="btn-row"><button class="primary" data-act="saveNow">${t("top.save")}</button><button data-act="menu">${t("set.menu")}</button></div><p class="mini" style="margin-top:10px">v${E.VERSION} · ${esc(w.name)}</p>`)}`;
};
UI.chg.lang = el => UI.setLang(el.value);
UI.chg.audtog = el => { A.set(el.dataset.v, el.checked); UI.renderTop(); if (UI.tab === "settings") UI.renderPanel(); };
UI.chg.gametog = el => { UI.w.settings[el.dataset.v] = el.checked; UI.saveSilently(); };
UI.chg.speed = el => UI.setSpeed(+el.value);
UI.chg.vol = el => { A.set(el.dataset.k, el.value / 100); const l = el.previousElementSibling; if (l) l.querySelector("b").textContent = T.pct(+el.value); UI.renderTop(); };
UI.act.mToggle = () => A.toggle(); UI.act.mStop = () => A.stop(); UI.act.mNext = () => A.next(); UI.act.mPrev = () => A.prev(); UI.act.mAdd = () => A.addFiles(); UI.act.mPlay = el => { const i = +el.dataset.v; if (A.music.index === i && A.music.playing) A.toggle(); else A.playIndex(i); }; UI.act.mDel = el => A.removeTrack(+el.dataset.v);
A.onChange(() => { if (UI.tab === "settings" && UI.w && !document.activeElement?.matches?.("input[type=range]")) UI.renderPanel(); });
UI.act.mapsFolder = () => window.worldAPI.openMapsFolder();
UI.act.saveNow = async () => { if (UI.tutorial) { UI.toast(t("tut.nosave"), true); return; } const ok = await UI.saveSilently(); if (ok) { UI.toast(t("msg.saved")); A.play("success"); } };
UI.act.export = () => { const blob = new Blob([JSON.stringify(UI.w)], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `woe-${UI.w.name.replace(/[^\w-]+/g, "_")}-${UI.w.currentYear}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); UI.toast(t("msg.exported")); };
UI.act.importBackup = () => { const i = document.createElement("input"); i.type = "file"; i.accept = ".json"; i.onchange = async () => { try { const d = JSON.parse(await i.files[0].text()); if (!d || !d.playerCountry || !d.currentYear) throw new Error("bad"); d.id = "world_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8); d.name = (d.name || "World") + " (copy)"; await UI.store.save(d); UI.toast(t("msg.imported")); A.play("success"); } catch { UI.toast(t("msg.importFail"), true); A.play("error"); } }; i.click(); };
})();
