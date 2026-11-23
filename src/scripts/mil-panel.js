/* WORLD OF EMPIRES — military panel, war room, map integration */
(() => {
"use strict";
const UI = window.UI, E = WOE, X = WOE_MIL, D = WOE_DATA, M = D.MIL, T = I18N, A = WOE_AUDIO, t = T.t, esc = UI.esc, P = UI.panels, B = UI.bar, R = UI.row, MET = UI.metric;
const me = () => UI.w.playerCountry;
const fx = v => T.num(v, v < 10 && v % 1 ? 1 : 0);
const sel = (opts, cur, attrs) => `<select ${attrs}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const card = (title, body, d) => `<div class="card">${title ? `<h3>${title}</h3>` : ""}${d ? `<p class="desc">${t(d)}</p>` : ""}${body}</div>`;
UI.milTab = "overview"; UI.milTarget = null; UI.milQty = 5; UI.milForce = false; UI.milM = { type: "cruise", n: 2, cat: "bases" }; UI.milAir = { kind: "bomber", n: 5, cat: "bases" }; UI.milStance = { commit: 50, mode: "land" };
const ICON = { infantry: "◈", armor: "▣", artillery: "✸", fighter: "✈", bomber: "⬣", drone: "◉", corvette: "⌂", destroyer: "⚓", transport: "⛴", submarine: "◗", carrier: "▬", sam: "⛨", shield: "◌", srbm: "↑", cruise: "➶", mrbm: "⇡", hyper: "⇮" };
const COLOR = { land: "#c6a46a", air: "#7ec8e3", sea: "#5b9cf0", def: "#6fd3a5", missile: "#e8695c" };
const TABS = ["overview", "forces", "tech", "war", "access"];
const TGK = Object.keys(M.targets);
const enemyList = () => X.activeWars(UI.w).map(w => w.enemy);
const target = () => { const w = UI.w; let id = UI.milTarget; if (!id || !w.countries.some(c => c.id === id)) { const sc = UI.sel && w.countries.some(c => c.id === UI.sel) ? UI.sel : null; id = sc || enemyList()[0] || null; } return id; };
const tabs = () => `<div class="tabs">${TABS.map(k => `<button class="${UI.milTab === k ? "on" : ""}" data-act="milTab" data-v="${k}">${t("mil.tab." + k)}</button>`).join("")}</div>`;
const chipList = (ids, kind) => ids.map(id => `<span class="tag ${X.permitOk(UI.w, id, kind) ? "teal" : "red"}">${esc(T.cname(id))} · ${t(X.permitOk(UI.w, id, kind) ? "mil.granted" : "mil.noPermit")}</span>`).join("");

/* ---------------- tab: command ---------------- */
function overview() {
  const w = UI.w, p = me(), m = p.mil, u = m.units, rk = X.ranking(w), pos = rk.findIndex(x => x[0] === p.id) + 1, wars = X.activeWars(w), pend = X.status(w).pending;
  const cats = [["land", ["infantry", "armor", "artillery"]], ["air", ["fighter", "bomber", "drone"]], ["sea", ["corvette", "destroyer", "transport", "submarine", "carrier"]], ["def", ["sam", "shield"]]];
  const unitsHtml = cats.map(([c, ks]) => `<div class="row"><span><span class="dot" style="background:${COLOR[c]}"></span>${t("mg." + c)}</span><b style="font-weight:500">${ks.map(k => `${t("un." + k)} ${fx(u[k])}`).join(" · ")}</b></div>`).join("") + `<div class="row"><span><span class="dot" style="background:${COLOR.missile}"></span>${t("mg.missile")}</span><b style="font-weight:500">${Object.keys(M.missiles).map(k => `${t("ms." + k)} ${fx(m.missiles[k] || 0)}`).join(" · ")}</b></div>`;
  const q = m.queue.map(o => `<div class="row"><span>${o.qty} × ${esc(t((o.kind === "missile" ? "ms." : "un.") + o.type))}</span><b>${t("cs.remaining", { n: o.remaining })}</b></div><div class="bar blue"><i style="width:${(1 - o.remaining / o.total) * 100}%"></i></div>`).join("");
  const occ = Object.entries(p.occ || {});
  const powers = rk.slice(0, 8).map(([id, v], i) => `<tr class="click ${id === p.id ? "sel" : ""}" data-act="pickCountry" data-id="${id}"><td>${T.num(i + 1)}</td><td>${esc(T.cname(id))}</td><td class="r">${T.num(X.rating(w, id))}</td></tr>`).join("");
  return `<div class="grid2">${MET(t("mil.personnel"), T.big(X.men(p) * 1000), t("mil.cap", { v: T.big(X.manCap(p) * 1000) }))}${MET(t("mil.rating"), T.num(X.rating(w, p.id)), t("mil.rank", { n: pos }))}${MET(t("mil.ready"), T.pct(m.ready), t("mil.weary") + ": " + T.pct(m.weary))}${MET(t("mil.ad"), T.pct(X.adOf(p)), t("mil.upkeep") + ": " + T.money(X.upkeep(w)))}</div><div style="height:12px"></div>
  ${wars.length ? `<div class="note bad">⚔ ${t("mil.atWar", { list: wars.map(x => T.cname(x.enemy)).join(", ") })} <button class="chip-btn gold" style="margin-inline-start:8px" data-act="milGo" data-v="war" data-id="${wars[0].enemy}">${t("mil.warRoom")}</button></div>` : `<div class="note">${t("mil.atPeace")}</div>`}
  ${pend.length ? `<div class="note">🏳 ${t("mil.pendingSettle", { cid: pend[0].enemy })} <button class="chip-btn gold" data-act="milGo" data-v="war" data-id="${pend[0].enemy}">${t("mil.settleNow")}</button></div>` : ""}
  ${card(t("mil.units"), unitsHtml)}${card(t("mil.production"), q || `<p class="mini">${t("mil.noQueue")}</p>`)}
  ${occ.length ? card(t("mil.occupied"), occ.map(([id, o]) => B(T.cname(id), 100 - o.unrest, o.unrest > 40 ? "bad" : "warn", t("mil.unrest") + " " + T.pct(o.unrest))).join(""), "mil.occupiedDesc") : ""}
  ${card(t("mil.powers"), `<div class="tablewrap"><table><thead><tr><th>#</th><th>${t("th.nation")}</th><th class="r">${t("mil.rating")}</th></tr></thead><tbody>${powers}</tbody></table></div>`)}`;
}

/* ---------------- tab: forces ---------------- */
function unitRow(kind, k) {
  const w = UI.w, p = me(), spec = (kind === "missile" ? M.missiles : M.units)[k], cost = spec.cost * UI.milQty * 1e9 * E.scale(w), lock = spec.tech && !X.hasTech(p, spec.tech);
  const have = kind === "missile" ? p.mil.missiles[k] || 0 : p.mil.units[k] || 0, nameK = (kind === "missile" ? "ms." : "un.") + k, descK = (kind === "missile" ? "msd." : "ud.") + k;
  const col = kind === "missile" ? COLOR.missile : COLOR[spec.cat];
  const stats = kind === "missile" ? t("mil.mstats", { km: T.num(spec.range), acc: T.pct(spec.acc * 100), dmg: T.num(spec.dmg, 1) }) : t("mil.ustats", { men: T.num(spec.men, 1) });
  return `<div class="build-card ${lock ? "locked" : ""}"><div class="glyph" style="color:${col};border-color:${col}">${ICON[k]}</div><div><h4>${esc(t(nameK))} <span class="tag gold">×${fx(have)}</span></h4><p>${esc(t(descK))}</p><p class="mini">${stats} · ${T.money(cost)} · ${t("cs.months", { n: spec.months })}</p>${lock ? `<p class="mini down">🔒 ${t("mil.locked", { mt: spec.tech })}</p>` : ""}</div><button class="${lock ? "ghost" : "primary"}" data-act="milOrder" data-kind="${kind}" data-v="${k}" ${lock ? "disabled" : ""}>${t("mil.order")}</button></div>`;
}
function forces() {
  const p = me(), groups = [["land", ["infantry", "armor", "artillery"]], ["air", ["fighter", "bomber", "drone"]], ["sea", ["corvette", "destroyer", "transport", "submarine", "carrier"]], ["def", ["sam", "shield"]]];
  return `<div class="note">${t("mil.forcesNote", { cap: T.big(X.manCap(p) * 1000), used: T.big(X.men(p) * 1000) })}</div><div class="card"><div class="row"><span>${t("mil.qty")}</span>${sel([1, 5, 10, 20].map(v => [v, "× " + T.num(v)]), UI.milQty, 'data-chg="milqty"')}</div></div>` +
    groups.map(([c, ks]) => `<h3 style="margin:14px 0 8px;color:${COLOR[c]}">${t("mg." + c)}</h3>` + ks.map(k => unitRow("unit", k)).join("")).join("") + `<h3 style="margin:14px 0 4px;color:${COLOR.missile}">${t("mg.missile")}</h3><p class="mini" style="margin-bottom:8px">${t("mil.missileNote")}</p>` + Object.keys(M.missiles).map(k => unitRow("missile", k)).join("");
}

/* ---------------- tab: technology ---------------- */
function techTab() {
  const p = me(), m = p.mil, act = m.research.active, s = E.scale(UI.w), grp = ["land", "air", "sea", "missile", "defense"];
  const row = k => { const tc = M.techs[k], done = X.hasTech(p, k), missReq = tc.req.filter(r => !X.hasTech(p, r)), civ = tc.civil && !p.research.completed.includes(tc.civil), cost = tc.cost * 1e9 * s;
    const lock = !done && (missReq.length || civ), why = missReq.length ? t("mil.reqMil", { list: missReq.map(r => t("mt." + r)).join(", ") }) : civ ? t("mil.reqCivil", { tech: tc.civil }) : "";
    return `<div class="build-card ${lock ? "locked" : ""}"><div class="glyph" style="color:var(--violet);border-color:var(--violet)">⚗</div><div><h4>${esc(t("mt." + k))} ${done ? `<span class="tag teal">✓</span>` : ""}</h4><p>${esc(t("mtd." + k))}</p><p class="mini">${T.money(cost)} · ${t("cs.months", { n: tc.months })}</p>${lock ? `<p class="mini down">🔒 ${esc(why)}</p>` : ""}</div><button class="${done || lock || act ? "ghost" : "primary"}" data-act="milTech" data-v="${k}" ${done || lock || act ? "disabled" : ""}>${t("rs.start")}</button></div>`; };
  return (act ? card(t("rs.active"), `<h4>${esc(t("mt." + act.key))}</h4><div class="bar blue"><i style="width:${m.research.progress}%"></i></div><p class="mini">${t("cs.remaining", { n: act.remaining })}</p>`) : "") + `<p class="desc">${t("mil.techDesc")}</p>` + grp.map(g => `<h3 style="margin:14px 0 8px">${t("mg." + g)}</h3>` + Object.keys(M.techs).filter(k => M.techs[k].grp === g).map(row).join("")).join("");
}

/* ---------------- tab: war room ---------------- */
const REP = r => { const b = { turn: r.turn }; switch (r.k) {
  case "ground": return t("mil.rp.ground", { d: T.num(r.d, 1), r: T.num(r.r, 2), a: T.num(r.mine), b: T.num(r.theirs) });
  case "defense": return t("mil.rp.defense", { d: T.num(r.d, 1), r: T.num(r.r, 2) });
  case "strike": return t("mil.rp.strike", { n: r.n, un: "ms." + r.mt, tg: r.cat, hits: T.num(r.hits, 1), v: r.tg });
  case "air": return t("mil.rp.air", { n: r.n, un: "un." + r.un, tg: r.cat, v: T.num(r.v, 1), lost: T.num(r.lost, 1) });
  case "incoming": return t("mil.rp.incoming", { n: r.n, hits: T.num(r.hits, 1), lost: r.lost }); } return ""; };
function warRoom() {
  const w = UI.w, p = me(), m = p.mil, id = target(); const opts = [["", "—"], ...w.countries.slice().sort((a, b) => T.cname(a.id).localeCompare(T.cname(b.id), T.lang())).map(c => [c.id, T.cname(c.id) + (X.warOf(w, c.id) ? " ⚔" : "")])];
  const pendAll = X.status(w).pending; let h = pendAll.map(settleCard).join("") + card(t("mil.target"), sel(opts, id || "", 'data-chg="miltarget"') + (UI.sel && w.countries.some(c => c.id === UI.sel) && UI.sel !== id ? ` <button class="chip-btn" data-act="milPick">${t("mil.useSelected", { cid: UI.sel })}</button>` : ""), "mil.targetDesc");
  const pend = X.status(w).pending;
  if (!id) return h + (pend.length ? "" : `<div class="empty">${t("mil.pickTarget")}</div>`);
  const n = w.countries.find(c => c.id === id), a = X.milOf(w, p.id), e = X.milOf(w, id), war = X.warOf(w, id), r = X.route(w, id);
  const cmp = (lbl, x, y, d = 0) => `<tr><td>${lbl}</td><td class="r">${T.num(x, d)}</td><td class="r ${y > x ? "down" : "up"}">${T.num(y, d)}</td></tr>`;
  h += card(`${esc(T.cname(id))} <span class="tag ${n.relation >= 0 ? "teal" : "red"}">${t("cc.rel")} ${T.num(n.relation)}</span>`, `<div class="tablewrap"><table><thead><tr><th></th><th class="r">${t("mil.you")}</th><th class="r">${esc(T.cname(id))}</th></tr></thead><tbody>${cmp(t("mil.troops"), a.troops / 1000, e.troops / 1000)}${cmp(t("mil.ground"), a.ground, e.ground)}${cmp(t("mil.air"), a.air, e.air)}${cmp(t("mil.navy"), a.navy, e.navy)}${cmp(t("mil.missilesRow"), a.missiles, e.missiles)}${cmp(t("mil.ad"), a.ad, e.ad)}${cmp(t("mil.ready"), a.ready, e.ready)}${cmp(t("mil.rating"), X.rating(w, p.id), X.rating(w, id))}</tbody></table></div><p class="mini">${t("mil.thousands")}</p>` + `<div class="sep"></div><p class="mini" style="margin-bottom:6px">${t("mil.condition")}</p>` + TGK.map(k => B(t("tg." + k), e.tg[k], e.tg[k] < 35 ? "bad" : e.tg[k] < 70 ? "warn" : "", T.pct(e.tg[k]))).join(""));
  /* routes */
  const landTxt = r.land ? (r.land.transit.length ? t("mil.via", { list: r.land.transit.map(x => T.cname(x)).join(", ") }) : t("mil.directBorder")) : t("mil.noLand");
  const askBtns = (ids, kind) => ids.filter(x => !X.permitOk(w, x, kind)).map(x => `<button class="chip-btn" data-act="milAsk" data-id="${x}" data-kind="${kind}">${t("mil.ask", { cid: x })}</button>`).join(" ");
  h += card(t("mil.routes"), R(t("mil.distance"), T.num(r.km) + " " + t("mil.km")) +
    R(t("mil.landRoute"), esc(landTxt)) + (r.land && r.land.transit.length ? `<div style="margin:4px 0 8px">${chipList(r.land.transit, "land")} ${askBtns(r.land.transit, "land")}</div>` : "") +
    R(t("mil.seaRoute"), r.sea.coastal ? (r.sea.capacity > 0 ? t("mil.seaOk", { v: fx(r.sea.capacity) }) : t("mil.seaNeed")) : t("mil.isLandlocked")) +
    R(t("mil.airRoute"), r.air.transit.length ? t("mil.crosses") : t("mil.corridorOpen")) + (r.air.transit.length ? `<div style="margin:4px 0 8px">${chipList(r.air.transit, "air")} ${askBtns(r.air.transit, "air")}</div>` : "") +
    `<label class="switch"><span>${t("mil.force")}</span><span class="tg"><input type="checkbox" data-chg="milforce" ${UI.milForce ? "checked" : ""}><i></i></span></label>`, "mil.routesDesc");
  if (war && war.status === "active") h += activeWar(war, n, a, e); else if (!war && !pend.some(x => x.enemy === id)) {
    const just = n.relation <= -40 || p.trade.embargo.includes(id);
    h += card(t("mil.declareT"), `<p class="desc ${just ? "" : "down"}">${t(just ? "mil.justified" : "mil.unjustified")}</p><p class="mini" style="margin-bottom:8px">${t("mil.declareNote")}</p><button class="danger" data-act="milDeclare" data-id="${id}">⚔ ${t("mil.declare")}</button>`);
  }
  return h;
}
function activeWar(war, n, a, e) {
  const w = UI.w, p = me(), m = p.mil, id = war.enemy, st = UI.milStance, mm = UI.milM, ma = UI.milAir, months = w.turn - war.start;
  let h = `<div class="card event"><span class="tag red">⚔ ${t("mil.activeWar")}</span><h3 style="margin-top:6px">${t("mil.vsTitle", { cid: id })}</h3><p class="mini">${t("mil.warAge", { n: months })} · ${t(war.initiator === "ai" ? "mil.theyStarted" : "mil.youStarted")}</p>` +
    B(t("mil.progress"), war.progress, "gold", T.pct(war.progress)) + B(t("mil.enemyProgress"), war.enemyProgress, "bad", T.pct(war.enemyProgress)) + (war.mode === "sea" ? B(t("mil.seaControl"), war.seaControl, "blue", T.pct(war.seaControl)) : "") + B(t("mil.weary"), m.weary, m.weary > 60 ? "bad" : "warn", T.pct(m.weary)) + B(t("mil.enemyWeary"), n.mil.weary, "", T.pct(n.mil.weary)) +
    R(t("mil.casualties"), `${T.big(war.cas.mine * 1000)} / ${T.big(war.cas.theirs * 1000)}`) + `</div>`;
  h += card(t("mil.ground0"), `<div class="row"><span>${t("mil.commit")}</span>${sel([0, 25, 50, 75, 100].map(v => [v, T.pct(v)]), war.commit, 'data-chg="milcommit"')}</div><div class="row"><span>${t("mil.mode")}</span>${sel([["land", t("mil.mode.land")], ["sea", t("mil.mode.sea")]], war.mode, 'data-chg="milmode"')}</div><p class="mini">${t("mil.groundNote")}</p>`, "mil.groundDesc");
  const mstock = Object.keys(M.missiles).filter(k => X.hasTech(p, M.missiles[k].tech));
  h += card(t("mil.missileOp"), mstock.length ? `<div class="row"><span>${t("mil.type")}</span>${sel(mstock.map(k => [k, `${t("ms." + k)} (${fx(m.missiles[k] || 0)})`]), mm.type, 'data-chg="milmtype"')}</div><div class="row"><span>${t("mil.salvos")}</span>${sel([1, 2, 5, 10].map(v => [v, T.num(v)]), mm.n, 'data-chg="milmn"')}</div><div class="row"><span>${t("mil.targetCat")}</span>${sel(TGK.map(k => [k, t("tg." + k)]), mm.cat, 'data-chg="milmcat"')}</div><div class="btn-row" style="margin-top:10px"><button class="danger" data-act="milFire">🚀 ${t("mil.fire")}</button></div>` : `<p class="mini">${t("mil.noMissileTech")}</p>`, "mil.missileDesc");
  const akinds = ["fighter", "bomber", "drone"].filter(k => X.hasTech(p, M.units[k].tech));
  const cats = ma.kind === "fighter" ? ["airforce"] : ["army", ...TGK];
  h += card(t("mil.airOp"), akinds.length ? `<div class="row"><span>${t("mil.type")}</span>${sel(akinds.map(k => [k, `${t("un." + k)} (${fx(m.units[k] || 0)})`]), ma.kind, 'data-chg="milakind"')}</div><div class="row"><span>${t("mil.squads")}</span>${sel([1, 2, 5, 10, 20].map(v => [v, T.num(v)]), ma.n, 'data-chg="milan"')}</div><div class="row"><span>${t("mil.targetCat")}</span>${sel(cats.map(k => [k, t("tg." + k)]), cats.includes(ma.cat) ? ma.cat : cats[0], 'data-chg="milacat"')}</div><div class="btn-row" style="margin-top:10px"><button class="danger" data-act="milAir">✈ ${t("mil.launch")}</button></div>` : `<p class="mini">${t("mil.noAirTech")}</p>`, "mil.airDesc");
  h += `<div class="btn-row" style="margin-bottom:12px"><button data-act="milCeasefire" data-id="${war.id}">🕊 ${t("mil.ceasefire")}</button></div>`;
  h += card(t("mil.reports"), war.report.length ? war.report.map(r => `<div class="row"><span>${T.num(r.turn)}</span><span style="text-align:start;flex:1;color:var(--ink);font-weight:400">${esc(REP(r))}</span></div>`).join("") : `<p class="mini">${t("mil.noReports")}</p>`);
  return h;
}
function settleCard(war) {
  return `<div class="card event"><span class="tag teal">🏳 ${t("mil.victory")}</span><h3 style="margin-top:6px">${t("mil.victoryOver", { cid: war.enemy })}</h3><p class="desc">${t("mil.settleDesc")}</p><div class="choices">${["annex", "puppet", "reparations"].map(k => `<button data-act="milSettle" data-id="${war.id}" data-v="${k}"><b>${t("sk." + k)}</b><br><span class="mini">${t("skd." + k)}</span></button>`).join("")}</div></div>`;
}

/* ---------------- tab: access ---------------- */
function access() {
  const w = UI.w, p = me(), list = w.countries.slice().sort((a, b) => b.relation - a.relation);
  const st = (id, kind) => { const e = p.mil.permits[kind][id] || 0; return X.permitOk(w, id, kind) ? `<span class="tag teal">${t("mil.monthsShort", { n: e - w.turn })}</span>` : `<button class="chip-btn" data-act="milAsk" data-id="${id}" data-kind="${kind}">${t("mil.askShort")}</button>`; };
  return `<div class="note">${t("mil.accessNote")}</div>${card(t("mil.accessT"), `<div class="tablewrap"><table><thead><tr><th>${t("th.nation")}</th><th class="r">${t("cc.rel")}</th><th>${t("pm.air")}</th><th>${t("pm.land")}</th></tr></thead><tbody>${list.map(n => `<tr><td>${esc(T.cname(n.id))}</td><td class="r ${n.relation >= 0 ? "up" : "down"}">${T.num(n.relation)}</td><td>${st(n.id, "air")}</td><td>${st(n.id, "land")}</td></tr>`).join("")}</tbody></table></div>`)}`;
}
P.military = () => tabs() + ({ overview, forces, tech: techTab, war: warRoom, access }[UI.milTab] || overview)();

/* ---------------- actions ---------------- */
const done = (r, fxInfo) => { UI.say(r); if (r.ok) { A.play(fxInfo ? "build" : "success"); if (fxInfo) UI.strikeFx(fxInfo); UI.render(); UI.saveSilently(); } };
Object.assign(UI.act, {
  milTab: el => { UI.milTab = el.dataset.v; UI.renderPanel(true); },
  milGo: el => { UI.milTab = el.dataset.v; if (el.dataset.id) UI.milTarget = el.dataset.id; UI.renderPanel(true); },
  milPick: () => { UI.milTarget = UI.sel; UI.renderPanel(); },
  milOrder: el => done(X.orderUnit(UI.w, el.dataset.kind, el.dataset.v, UI.milQty)),
  milTech: el => done(X.startTech(UI.w, el.dataset.v)),
  milAsk: el => { const r = X.requestPermit(UI.w, el.dataset.id, el.dataset.kind, target()); done(r); if (!r.ok) UI.renderPanel(); },
  milDeclare: el => { const id = el.dataset.id; UI.modal(`<p class="eyebrow">${t("mil.declareT")}</p><h2>${t("mil.vsTitle", { cid: id })}</h2><p class="desc">${t("mil.confirmWar")}</p><div class="actions"><button class="ghost" data-act="closeModal">${t("md.cancel")}</button><button class="danger" data-act="milDeclareYes" data-id="${id}">⚔ ${t("mil.declare")}</button></div>`); },
  milDeclareYes: el => { UI.closeModal(); const r = X.declareWar(UI.w, el.dataset.id); done(r); if (r.ok) { A.play("event"); UI.milTarget = el.dataset.id; window.WOE_BUS.emit("war"); } },
  milFire: () => { const id = target(), m = UI.milM; done(X.fireMissiles(UI.w, id, m.type, m.n, m.cat, UI.milForce), null); const r = X.warOf(UI.w, id); },
  milAir: () => { const id = target(), a = UI.milAir, cats = a.kind === "fighter" ? ["airforce"] : ["army", ...TGK]; done(X.airStrike(UI.w, id, a.kind, a.n, cats.includes(a.cat) ? a.cat : cats[0], UI.milForce)); },
  milCeasefire: el => done(X.ceasefire(UI.w, el.dataset.id)),
  milSettle: el => { const r = X.settle(UI.w, el.dataset.id, el.dataset.v); done(r); if (r.ok) { UI.milTarget = null; if (el.dataset.v === "annex") UI.map.focus(UI.w.playerCountry.id, .25); } }
});
UI.act.milFire = () => { const id = target(), m = UI.milM, r = X.fireMissiles(UI.w, id, m.type, m.n, m.cat, UI.milForce); UI.say(r); if (r.ok) { UI.strikeFx(r.fx); A.play("build"); UI.render(); UI.saveSilently(); } };
UI.act.milAir = () => { const id = target(), a = UI.milAir, cats = a.kind === "fighter" ? ["airforce"] : ["army", ...TGK], r = X.airStrike(UI.w, id, a.kind, a.n, cats.includes(a.cat) ? a.cat : cats[0], UI.milForce); UI.say(r); if (r.ok) { UI.strikeFx(r.fx); A.play("build"); UI.render(); UI.saveSilently(); } };
const stance = () => { const id = target(), war = X.warOf(UI.w, id); if (!war) return; const r = X.setStance(UI.w, war.id, +UI.milStance.commit, UI.milStance.mode, UI.milForce); UI.say(r); if (r.ok) { UI.render(); UI.saveSilently(); } else UI.renderPanel(); };
Object.assign(UI.chg, {
  miltarget: el => { UI.milTarget = el.value || null; if (el.value) UI.map.focus(el.value, .3); UI.renderPanel(); }, milqty: el => { UI.milQty = +el.value; UI.renderPanel(); }, milforce: el => { UI.milForce = el.checked; },
  milcommit: el => { UI.milStance.commit = +el.value; stance(); }, milmode: el => { UI.milStance.mode = el.value; const war = X.warOf(UI.w, target()); if (war && war.commit > 0) { UI.milStance.commit = war.commit; stance(); } else { war && (war.mode = el.value); UI.renderPanel(); } },
  milmtype: el => { UI.milM.type = el.value; }, milmn: el => { UI.milM.n = +el.value; }, milmcat: el => { UI.milM.cat = el.value; },
  milakind: el => { UI.milAir.kind = el.value; UI.renderPanel(); }, milan: el => { UI.milAir.n = +el.value; }, milacat: el => { UI.milAir.cat = el.value; }
});

/* ---------------- map integration ---------------- */
const baseFill = UI.fill, mkRamp = (stops, x) => { x = Math.max(0, Math.min(1, x)); const n = stops.length - 1, i = Math.min(n - 1, Math.floor(x * n)), f = x * n - i, h = s => [1, 3, 5].map(k => parseInt(s.slice(k, k + 2), 16)), a = h(stops[i]), b = h(stops[i + 1]); return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`; };
UI.fill = id => {
  const w = UI.w; if (!w) return baseFill(id); const p = w.playerCountry;
  if ((p.territories || []).includes(id)) return UI.layer === "political" || UI.layer === "military" ? "rgba(70,194,174,.62)" : baseFill(id);
  if (UI.layer === "military") { const n = E.nodeById(w, id); if (!n) return "#2a3a47"; const v = Math.sqrt(X.rating(w, id) / 100); return id === p.id ? "#46c2ae" : mkRamp(["#1b222c", "#4a3b3b", "#8c4a3a", "#d2603f", "#ffa05c"], v); }
  const war = X.warOf(w, id); if (war && UI.layer === "political") return `rgba(${226},${70},${60},${(.45 + war.progress / 200).toFixed(2)})`;
  return baseFill(id);
};
const baseVal = UI.layerValue; UI.layerValue = id => UI.layer === "military" ? T.num(X.rating(UI.w, id)) : baseVal(id);
UI.layers.splice(UI.layers.indexOf("net") + 1, 0, "military");
const baseLegend = UI.legend; UI.legend = () => UI.layer === "military" ? `<b>${t("layer.military")}</b><div class="legend-bar" style="background:linear-gradient(90deg,#1b222c,#4a3b3b,#8c4a3a,#d2603f,#ffa05c)"></div><div class="legend-lbl"><span>${t("lg.weak")}</span><span>${t("lg.strong")}</span></div>` : baseLegend();
const baseRefresh = UI.refreshMap;
UI.refreshMap = () => { baseRefresh(); if (UI.map && UI.w) { UI.map.warIds = X.activeWars(UI.w).map(x => x.enemy); UI.map.dirty = true; } };
UI.strikeFx = fx => { if (!UI.map || !fx) return; const a = E.capOf(fx.from), b = E.capOf(fx.to); if (a && b) UI.map.addStrike(a, b, fx.n || 3); };

/* ---------------- sandbox tools ---------------- */
UI.sbCom = "oil"; UI.sbEvent = D.worldEvents[0].id;
P.sandbox = () => {
  const w = UI.w, sb = (act, key, v) => `<button data-act="${act}" ${v !== undefined ? `data-v="${v}"` : ""}>${t(key)}</button>`;
  return `<div class="note">${t("sb.note")}</div>
  ${card(t("sb.time"), `<div class="btn-row">${sb("sbAdv", "sb.adv12")}${sb("sbFill", "sb.fill")}</div>`)}
  ${card(t("sb.war"), `<div class="btn-row">${sb("sbWin", "sb.win")}${sb("sbArm", "sb.arm")}${sb("sbHeal", "sb.heal")}</div>`, "sb.warDesc")}
  ${card(t("sb.rel"), `<div class="btn-row">${sb("sbRel", "sb.relFriend", 100)}${sb("sbRel", "sb.relHate", -100)}</div>`)}
  ${card(t("sb.market"), `<div class="row"><span>${t("sb.pick")}</span>${sel(E.CIDS.map(c => [c, t("c." + c)]), UI.sbCom, 'data-chg="sbcom"')}</div><div class="btn-row" style="margin-top:8px">${sb("sbPrice", "sb.cheap", .5)}${sb("sbPrice", "sb.dear", 2)}${sb("sbPrice", "sb.reset", 0)}${sb("sbClear", "sb.clearShocks")}</div><div class="sep"></div><div class="row"><span>${t("sb.event")}</span>${sel(D.worldEvents.map(e => [e.id, T.tx(e.title)]), UI.sbEvent, 'data-chg="sbevent"')}</div><div class="btn-row" style="margin-top:8px">${sb("sbEvent", "sb.fire")}</div>`)}`;
};
Object.assign(UI.act, {
  sbAdv: async () => { for (let i = 0; i < 12; i++) { UI.w.events.filter(e => !e.resolved).forEach(e => E.resolveEvent(UI.w, e.id, 0)); E.advance(UI.w); } UI.toast(t("sb.done")); A.play("turn"); UI.render(); UI.saveSilently(); },
  sbFill: () => { E.sandboxFill(UI.w, true); UI.toast(t("sb.done")); UI.render(); },
  sbWin: () => { const n = X.sandboxWin(UI.w); UI.toast(n ? t("sb.done") : t("msg.mil.noWar"), !n); UI.render(); UI.saveSilently(); },
  sbArm: () => { X.sandboxArm(UI.w); UI.toast(t("sb.done")); UI.render(); UI.saveSilently(); },
  sbHeal: () => { X.sandboxHeal(UI.w); UI.toast(t("sb.done")); UI.render(); },
  sbRel: el => { UI.w.countries.forEach(c => { c.relation = +el.dataset.v; c.baseRel = +el.dataset.v; }); UI.toast(t("sb.done")); UI.render(); },
  sbPrice: el => { const M2 = UI.w.market, c = UI.sbCom, f = +el.dataset.v; M2.prices[c] = f ? Math.max(D.commodities[c].base * .35, Math.min(D.commodities[c].base * 3.5, M2.prices[c] * f)) : D.commodities[c].base; (M2.hist[c] = M2.hist[c] || []).push(M2.prices[c]); UI.render(); },
  sbClear: () => { UI.w.market.shocks = []; UI.toast(t("sb.done")); UI.render(); },
  sbEvent: () => { const ev = D.worldEvents.find(e => e.id === UI.sbEvent); if (!ev) return; E.pushEvent(UI.w, { key: "w_" + ev.id, type: "World", title: ev.title, description: ev.text, choices: ev.choices }); if (ev.market) E.addShock(UI.w, { ...ev.market, title: ev.title, eid: ev.id }); UI.toast(t("sb.done")); A.play("event"); UI.render(); }
});
Object.assign(UI.chg, { sbcom: el => { UI.sbCom = el.value; }, sbevent: el => { UI.sbEvent = el.value; } });
})();
