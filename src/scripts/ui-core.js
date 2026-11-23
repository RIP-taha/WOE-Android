/* WORLD OF EMPIRES — UI core: state, storage, map glue, chrome (top bar, dock, country card, bottom bar) */
(() => {
"use strict";
const E = WOE, D = WOE_DATA, T = I18N, A = WOE_AUDIO, G = WOE_GEO, t = T.t;
const UI = window.UI = { w: null, tab: null, sel: null, com: "oil", layer: "political", mapOpts: { labels: true, cities: true, relief: true, flows: true, builds: true }, panels: {}, act: {}, chg: {}, map: null, speed: 1, playing: false, tutorial: false, bpos: {}, wide: false, newEvents: 0 };
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
Object.assign(UI, { $, $$, esc, clamp });

/* ---------- storage (Electron IPC with a localStorage fallback so it also runs in a browser) ---------- */
const api = () => window.worldAPI;
const summary = d => ({ id: d.id, name: d.name, year: d.currentYear, month: d.currentMonth, country: d.playerCountry?.name || d.playerCountry?.id || "?", countryId: d.playerCountry?.id, scenario: d.scenarioId, sandbox: !!d.sandbox, updatedAt: d.updatedAt });
UI.store = {
  async list() { if (api()) return api().listWorlds(); const o = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("woe.save.")) { try { o.push(summary(JSON.parse(localStorage.getItem(k)))); } catch {} } } return o.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); },
  async save(w) { if (api()) return api().saveWorld(w); localStorage.setItem("woe.save." + w.id, JSON.stringify(w)); },
  async load(id) { if (api()) return api().loadWorld(id); const s = localStorage.getItem("woe.save." + id); if (!s) throw new Error("Save not found"); return JSON.parse(s); },
  async del(id) { if (api()) return api().deleteWorld(id); localStorage.removeItem("woe.save." + id); },
  async mods() { if (api() && api().listMods) return api().listMods(); try { return JSON.parse(localStorage.getItem("woe.mods") || "[]"); } catch { return []; } }
};

/* ---------- helpers for panels ---------- */
UI.metric = (label, value, sub, cls) => `<div class="metric"><small>${esc(label)}</small><b class="${cls || ""}">${value}</b>${sub ? `<i>${sub}</i>` : ""}</div>`;
UI.bar = (label, v, cls, text) => `<div class="bar-row"><div class="top"><span>${esc(label)}</span><span>${text ?? T.num(v, 0)}</span></div><div class="bar ${cls || (v < 30 ? "bad" : v < 55 ? "warn" : "")}"><i style="width:${clamp(v, 0, 100)}%"></i></div></div>`;
UI.row = (a, b) => `<div class="row"><span>${a}</span><b>${b}</b></div>`;
UI.spark = (vals, base, color, w = 360, h = 120) => {
  if (!vals || vals.length < 2) return "";
  const lo = Math.min(...vals, base) * .97, hi = Math.max(...vals, base) * 1.03, X = i => 6 + i / (vals.length - 1) * (w - 12), Y = v => h - 16 - (v - lo) / Math.max(1e-9, hi - lo) * (h - 28);
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="6" x2="${w - 6}" y1="${Y(base).toFixed(1)}" y2="${Y(base).toFixed(1)}" stroke="rgba(217,164,65,.5)" stroke-dasharray="4 4" stroke-width="1"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/><polygon points="${X(0)},${h - 16} ${pts} ${X(vals.length - 1)},${h - 16}" fill="${color}" opacity=".12" stroke="none"/></svg>`;
};
UI.cname = id => T.cname(id);
UI.bname = key => { const d = D.buildings[key]; if (d) return t("b." + key); const spec = UI.w && E.getCfg(UI.w).newB[key]; return spec ? T.tx(spec.name) : key; };
T.ctx.bname = UI.bname;
UI.logText = h => h.k ? t(h.k, h.p) : [h.title, h.description].filter(Boolean).join(" — ");
UI.me = () => UI.w.playerCountry;
UI.node = id => E.nodeById(UI.w, id);

/* ---------- toast & modal ---------- */
UI.toast = (msg, err) => {
  const box = $("#toasts"); while (box.children.length > 3) box.firstChild.remove();
  const d = document.createElement("div"); d.className = "toast" + (err ? " err" : ""); d.textContent = msg; box.appendChild(d);
  setTimeout(() => { d.classList.add("out"); setTimeout(() => d.remove(), 360); }, err ? 4200 : 2800);
};
UI.say = r => { if (!r) return; UI.toast(t(r.key, r.p), !r.ok); A.play(r.ok ? "success" : "error"); };
UI.modal = (html, onMount, cls) => {
  UI.closeModal(); const back = document.createElement("div"); back.className = "modal-back"; back.innerHTML = `<div class="modal ${cls || ""}" role="dialog" aria-modal="true">${html}</div>`;
  back.addEventListener("pointerdown", e => { if (e.target === back) UI.closeModal(); }); $("#modalRoot").appendChild(back); A.play("open"); onMount && onMount(back.firstElementChild); return back.firstElementChild;
};
UI.closeModal = () => { const m = $("#modalRoot .modal-back"); if (m) { m.remove(); } };

/* ---------- colours for map layers ---------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ramp = (stops, x) => { x = clamp(x, 0, 1); const n = stops.length - 1, i = Math.min(n - 1, Math.floor(x * n)), f = x * n - i, a = hex(stops[i]), b = hex(stops[i + 1]); return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`; };
const RAMPS = { gdp: ["#1c2b38", "#3c4f58", "#8f8350", "#e0b14f", "#ffe29a"], pc: ["#16293a", "#1f4a6b", "#2f7fa8", "#69c0d8", "#c5f1f4"], stab: ["#a8392e", "#c98a38", "#8c9a4e", "#3da07a", "#2bd0a0"], tech: ["#1d2438", "#3a3f78", "#6a58b8", "#a68ff0", "#e0d4ff"], rel: ["#c4443a", "#6b5a58", "#3c4a52", "#3f8f74", "#32d29c"], bal: ["#d9503f", "#6e4a47", "#2b3a45", "#3a8a70", "#34d4a2"] };
const BLOC_RGB = { west: "rgba(79,140,255,.55)", east: "rgba(226,88,77,.55)", neutral: "rgba(83,194,139,.5)" };
function nodeVal(n, layer) {
  const w = UI.w, M = w.market, c = UI.com;
  switch (layer) {
    case "gdp": return (Math.log10(n.gdp) - 9.3) / 4.15;
    case "gdppc": return (Math.log10(n.gdp / n.pop) - 2.7) / 2.4;
    case "stability": return n.stability / 100; case "tech": return n.technology / 100;
    case "relations": return (n.relation + 100) / 200;
    case "tradebal": return .5 + clamp(n.tb * 12 / n.gdp, -.06, .06) / .12;
    case "prod": return Math.sqrt(n.prod[c] / M.sd[c].S * 6);
    case "net": return .5 + clamp((n.prod[c] - n.cons[c]) / Math.max(1e-9, n.cons[c]), -1, 1) / 2;
  }
  return 0;
}
UI.fill = id => {
  const w = UI.w; if (!w) return "#233443"; const n = E.nodeById(w, id); if (!n) return "#2a3a47"; const mine = id === w.playerCountry.id, L = UI.layer;
  if (L === "political") return mine ? "rgba(70,194,174,.78)" : BLOC_RGB[n.bloc] || BLOC_RGB.neutral;
  const v = nodeVal(n, L); let col;
  if (L === "gdp") col = ramp(RAMPS.gdp, v); else if (L === "gdppc") col = ramp(RAMPS.pc, v); else if (L === "stability") col = ramp(RAMPS.stab, v); else if (L === "tech") col = ramp(RAMPS.tech, v);
  else if (L === "relations") col = mine ? "#46c2ae" : ramp(RAMPS.rel, v); else if (L === "tradebal" || L === "net") col = ramp(RAMPS.bal, v);
  else if (L === "prod") { const k = D.commodities[UI.com].color, c = hex(k), a = .12 + clamp(v, 0, 1) * .8; col = `rgba(${c.join(",")},${a.toFixed(2)})`; }
  return col;
};
const LAYERS = ["political", "relations", "gdp", "gdppc", "stability", "tech", "tradebal", "prod", "net"];
UI.layers = LAYERS;
UI.legend = () => {
  const L = UI.layer, c = D.commodities[UI.com];
  if (L === "political") return `<div class="legend-dot"><span class="dot" style="background:#46c2ae"></span>${t("map.you")}</div>` + Object.entries(D.blocs).map(([k, b]) => `<div class="legend-dot"><span class="dot" style="background:${b.color}"></span>${T.tx(b)}</div>`).join("");
  const stops = { relations: RAMPS.rel, gdp: RAMPS.gdp, gdppc: RAMPS.pc, stability: RAMPS.stab, tech: RAMPS.tech, tradebal: RAMPS.bal, net: RAMPS.bal, prod: ["#1c2b38", c.color] }[L];
  const lbl = { relations: ["lg.hostile", "lg.friendly"], gdp: ["lg.small", "lg.large"], gdppc: ["lg.poorer", "lg.richer"], stability: ["lg.fragile", "lg.stable"], tech: ["lg.low", "lg.high"], tradebal: ["lg.deficit", "lg.surplus"], net: ["lg.importer", "lg.exporter"], prod: ["lg.none", "lg.major"] }[L];
  return `<b>${t("layer." + L)}${L === "prod" || L === "net" ? " · " + t("c." + UI.com) : ""}</b><div class="legend-bar" style="background:linear-gradient(90deg,${stops.join(",")})"></div><div class="legend-lbl"><span>${t(lbl[0])}</span><span>${t(lbl[1])}</span></div>`;
};
UI.layerValue = id => {
  const n = UI.node(id); if (!n) return ""; const L = UI.layer, M = UI.w.market, c = UI.com;
  switch (L) {
    case "gdp": return T.money(n.gdp); case "gdppc": return T.money(n.gdp / n.pop); case "stability": return T.pct(n.stability); case "tech": return T.pct(n.technology);
    case "relations": return id === UI.w.playerCountry.id ? t("map.you") : T.num(n.relation); case "tradebal": return T.money(n.tb) + " / " + t("unit.mo");
    case "prod": return T.pct(n.prod[c] / M.sd[c].S * 100, 1); case "net": { const x = n.prod[c] - n.cons[c]; return (x >= 0 ? "+" : "") + T.num(x, Math.abs(x) < 10 ? 2 : Math.abs(x) < 100 ? 1 : 0) + " " + t("u." + c); }
  }
  return t("bloc." + n.bloc);
};

/* ---------- building markers on the player's own territory ---------- */
const mul = a => () => { let tt = (a += 0x6D2B79F5) >>> 0; tt = Math.imul(tt ^ (tt >>> 15), tt | 1); tt ^= tt + Math.imul(tt ^ (tt >>> 7), tt | 61); return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296; };
function ringIn(r, x, y) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function largestRing(id) { const rs = G.countries[id]; if (!rs) return null; let best = rs[0], ba = 0; for (const r of rs) { const xs = r.map(p => p[0]), ys = r.map(p => p[1]), a = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)); if (a > ba) { ba = a; best = r; } } return best; }
function placeBuilding(id, seed) {
  if (UI.bpos[id]) return UI.bpos[id];
  const pid = UI.w.playerCountry.id, ring = largestRing(pid); if (!ring) return [0, 0];
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), R = mul(seed || 1), taken = Object.values(UI.bpos);
  let minD = Math.sqrt((x1 - x0) * (y1 - y0)) / 7, best = null;
  for (let i = 0; i < 160; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0); if (!ringIn(ring, x, y)) continue; best = [x, y]; if (taken.every(p => Math.hypot(p[0] - x, p[1] - y) > minD)) break; if (i % 30 === 29) minD *= .6; }
  return (UI.bpos[id] = best || [(x0 + x1) / 2, (y0 + y1) / 2]);
}
function markers() {
  const P = UI.me(), cfg = E.getCfg(UI.w), out = [];
  for (const b of P.buildings) { const s = D.buildings[b.type] || cfg.newB[b.type]; if (!s) continue; const p = placeBuilding(b.id, b.seed); out.push({ id: b.id, type: b.type, lon: p[0], lat: p[1], color: s.color, icon: s.icon }); }
  for (const q of P.construction) { const s = D.buildings[q.type] || cfg.newB[q.type]; if (!s) continue; const p = placeBuilding(q.id, q.seed); out.push({ id: q.id, type: q.type, lon: p[0], lat: p[1], color: s.color, icon: s.icon, building: true, progress: 1 - q.remaining / q.total }); }
  return out;
}
const CHOKE = { hormuz: ["hormuz"], suezblock: ["suez", "babelmandeb"] };
function flows() {
  const w = UI.w, M = w.market, show = UI.mapOpts.flows && (UI.tab === "market" || ["prod", "net", "tradebal"].includes(UI.layer)), out = [];
  if (show) {
    const c = UI.com, list = (M.top[c] || []).filter(f => f[0] !== "ROW" && f[1] !== "ROW"), max = Math.max(1e-9, ...list.map(f => f[2])), col = D.commodities[c].color;
    list.slice(0, 14).forEach((f, i) => { const a = E.capOf(f[0]), b = E.capOf(f[1]); if (a && b) out.push({ from: a, to: b, w: Math.sqrt(f[2] / max), color: col, ph: (i * .137) % 1 }); });
  }
  if (window.WOE_MIL) for (const war of WOE_MIL.activeWars(w)) { const P = w.playerCountry, mine = [P.id, ...(P.territories || [])], o = mine.reduce((b, x) => E.dist(x, war.enemy) < E.dist(b, war.enemy) ? x : b), a = E.capOf(o), b = E.capOf(war.enemy); if (a && b) out.push({ from: a, to: b, w: .6 + war.progress / 250, color: "#ff5a4d", ph: .3, war: true }); }
  return out;
}
/* ---------- map glue ---------- */
UI.initMap = () => {
  if (UI.map) { UI.map.resize(); return; }
  const tip = $("#tooltip");
  UI.map = new MapView($("#map"), {
    fill: id => UI.fill(id), active: id => id !== "CUS" || (UI.w && UI.w.playerCountry.id === "CUS"), name: id => T.cname(id), cityName: c => T.lang() === "fa" ? c.fa : c.en, onView: () => window.WOE_BUS && WOE_BUS.emit("view"), seaName: s => T.lang() === "fa" ? s.fa : s.en,
    riverName: r => T.lang() === "fa" ? r.fa : r.en, chokeName: c => T.lang() === "fa" ? c.fa : c.en, mine: () => UI.w && UI.w.playerCountry.id, font: () => getComputedStyle(document.body).getPropertyValue("--font-ui") || "Segoe UI",
    onSelect: id => { UI.selectCountry(id, true); },
    onMarker: m => { const s = m.building ? t("tip.underConstruction") : t("tip.operational"); UI.toast(UI.bname(m.type) + " — " + s); A.play("select"); },
    onHover: (id, e, mk) => {
      if (!e) { tip.classList.add("hidden"); return; } const r = $("#mapwrap").getBoundingClientRect();
      if (mk) tip.innerHTML = `<b>${esc(UI.bname(mk.type))}</b><span>${mk.building ? t("tip.underConstruction") : t("tip.operational")}</span>`;
      else if (id) tip.innerHTML = `<b>${esc(T.cname(id))}</b><span>${esc(t("layer." + UI.layer))}: ${esc(UI.layerValue(id))}</span><span>${esc(t("cc.gdp"))}: ${esc(T.money(UI.node(id).gdp))}</span>`; else { tip.classList.add("hidden"); return; }
      tip.classList.remove("hidden"); const x = clamp(e.clientX - r.left + 14, 4, r.width - 250), y = clamp(e.clientY - r.top + 14, 4, r.height - 90); tip.style.left = x + "px"; tip.style.top = y + "px";
    }
  });
  Object.assign(UI.map.opts, UI.mapOpts);
  new MutationObserver(() => {}).observe(document.body, { attributes: true });
};
UI.refreshMap = () => {
  if (!UI.map || !UI.w) return; const m = UI.map; m.opts = { ...m.opts, ...UI.mapOpts };
  m.setMarkers(markers()); m.setFlows(flows()); m.shocks = UI.w.market.shocks.flatMap(s => CHOKE[s.eid] || []); m.sel = UI.sel; m.dirty = true;
  $("#legend").innerHTML = UI.legend();
};

/* ---------- chrome: top bar ---------- */
UI.renderTop = () => {
  const w = UI.w, P = UI.me(), f = P.lastFinance;
  $("#worldTitle").textContent = w.name + (UI.tutorial ? " · " + t("tut.sandbox") : UI.w.sandbox ? " · " + t("home.sandboxTag") : ""); $("#worldDate").textContent = T.date(w.currentYear, w.currentMonth) + " · " + t("bar.turn", { n: w.turn });
  const st = (l, v, cls) => `<div class="stat"><small>${esc(t(l))}</small><b class="${cls || ""}">${v}</b></div>`;
  $("#topStats").innerHTML = st("top.treasury", T.money(P.treasury)) + st("top.gdp", T.money(P.gdp)) + st("top.balance", (f.balance >= 0 ? "+" : "") + T.money(f.balance), f.balance >= 0 ? "up" : "down") + st("top.inflation", T.pct(P.inflation, 1), P.inflation > 10 ? "down" : "") + st("top.approval", T.pct(P.publicSatisfaction, 0), P.publicSatisfaction < 35 ? "down" : "") + st("top.pop", T.big(P.pop));
  const sound = A.state(); $("#btnTopSound").classList.toggle("on", !sound.mute); $("#btnTopLang").textContent = T.lang() === "fa" ? "EN" : "فارسی";
};
/* ---------- dock ---------- */
const TABS = ["overview", "economy", "construction", "market", "population", "infrastructure", "diplomacy", "politics", "research", "security", "military", "environment", "regions", "-", "events", "scenario", "mods", "reports", "sandbox", "settings"];
const ICONS = { overview: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", economy: "M4 19V5m0 14h16M8 15l3-4 3 2 5-7", construction: "M4 20V9l5-4v15M9 20V6l7 3v11M3 20h18", market: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18", population: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 100-5M17 15c2.5 0 4 1.7 4 4", infrastructure: "M8 3L4 21M16 3l4 18M12 4v3m0 4v3m0 4v3", diplomacy: "M5 21V4m0 0h11l-2 4 2 4H5", politics: "M3 9l9-5 9 5H3zM5 9v8m5-8v8m4-8v8m5-8v8M3 20h18", research: "M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3", security: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z", military: "M5 19l9-9M14 6l4-2 2 2-2 4-4-4M4 16l4 4M3 21l3-3M17 14l3 3M15 16l3 3", environment: "M5 19c0-8 5-14 15-14 0 10-5 15-13 15M5 19l8-8", regions: "M12 21s-7-6-7-11a7 7 0 1114 0c0 5-7 11-7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z", events: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0", scenario: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z", sandbox: "M4 20h16M6 20l2-9h8l2 9M9 11V6h6v5M12 3v3",
 mods: "M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8", reports: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7", settings: "M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" };
UI.tabs = TABS;
UI.renderDock = () => {
  const open = UI.w.events.filter(e => !e.resolved).length;
  $("#dock").innerHTML = TABS.filter(k => k !== "sandbox" || UI.w.sandbox).map(k => k === "-" ? '<div class="dock-sep"></div>' : `<button class="dock-btn ${UI.tab === k ? "active" : ""}" data-act="tab" data-v="${k}" data-tip="${esc(t("nav." + k))}" data-tab="${k}" aria-label="${esc(t("nav." + k))}"><svg viewBox="0 0 24 24"><path d="${ICONS[k]}"/></svg>${k === "events" && open ? `<span class="badge">${open}</span>` : ""}</button>`).join("");
};
/* ---------- panel ---------- */
UI.openTab = (k, quiet) => {
  const panel = $("#panel"), same = UI.tab === k && panel.classList.contains("open");
  if (same) { UI.closePanel(); return; }
  UI.tab = k; panel.classList.add("open"); document.documentElement.style.setProperty("--pw", getComputedStyle(document.documentElement).getPropertyValue(UI.wide ? "--pwwide" : "--pwfull") || "440px");
  setWidth(); if (!quiet) A.play("open"); UI.renderPanel(true);
  if (k === "market" && UI.map && UI.map.t.k > UI.map.kMin * 2.4) { setTimeout(() => { UI.map.t = { cx: 0.2, cy: .2, k: UI.map.kMin * 1.35 }; UI.map.limit(); UI.map.dirty = true; }, 450); } UI.renderDock(); UI.refreshMap(); window.WOE_BUS && WOE_BUS.emit("tab", k);
};
function setWidth() { const full = UI.wide ? Math.min(760, Math.round(window.innerWidth * .52)) : 440; const root = document.documentElement.style; root.setProperty("--pwfull", full + "px"); root.setProperty("--pw", $("#panel").classList.contains("open") ? full + "px" : "0px"); $("#panel").classList.toggle("wide", UI.wide); }
UI.closePanel = () => { $("#panel").classList.remove("open"); document.documentElement.style.setProperty("--pw", "0px"); UI.tab = null; A.play("close"); UI.renderDock(); UI.refreshMap(); setTimeout(() => UI.map && UI.map.resize(), 520); };
UI.toggleWide = () => { UI.wide = !UI.wide; setWidth(); A.play("click"); UI.renderPanel(); setTimeout(() => UI.map && UI.map.resize(), 520); };
UI.renderPanel = fresh => {
  if (!UI.tab || !UI.panels[UI.tab]) return; const body = $("#panelBody"), top = body.scrollTop, fn = UI.panels[UI.tab];
  $("#panelEyebrow").textContent = t("panel.eyebrow"); $("#panelTitle").textContent = t("nav." + UI.tab);
  body.classList.toggle("still", !fresh); body.innerHTML = `<div class="${UI.wide ? "wide" : ""}">${fn()}</div>`; if (!fresh) body.scrollTop = top; else body.scrollTop = 0;
  $("#panelBody > div").style.cssText = "animation:none"; if (fresh) { $("#panelBody > div").style.cssText = ""; }
  UI.$$("[data-i]", body).forEach(el => el.textContent = t(el.dataset.i));
  const ro = new ResizeObserver(() => { UI.map && UI.map.resize(); ro.disconnect(); }); ro.observe($("#mapwrap"));
};

/* ---------- layer bar, options, country card ---------- */
UI.renderLayerBar = () => {
  const showCom = ["prod", "net"].includes(UI.layer);
  $("#layerBar").innerHTML = `<label class="pill-select"><span>${t("map.layer")}</span><select id="selLayer">${LAYERS.map(l => `<option value="${l}" ${UI.layer === l ? "selected" : ""}>${esc(t("layer." + l))}</option>`).join("")}</select></label>` +
    (showCom || UI.tab === "market" ? `<label class="pill-select"><span>${t("map.commodity")}</span><select id="selCom">${E.CIDS.map(c => `<option value="${c}" ${UI.com === c ? "selected" : ""}>${esc(t("c." + c))}</option>`).join("")}</select></label>` : "");
};
UI.renderMapOpts = () => {
  const o = UI.mapOpts; $("#mapOpts").innerHTML = ["labels", "cities", "relief", "flows", "builds"].map(k => `<label class="switch"><span>${t("mo." + k)}</span><span class="tg"><input type="checkbox" data-chg="mapopt" data-v="${k}" ${o[k] ? "checked" : ""}><i></i></span></label>`).join("");
};
UI.selectCountry = (id, fromMap) => {
  UI.sel = id; if (UI.map) UI.map.select(id); UI.renderCountryCard(); if (id) { A.play("select"); window.WOE_BUS && WOE_BUS.emit("select", id); } UI.refreshMap();
};
UI.renderCountryCard = () => {
  const card = $("#countryCard"), id = UI.sel; if (!id || !UI.w) { card.classList.add("hidden"); return; }
  const w = UI.w, n = UI.node(id); if (!n) { card.classList.add("hidden"); return; }
  const P = w.playerCountry, mine = id === P.id || (P.territories || []).includes(id), prof = D.countries[id] || D.ROW, T2 = P.trade;
  const gov = mine ? (D.gov[P.government] ? T.tx(D.gov[P.government]) : "") : (D.gov[prof.gov] ? T.tx(D.gov[prof.gov]) : "");
  const top = (obj, n2) => Object.entries(obj).filter(([, v]) => v > 1e-6).map(([c, v]) => [c, v * w.market.prices[c] * D.commodities[c].vm * 1e6]).sort((a, b) => b[1] - a[1]).slice(0, n2).map(([c, v]) => `<span class="tag">${esc(t("c." + c))} ${T.money(v)}</span>`).join("") || `<span class="mini">—</span>`;
  const rel = !mine ? `<div class="row"><span>${t("cc.rel")}</span><b class="${n.relation >= 0 ? "up" : "down"}">${T.num(n.relation)}</b></div>` : "";
  const flags = !mine ? (T2.pacts.includes(id) ? `<span class="tag teal">${t("cc.pact")}</span>` : "") + (T2.embargo.includes(id) ? `<span class="tag red">${t("cc.embargo")}</span>` : "") + ((P.researchPartners || []).includes(id) ? `<span class="tag blue">${t("cc.rpartner")}</span>` : "") : `<span class="tag gold">${t(id === P.id ? "cc.yours" : "cc.annexed")}</span>`;
  const acts = mine ? `<div class="btn-row"><button data-act="tab" data-v="overview">${t("nav.overview")}</button><button data-act="tab" data-v="construction">${t("nav.construction")}</button><button data-act="tab" data-v="market">${t("nav.market")}</button></div>` :
    id === "ROW" ? "" : `<div class="btn-grid"><button data-act="dip" data-a="summit" data-id="${id}">${t("dipa.summit")}</button><button data-act="dip" data-a="trade" data-id="${id}">${t("dipa.trade")}</button><button data-act="dip" data-a="research" data-id="${id}">${t("dipa.research")}</button><button data-act="dip" data-a="aid" data-id="${id}">${t("dipa.aid")}</button><button data-act="dip" data-a="embargo" data-id="${id}" class="${T2.embargo.includes(id) ? "on" : ""}">${T2.embargo.includes(id) ? t("dipa.lift") : t("dipa.embargo")}</button></div>`;
  card.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><p class="eyebrow">${esc(t("bloc." + n.bloc))}</p><h3 style="font-size:20px;margin:2px 0 6px">${esc(T.cname(id))}</h3></div><button class="icon-btn sm" data-act="closeCard" aria-label="${esc(t("panel.close"))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div style="margin-bottom:8px">${flags}</div>` +
    (gov ? UI.row(t("cc.gov"), esc(gov)) : "") + UI.row(t("cc.pop"), T.big(n.pop)) + UI.row(t("cc.gdp"), T.money(n.gdp)) + UI.row(t("cc.gdppc"), T.money(n.gdp / n.pop)) + UI.row(t("cc.stab"), T.pct(n.stability)) + UI.row(t("cc.tech"), T.pct(n.technology)) + rel + UI.row(t("cc.tradebal"), `<span class="${n.tb >= 0 ? "up" : "down"}">${T.money(n.tb)}</span>`) +
    (window.WOE_MIL && !mine && w.countries.some(c => c.id === id) ? `<div class="sep"></div>` + UI.row(t("mil.rating"), T.num(WOE_MIL.rating(w, id))) + UI.row(t("mil.troops"), T.big(WOE_MIL.milOf(w, id).troops)) + UI.row(t("mil.ad"), T.pct(WOE_MIL.milOf(w, id).ad)) + (WOE_MIL.warOf(w, id) ? `<span class="tag red">⚔ ${t("cc.war")}</span>` : "") : "") +
    `<div class="sep"></div><p class="mini" style="margin-bottom:4px">${t("cc.exports")}</p><div style="margin-bottom:8px">${top(n.exp, 3)}</div><p class="mini" style="margin-bottom:4px">${t("cc.imports")}</p><div style="margin-bottom:12px">${top(n.imp, 3)}</div>${acts}<div class="btn-row" style="margin-top:8px"><button data-act="focus" data-id="${id}" class="ghost">${t("cc.focus")}</button>${window.WOE_MIL && !mine && w.countries.some(c => c.id === id) ? `<button data-act="milPlan" data-id="${id}" class="ghost">⚔ ${t("cc.plan")}</button>` : ""}</div>`;
  card.classList.remove("hidden");
  const cs0 = UI.map && UI.map.cs[id]; if (cs0) { const sx = UI.map.toScreen(cs0.c[0], cs0.c[1])[0]; card.classList.toggle("left", sx > UI.map.W * .55); }
};
/* ---------- bottom bar ---------- */
UI.renderBottom = () => {
  const w = UI.w, last = w.history[w.history.length - 1], pend = w.events.filter(e => !e.resolved).length;
  $("#ticker").innerHTML = (pend ? `<b style="color:var(--brass2)">⚑ ${t("bar.pending", { n: pend })}</b> · ` : "") + (last ? esc(UI.logText(last)) : "");
  $$("#speedSeg button").forEach(b => b.classList.toggle("on", +b.dataset.speed === UI.speed));
  $("#playIcon").setAttribute("d", UI.playing ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z");
  $("#btnPlay").classList.toggle("on", UI.playing);
};
UI.render = () => { if (!UI.w) return; UI.renderTop(); UI.renderDock(); UI.renderPanel(); UI.renderBottom(); UI.renderLayerBar(); UI.renderMapOpts(); UI.renderCountryCard(); UI.refreshMap(); };

/* ---------- time ---------- */
UI.saveSilently = async () => { if (UI.tutorial || !UI.w) return false; try { UI.w.updatedAt = new Date().toISOString(); await UI.store.save(UI.w); return true; } catch (e) { UI.toast(t("msg.saveFail") + " " + (e.message || ""), true); return false; } };
UI.advance = async () => {
  if (UI.busy || !UI.w) return; UI.busy = true;
  try {
    const before = UI.w.events.filter(e => !e.resolved).length; const r = E.advance(UI.w); A.play("turn");
    const after = UI.w.events.filter(e => !e.resolved).length;
    if (after > before) { A.play("event"); UI.toast(t("msg.newEvent")); if (UI.playing) UI.stop(); }
    else if (r.shortage) UI.toast(t("msg.shortage", { c: r.short.slice(0, 3).map(c => t("c." + c)).join(", ") }), true);
    (UI.w.turnNotes || []).slice(0, 3).forEach(n => UI.toast(t(n.key, n.p), n.err));
    const w = UI.w; w.objectives.forEach(o => { if (o.state === "done" && !o.announced) { o.announced = true; UI.toast(t("msg.objDone", { ot: o.type })); A.play("success"); } if (o.state === "failed" && !o.announced) { o.announced = true; UI.toast(t("msg.objFail", { ot: o.type }), true); } });
    if (w.status.won && !w.status.announced) { w.status.announced = true; UI.modal(`<p class="eyebrow">${t("vic.eyebrow")}</p><h2>${t("vic.title")}</h2><p class="desc">${t("vic.text")}</p><div class="actions"><button class="primary" data-act="closeModal">${t("vic.continue")}</button></div>`); A.play("success"); }
    UI.render(); window.WOE_BUS && WOE_BUS.emit("advance");
    if (!UI.tutorial && UI.w.settings.autosave) UI.saveSilently();
  } catch (e) { console.error(e); UI.toast(t("msg.error") + " " + e.message, true); UI.stop(); }
  UI.busy = false;
};
UI.play = () => { if (UI.playing) return; if (UI.w.events.some(e => !e.resolved)) { UI.toast(t("msg.decisionFirst"), true); return; } UI.playing = true; UI.renderBottom(); const tick = async () => { if (!UI.playing) return; await UI.advance(); if (UI.playing) UI.timer = setTimeout(tick, 2200 / UI.speed); }; UI.timer = setTimeout(tick, 400); };
UI.stop = () => { UI.playing = false; clearTimeout(UI.timer); if (UI.w) UI.renderBottom(); };
UI.setSpeed = s => { UI.speed = s; if (UI.w) UI.renderBottom(); };

/* ---------- tiny event bus (used by the interactive tutorial) ---------- */
window.WOE_BUS = { h: {}, on(n, f) { (this.h[n] = this.h[n] || []).push(f); return () => { this.h[n] = this.h[n].filter(x => x !== f); }; }, emit(n, d) { (this.h[n] || []).slice().forEach(f => { try { f(d); } catch (e) { console.error(e); } }); } };

/* ---------- delegated actions ---------- */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el || el.disabled) return; const a = el.dataset.act;
  if (UI.act[a]) { if (!["tab", "closePanel"].includes(a)) A.play("click"); UI.act[a](el, e); window.WOE_BUS.emit("act", a); }
});
document.addEventListener("change", e => { const el = e.target.closest("[data-chg]"); if (el && UI.chg[el.dataset.chg]) { A.play("click"); UI.chg[el.dataset.chg](el, e); window.WOE_BUS.emit("chg", el.dataset.chg); } });
document.addEventListener("input", e => { const el = e.target.closest("[data-inp]"); if (el && UI.chg[el.dataset.inp]) UI.chg[el.dataset.inp](el, e); });
Object.assign(UI.act, {
  milPlan: el => { UI.milTarget = el.dataset.id; UI.milTab = "war"; if (UI.tab === "military") UI.renderPanel(true); else UI.openTab("military"); },
  tab: el => UI.openTab(el.dataset.v), closePanel: () => UI.closePanel(), closeCard: () => { UI.selectCountry(null); }, closeModal: () => UI.closeModal(),
  focus: el => { UI.map.focus(el.dataset.id); }, setLayerPick: el => { UI.layer = el.dataset.v; UI.render(); },
  dip: el => { const r = E.diplomacy(UI.w, el.dataset.id, el.dataset.a); UI.say(r); if (r.ok) { UI.render(); UI.saveSilently(); } },
});
UI.chg.mapopt = el => { UI.mapOpts[el.dataset.v] = el.checked; UI.refreshMap(); };
document.addEventListener("change", e => {
  if (e.target.id === "selLayer") { UI.layer = e.target.value; UI.renderLayerBar(); UI.refreshMap(); UI.renderCountryCard(); window.WOE_BUS.emit("layer", UI.layer); }
  if (e.target.id === "selCom") { UI.com = e.target.value; UI.renderLayerBar(); UI.refreshMap(); UI.renderPanel(); }
});
})();
