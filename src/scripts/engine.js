/* WORLD OF EMPIRES — offline simulation core (seeded RNG, global market, scenarios, mods) */
(() => {
"use strict";
const D = window.WOE_DATA;
const CIDS = Object.keys(D.commodities);
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
const rid = () => Math.random().toString(36).slice(2, 10);
const VERSION = "1.2.0-beta";

/* ---------- seeded RNG (state lives in the save) ---------- */
function rnd(w) { let t = (w.rng = (w.rng + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

/* ---------- static baseline: who produces / consumes what ---------- */
const profs = Object.entries(D.countries).map(([id, p]) => ({ id, ...p }));
const sumG = profs.reduce((a, p) => a + p.gdp, 0), sumP = profs.reduce((a, p) => a + p.pop, 0);
D.ROW.gdp = Math.max(8000, 112000 - sumG); D.ROW.pop = Math.max(500, 8200 - sumP);
const allProfs = [...profs, { id: "ROW", ...D.ROW }];
const totG = allProfs.reduce((a, p) => a + p.gdp, 0), totP = allProfs.reduce((a, p) => a + p.pop, 0);
const CHN_MULT = { oil: 1.1, gas: 1, coal: 5, grain: 1, steel: 4.5, copper: 6.5, lithium: 3, rare: 4, chips: 2.2 };
const baseline = { prod0: {}, cons0: {} };
for (const p of allProfs) { baseline.prod0[p.id] = {}; baseline.cons0[p.id] = {}; }
for (const c of CIDS) {
  const com = D.commodities[c];
  const w = allProfs.map(p => {
    const gs = p.gdp / totG, ps = p.pop / totP;
    let v = com.cons === "pop" ? .15 * gs + .85 * ps : com.cons === "tech" ? gs * (p.tech / 60) : .6 * gs + .4 * ps;
    if (p.id === "CHN") v *= CHN_MULT[c] || 1;
    if (p.id === "IND" && (c === "coal" || c === "steel")) v *= 1.3;
    return v;
  });
  const ws = w.reduce((a, b) => a + b, 0);
  const listed = Object.values(D.prod[c]).reduce((a, b) => a + b, 0);
  const rowShare = Math.max(3, 100 - listed);
  const tot = listed + rowShare;
  allProfs.forEach((p, i) => {
    baseline.cons0[p.id][c] = (w[i] / ws) * com.vol;
    const share = p.id === "ROW" ? rowShare : (D.prod[c][p.id] || 0);
    baseline.prod0[p.id][c] = (share / tot) * com.vol;
  });
}
const SELF = { oil: .6, gas: .5, coal: .9, grain: 1, steel: .5, copper: .3, lithium: .2, rare: .1, chips: .15 }; // custom island nation
const CUS_PROF = { id: "CUS", pop: 18.4, gdp: 72, g: 2.6, tech: 46, stab: 64, dev: 58, bloc: "neutral", gov: "republic", cap: [-21.5, -20.5] };
const capOf = id => id === "CUS" ? CUS_PROF.cap : (D.countries[id] ? D.countries[id].cap : null);
const distCache = {};
function dist(a, b) {
  if (a === b) return 0;
  const k = a < b ? a + b : b + a; if (distCache[k] !== undefined) return distCache[k];
  const A = capOf(a), B = capOf(b); let d = 6000;
  if (A && B) { const r = Math.PI / 180, dl = (B[0] - A[0]) * r, la = A[1] * r, lb = B[1] * r; d = 6371 * Math.acos(Math.min(1, Math.sin(la) * Math.sin(lb) + Math.cos(la) * Math.cos(lb) * Math.cos(dl))); }
  return (distCache[k] = d);
}
const hashStr = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

/* ---------- mods ---------- */
let userMods = [], regVersion = 1;
const EFFECT_KEYS = ["treasury", "gdp", "debt", "inflation", "energy", "food", "freshwater", "rawMaterials", "satisfaction", "stability", "education", "health", "infrastructure", "technology", "environment", "defense", "internet", "foodSecurity", "relationAll", "stockBuy", "stockRelease", "relationBloc", "relation"];
const BUILD_EFFECTS = ["energy", "education", "health", "industry", "infrastructure", "water", "internet", "extraction", "mining", "agri", "port"];
const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? clamp(v, lo, hi) : d; };
const bil = v => (typeof v === "string" ? { en: v.slice(0, 120), fa: v.slice(0, 120) } : v && typeof v === "object" ? { en: String(v.en || v.fa || "").slice(0, 160), fa: String(v.fa || v.en || "").slice(0, 160) } : { en: "", fa: "" });
function validateMod(m) {
  const errors = [];
  if (!m || typeof m !== "object") return { ok: false, errors: ["not an object"] };
  const id = String(m.id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  if (!id) errors.push("missing id");
  const out = { id, version: String(m.version || "1.0").slice(0, 12), author: String(m.author || "").slice(0, 40), name: bil(m.name || id), description: bil(m.description || ""), builtin: !!m.builtin };
  if (m.countries) { out.countries = {}; for (const [k, v] of Object.entries(m.countries)) if (D.countries[k] && v) out.countries[k] = { growth: num(v.growth, -6, 6, 0), gdpMult: num(v.gdpMult, .3, 3, 1), popMult: num(v.popMult, .3, 3, 1), stability: num(v.stability, -30, 30, 0), tech: num(v.tech, -30, 30, 0) }; }
  if (m.production) { out.production = {}; for (const [k, v] of Object.entries(m.production)) if (k === "*" || D.countries[k]) { out.production[k] = {}; for (const [c, x] of Object.entries(v || {})) if (c === "*" || D.commodities[c]) out.production[k][c] = num(x, .1, 3, 1); } }
  if (m.commodities) { out.commodities = {}; for (const [c, v] of Object.entries(m.commodities)) if (D.commodities[c] && v) out.commodities[c] = { demandTrend: num(v.demandTrend, -.01, .01, 0), startMult: num(v.startMult, .3, 3, 1) }; }
  if (m.buildings) { out.buildings = {}; for (const [k, v] of Object.entries(m.buildings)) if ((k === "*" || D.buildings[k] || (m.newBuildings && m.newBuildings[k])) && v) out.buildings[k] = { costMult: num(v.costMult, .1, 5, 1), monthsAdd: num(v.monthsAdd, -2, 6, 0) }; }
  if (m.newBuildings) { out.newBuildings = {}; for (const [k, v] of Object.entries(m.newBuildings)) { const key = String(k).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24); if (!key || D.buildings[key] || !v) continue; out.newBuildings[key] = { cost: num(v.cost, .1, 20, 1), materials: num(v.materials, 0, 20, 3), months: Math.round(num(v.months, 1, 24, 3)), effect: BUILD_EFFECTS.includes(v.effect) ? v.effect : "infrastructure", icon: String(v.icon || "■").slice(0, 2), color: /^#[0-9a-f]{6}$/i.test(v.color || "") ? v.color : "#9fb4c7", name: bil(v.name || key), desc: bil(v.desc || "") }; } }
  if (m.rules) { const r = m.rules; out.rules = {}; ["tariffBase", "globalGrowthAdd", "inflationDrift", "researchCostMult", "envDrift", "priceNoise", "relationDrift"].forEach(k => { if (r[k] !== undefined) out.rules[k] = num(r[k], k === "tariffBase" ? 0 : -5, k === "tariffBase" ? 80 : 5, 0); }); }
  if (Array.isArray(m.events)) out.events = m.events.slice(0, 12).map((e, i) => ({ id: String(e.id || "e" + i).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24), title: bil(e.title), text: bil(e.text || e.description), every: Math.round(num(e.every, 2, 60, 12)), market: e.market && D.commodities[e.market.c] || (e.market && e.market.c === "all") ? { c: e.market.c, kind: e.market.kind === "demand" ? "demand" : "supply", mult: num(e.market.mult, .4, 2, 1), months: Math.round(num(e.market.months, 1, 36, 4)), src: e.market.src && D.countries[e.market.src] ? e.market.src : "GLOBAL" } : null,
    choices: (Array.isArray(e.choices) ? e.choices : []).slice(0, 4).map(ch => ({ label: bil(ch.label), effects: Object.fromEntries(Object.entries(ch.effects || {}).filter(([k]) => EFFECT_KEYS.includes(k) && !["stockBuy", "stockRelease", "relationBloc"].includes(k)).map(([k, v]) => [k, num(v, -10, 10, 0)])) })) })).filter(e => e.choices.length && (e.title.en || e.title.fa));
  return { ok: errors.length === 0, errors, mod: out };
}
function setUserMods(list) { userMods = []; for (const m of list || []) { const v = validateMod(m); if (v.ok) userMods.push(v.mod); } regVersion++; return userMods.length; }
const allMods = () => [...D.builtinMods.map(m => validateMod(m).mod), ...userMods.filter(u => !D.builtinMods.some(b => b.id === u.id))];
const cfgCache = new Map();
function getCfg(w) {
  const key = w.id + "|" + (w.mods || []).join(",") + "|" + regVersion + "|" + w.scenarioId;
  let cfg = cfgCache.get(key); if (cfg) return cfg;
  const mods = (w.mods || []).map(id => allMods().find(m => m.id === id)).filter(Boolean);
  const sc = D.scenarios[w.scenarioId] || D.scenarios.modern;
  cfg = { mods, rules: { tariffBase: sc.tariff, globalGrowthAdd: 0, inflationDrift: 0, researchCostMult: 1, envDrift: 0, priceNoise: 1, relationDrift: 0 }, trend: {}, bMult: {}, newB: {}, events: [], prodMults: [] };
  for (const m of mods) {
    Object.assign(cfg.rules, m.rules && Object.fromEntries(Object.entries(m.rules).filter(([k]) => !["globalGrowthAdd", "inflationDrift", "researchCostMult", "envDrift", "priceNoise", "relationDrift"].includes(k))));
    for (const k of ["globalGrowthAdd", "inflationDrift", "envDrift", "relationDrift"]) if (m.rules && m.rules[k]) cfg.rules[k] += m.rules[k];
    for (const k of ["researchCostMult", "priceNoise"]) if (m.rules && m.rules[k]) cfg.rules[k] *= m.rules[k];
    for (const [c, v] of Object.entries(m.commodities || {})) cfg.trend[c] = (cfg.trend[c] || 0) + v.demandTrend;
    for (const [k, v] of Object.entries(m.buildings || {})) { const o = (cfg.bMult[k] = cfg.bMult[k] || { costMult: 1, monthsAdd: 0 }); o.costMult *= v.costMult; o.monthsAdd += v.monthsAdd; }
    Object.assign(cfg.newB, m.newBuildings || {});
    if (m.production) cfg.prodMults.push(m.production);
    for (const e of m.events || []) cfg.events.push({ ...e, modId: m.id });
  }
  cfg.prodMult = (c, id) => { let r = 1; for (const pm of cfg.prodMults) { const a = pm[id], b = pm["*"]; if (a) r *= a[c] ?? a["*"] ?? 1; if (b) r *= b[c] ?? b["*"] ?? 1; } return r; };
  cfg.buildingSpec = key => { const base = D.buildings[key] || cfg.newB[key]; if (!base) return null; const m1 = cfg.bMult[key] || { costMult: 1, monthsAdd: 0 }, m2 = cfg.bMult["*"] || { costMult: 1, monthsAdd: 0 }; return { ...base, cost: base.cost * m1.costMult * m2.costMult, months: Math.max(1, Math.round(base.months + m1.monthsAdd + m2.monthsAdd)) }; };
  cfg.buildingKeys = () => [...Object.keys(D.buildings), ...Object.keys(cfg.newB)];
  cfgCache.set(key, cfg); return cfg;
}

/* ---------- helpers ---------- */
const scale = w => clamp(Math.sqrt(w.playerCountry.gdp / 72e9), .5, 25);
const allNodes = w => [w.playerCountry, ...w.countries, w.row];
const nodeById = (w, id) => id === w.playerCountry.id || (w.playerCountry.territories && w.playerCountry.territories.includes(id)) ? w.playerCountry : id === "ROW" ? w.row : w.countries.find(x => x.id === id);
const valueOf = (w, c, units, price) => units * (price ?? w.market.prices[c]) * D.commodities[c].vm * 1e6;
function log(w, k, p = {}) {
  const date = `${w.currentYear}-${String(w.currentMonth).padStart(2, "0")}`;
  w.history.push({ date, k, p }); if (w.history.length > 300) w.history = w.history.slice(-300);
}
const blocF = (a, b) => a === b ? 1 : (a === "neutral" || b === "neutral") ? .8 : .35;

function mkNode(id, prof, mods) {
  const m = (mods || []).reduce((acc, md) => { const v = md.countries && md.countries[id]; if (v) { acc.growth += v.growth; acc.gdp *= v.gdpMult; acc.pop *= v.popMult; acc.stab += v.stability; acc.tech += v.tech; } return acc; }, { growth: 0, gdp: 1, pop: 1, stab: 0, tech: 0 });
  const gdp = prof.gdp * 1e9 * m.gdp;
  const n = { id, pop: prof.pop * 1e6 * m.pop, gdp, gdp0: gdp, treasury: gdp * .12, stability: clamp(prof.stab + m.stab, 5, 98), technology: clamp(prof.tech + m.tech, 5, 99), dev: prof.dev, bloc: prof.bloc, growth: prof.g + m.growth,
    relation: 0, baseRel: 0, tariff: 5, prod0: {}, cons0: {}, prod: {}, cons: {}, imp: {}, exp: {}, cap: {}, tb: 0, tot: 0 };
  const cons = baseline.cons0[id] || baseline.cons0.ROW;
  for (const c of CIDS) {
    const consBase = id === "CUS" ? consFor(c, prof) : cons[c];
    n.cons0[c] = consBase; n.prod0[c] = id === "CUS" ? consBase * SELF[c] : (baseline.prod0[id] || baseline.prod0.ROW)[c]; n.cap[c] = 1;
    n.prod[c] = n.prod0[c]; n.cons[c] = n.cons0[c]; n.imp[c] = 0; n.exp[c] = 0;
  }
  return n;
}
function consFor(c, prof) { const com = D.commodities[c]; const gs = prof.gdp / totG, ps = prof.pop / totP; const v = com.cons === "pop" ? .15 * gs + .85 * ps : com.cons === "tech" ? gs * (prof.tech / 60) : .6 * gs + .4 * ps; const ws = allProfs.reduce((a, p) => a + (com.cons === "pop" ? .15 * p.gdp / totG + .85 * p.pop / totP : com.cons === "tech" ? p.gdp / totG * (p.tech / 60) : .6 * p.gdp / totG + .4 * p.pop / totP), 0); return v / ws * com.vol; }

function relBase(pBloc, n) { return Math.round(blocF(pBloc, n.bloc) === 1 ? 28 : blocF(pBloc, n.bloc) === .8 ? 8 : -22) + ((hashStr(n.id) % 17) - 8); }

/* ---------- world creation ---------- */
function newWorld(opts = {}) {
  const scId = D.scenarios[opts.scenarioId] ? opts.scenarioId : "modern", sc = D.scenarios[scId];
  const mods = (opts.mods || []).filter(id => allMods().some(m => m.id === id));
  const w0 = { id: "world_" + Date.now() + "_" + rid(), mods, scenarioId: scId, rng: (Date.now() ^ 0x5bd1e995) >>> 0 };
  const cfg = getCfg(w0), modObjs = cfg.mods;
  const pid = opts.countryId && (D.countries[opts.countryId] || opts.countryId === "CUS") ? opts.countryId : "CUS";
  const prof = pid === "CUS" ? CUS_PROF : D.countries[pid];
  const year = sc.year, name = pid === "CUS" ? (String(opts.nationName || "Veyra").trim().slice(0, 24) || "Veyra") : null;
  const pn = mkNode(pid, prof, modObjs);
  const diff = opts.difficulty || "normal";
  const g = pn.gdp, debtR = (.3 + prof.dev / 100 * .45) * (sc.debtStart || 1);
  const player = Object.assign(pn, { name, role: "player", government: prof.gov, population: pn.pop, specialty: "Balanced",
    debt: g * debtR, inflation: 3.2 + (100 - prof.dev) * .04, publicSatisfaction: clamp(45 + prof.stab * .3, 0, 100), education: clamp(prof.dev * .85 + 8), infrastructure: clamp(prof.dev * .9 + 5), foodSecurity: clamp(60 + prof.dev * .25),
    health: clamp(prof.dev * .85 + 10), environment: clamp(55 + (100 - prof.tech) * .15), defense: clamp(prof.stab * .6), internet: clamp(prof.dev * .85 + 8), resources: { energy: 70, freshwater: clamp(55 + (prof.dev % 17) * 2), food: 70, rawMaterials: 55 },
    policies: { taxes: 12, subsidies: 4, investment: 2, defense: 4, environment: 2 }, buildings: [], construction: [], stock: {}, reserveNote: 0,
    regions: [], parties: [], research: { completed: [], active: null, progress: 0 }, lastFinance: { revenue: 0, expenses: 0, balance: 0, interest: 0, tariffs: 0 },
    trade: { tariff: cfg.rules.tariffBase, tariffs: {}, exportBan: {}, embargo: [], pacts: [] }, tradeLast: { impVal: 0, expVal: 0, balance: 0 } });
  player.treasury = g * .12; player.stability = clamp(prof.stab); player.technology = clamp(prof.tech);
  for (const c of CIDS) player.stock[c] = player.cons0[c] * 1.0;
  const rp = player.pop;
  player.regions = [["north", "Northern Province", "رگ شمالی", .23, 57, "rawMaterials"], ["capital", "Capital District", "منطقه پایتخت", .27, 78, "services"], ["east", "Eastern Province", "استان شرقی", .2, 49, "agriculture"], ["south", "Southern Province", "استان جنوبی", .3, 59, "energy"]].map(r => ({ id: r[0], nameKey: "reg." + r[0], population: rp * r[3], development: clamp(r[4] + (prof.dev - 58) * .5), resource: r[5] }));
  player.parties = [{ k: "progress", support: 38 }, { k: "civic", support: 34 }, { k: "green", support: 18 }, { k: "national", support: 10 }];
  player.lastElection = null;
  const w = { schema: 3, id: w0.id, name: String(opts.worldName || "").trim().slice(0, 32) || (pid === "CUS" ? "Veyra" : "Earth"), version: VERSION, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    currentYear: year, currentMonth: sc.month, startYear: year, turn: 1, difficulty: diff, scenarioId: scId, mods, rng: w0.rng, playerCountry: player, countries: [], row: null, growthShift: sc.growthShift || 0,
    market: { prices: {}, hist: {}, shocks: [], demTrend: {}, sd: {}, pl: {}, pflows: {}, top: {}, history: [] }, events: [], decisions: [], history: [], objectives: [], status: { instability: 0 }, settings: { autosave: true, speed: 1 } };
  w.row = mkNode("ROW", { ...D.ROW }, modObjs);
  for (const [id, p] of Object.entries(D.countries)) { if (id === pid) continue; const n = mkNode(id, p, modObjs); n.role = "ai"; n.relation = n.baseRel = clamp(relBase(player.bloc, n) + (sc.relationShift || 0), -100, 100); n.tariff = Math.max(0, cfg.rules.tariffBase + ((hashStr(id) % 5) - 2) * (cfg.rules.tariffBase > 0 ? 1 : 0)); n.specialty = specialtyOf(id); w.countries.push(n); }
  w.row.role = "row"; w.row.relation = 0; w.row.tariff = cfg.rules.tariffBase;
  player.specialty = pid === "CUS" ? "Balanced" : specialtyOf(pid);
  const M = w.market;
  for (const c of CIDS) { const com = D.commodities[c]; const mm = modObjs.reduce((a, m) => a * (m.commodities && m.commodities[c] ? m.commodities[c].startMult : 1), 1); M.prices[c] = com.base * (sc.priceMult[c] || 1) * mm; M.hist[c] = [M.prices[c]]; M.demTrend[c] = 1; }
  for (const s of sc.shocks || []) M.shocks.push({ id: rid(), c: s.c, kind: s.kind, mult: s.mult, months: s.months, left: s.months, src: s.src, title: { en: sc.name.en, fa: sc.name.fa } });
  w.objectives = (sc.objectives || []).map(o => ({ ...o, state: "active", streak: 0, startGdp: player.gdp, deadline: o.years ? { y: year + o.years, m: sc.month } : null }));
  initGauges(w);
  marketStep(w, true);
  if (window.WOE_MIL) window.WOE_MIL.init(w);
  if (opts.sandbox) { w.sandbox = true; sandboxFill(w, true); }
  log(w, "log.start", { id: pid === "CUS" ? "" : pid, name: name || "", scn: scId, worldName: w.name });
  w.events.push(domesticStart(w));
  return w;
}
function specialtyOf(id) { let best = null, bv = 0; for (const c of CIDS) { const sh = D.prod[c][id] || 0; if (sh > bv) { bv = sh; best = c; } } return bv >= 8 ? best : "balanced"; }
function domesticStart(w) {
  return { id: rid(), key: "mandate", type: "Domestic", createdTurn: 1, resolved: false, title: { en: "A new government mandate", fa: "مأموریت تازهٔ دولت" }, description: { en: "The population expects visible improvements in living standards, public services and economic opportunity.", fa: "مردم انتظار بهبود محسوس سطح زندگی، خدمات عمومی و فرصت‌های اقتصادی را دارند." },
    choices: [{ label: { en: "Focus on living costs", fa: "تمرکز بر هزینهٔ زندگی" }, effects: { satisfaction: 2, treasury: -.25 } }, { label: { en: "Prioritise growth", fa: "اولویت دادن به رشد" }, effects: { gdp: 1.2, stability: 1 } }, { label: { en: "Invest in public services", fa: "سرمایه‌گذاری در خدمات عمومی" }, effects: { education: 1, health: 1, treasury: -.4 } }] };
}
function initGauges(w) {
  const c = w.playerCountry, r = c.resources;
  marketStep(w, true);
  const rat = k => { const m = w.market.pl[k]; return m ? clamp((m.prod + m.imp - m.exp) / Math.max(1e-9, m.cons), 0, 2) : 1; };
  r.energy = clamp(55 + 35 * (.4 * rat("oil") + .3 * rat("gas") + .3 * rat("coal") - .7) , 25, 95);
  r.food = clamp(55 + 35 * (rat("grain") - .7), 25, 95);
  r.rawMaterials = clamp(45 + 30 * ((rat("steel") + rat("copper")) / 2 - .6), 20, 90);
}

/* ---------- migration (older saves) ---------- */
function migrate(w) {
  if (!w || !w.playerCountry) return w;
  if (w.schema >= 3 && w.market && w.row) { if (window.WOE_MIL) window.WOE_MIL.ensure(w); return w; }
  // Alpha (schema 1-2) saves: rebuild as a custom island nation on the new world map, keeping the player's national stats.
  const old = w.playerCountry, nw = newWorld({ worldName: w.name, nationName: (String(old.name || "") === String(old.name || "").toUpperCase() ? String(old.name || "").toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) : old.name), countryId: "CUS", scenarioId: "modern", difficulty: w.difficulty });
  const keep = ["pop", "gdp", "treasury", "debt", "inflation", "stability", "publicSatisfaction", "education", "infrastructure", "foodSecurity", "health", "technology", "environment", "defense", "internet", "buildings", "construction", "research", "policies"];
  for (const k of keep) if (old[k] !== undefined) nw.playerCountry[k] = old[k];
  if (old.population) nw.playerCountry.population = old.population, nw.playerCountry.pop = old.population;
  const pc = nw.playerCountry, AL = { taxes: [5, 8, 12, 16, 20], subsidies: [0, 2, 4, 7, 10], investment: [0, 1, 2, 4, 6], defense: [1, 2, 4, 6, 9], environment: [0, 1, 2, 4, 6] };
  for (const k in AL) { const v = Number(pc.policies && pc.policies[k]); pc.policies = pc.policies || {}; pc.policies[k] = AL[k].reduce((b, x) => Math.abs(x - v) < Math.abs(b - v) ? x : b, AL[k][1]); }
  pc.buildings = (Array.isArray(old.buildings) ? old.buildings : []).filter(b => b && D.buildings[b.type]).map(b => ({ id: b.id || rid(), type: b.type, builtTurn: b.builtTurn || 0, seed: b.seed || Math.floor(rnd(nw) * 1e6) }));
  pc.construction = (Array.isArray(old.construction) ? old.construction : []).filter(q => q && D.buildings[q.type]).map(q => ({ id: q.id || rid(), type: q.type, remaining: Math.max(1, q.remaining || 1), total: Math.max(q.total || 0, q.remaining || 1), seed: q.seed || Math.floor(rnd(nw) * 1e6) }));
  if (!pc.research || !Array.isArray(pc.research.completed)) pc.research = { completed: [], active: null, progress: 0 };
  if (old.resources) Object.assign(nw.playerCountry.resources, old.resources);
  nw.id = w.id; nw.createdAt = w.createdAt; nw.currentYear = w.currentYear; nw.currentMonth = w.currentMonth; nw.turn = w.turn || 1;
  nw.history = (w.history || []).map(h => ({ date: h.date, title: h.title, description: h.description })); log(nw, "log.migrated", {});
  return nw;
}

/* ---------- global market ---------- */
function attract(w, cfg, ex, im, c) {
  const P = w.playerCountry, M = w.market, pl = P.id;
  let a = blocF(ex.bloc, im.bloc) / (1 + dist(ex.id, im.id) / 6000);
  let tar = im.id === pl ? (P.trade.tariffs[c] ?? P.trade.tariff) : im.tariff;
  if ((ex.id === pl || im.id === pl) && P.trade.pacts.includes(ex.id === pl ? im.id : ex.id)) tar = 0;
  a /= 1 + tar / 100 * 2.5;
  if (ex.id === pl || im.id === pl) {
    const o = ex.id === pl ? im : ex;
    a *= .5 + (o.relation + 100) / 200;
    if (P.trade.embargo.includes(o.id)) a = 0;
    a *= 1 + Math.min(.3, P.buildings.filter(b => b.type === "port").length * .04);
  }
  return a;
}
function playerBoost(w, c) {
  const n = {}; for (const b of w.playerCountry.buildings) n[b.type] = (n[b.type] || 0) + 1;
  const e = k => Math.min(.5, (n[k] || 0) * .06);
  let m = 1;
  if (c === "oil" || c === "gas") m += e("oilfield") + Math.min(.3, (n.power || 0) * .03);
  if (c === "coal") m += Math.min(.3, (n.power || 0) * .03);
  if (c === "coal") m += e("mine") * .5;
  if (c === "copper" || c === "lithium" || c === "rare") m += e("mine");
  if (c === "grain") m += Math.min(.4, (n.agri || 0) * .05);
  if (c === "steel") m += Math.min(.3, (n.factory || 0) * .03);
  if (c === "chips") m += Math.min(.3, (n.factory || 0) * .02 + (w.playerCountry.technology - 60) * .001);
  return m;
}
function marketStep(w, silent) {
  const cfg = getCfg(w), M = w.market, P = w.playerCountry, nodes = allNodes(w), pl = P.id, rules = cfg.rules;
  for (const n of nodes) { n.tb = 0; for (const c of CIDS) { n.imp[c] = 0; n.exp[c] = 0; } }
  const topAll = {};
  for (const c of CIDS) {
    const com = D.commodities[c]; const p = M.prices[c];
    let gSup = 1, gDem = 1; const src = {};
    for (const s of M.shocks) { if (s.c !== "all" && s.c !== c) continue; if (s.kind === "supply") { if (s.src === "GLOBAL") gSup *= s.mult; else src[s.src] = (src[s.src] || 1) * s.mult; } else gDem *= s.mult; }
    if (!silent) M.demTrend[c] *= 1 + (cfg.trend[c] || 0);
    const pf = p / com.base; let S = 0, Dm = 0;
    for (const n of nodes) {
      let prod = n.prod0[c] * n.cap[c] * Math.pow(pf, .12) * gSup * (src[n.id] || 1) * cfg.prodMult(c, n.id);
      if (n.id === pl) prod *= playerBoost(w, c);
      const cons = n.cons0[c] * Math.pow(n.gdp / n.gdp0, .75) * Math.pow(pf, -com.el * .25) * gDem * M.demTrend[c];
      n.prod[c] = prod; n.cons[c] = cons; S += prod; Dm += cons;
    }
    const imb = (Dm - S) / Math.max(1e-9, S);
    let np = p;
    if (!silent) { np = clamp(p * (1 + .5 * imb + (rnd(w) - .5) * .05 * rules.priceNoise) + (com.base - p) * .012, com.base * .35, com.base * 3.5); M.prices[c] = np; (M.hist[c] = M.hist[c] || []).push(np); if (M.hist[c].length > 72) M.hist[c].shift(); }
    M.sd[c] = { S, D: Dm };
    /* bilateral allocation, 3 reroute passes */
    const ex = [], im = [];
    for (const n of nodes) { const net = n.prod[c] - n.cons[c]; if (net > 0) ex.push({ n, cap: n.id === pl && P.trade.exportBan[c] ? 0 : net, sold: 0 }); else if (net < 0) im.push({ n, rem: -net, need: -net }); }
    const A = im.map(i => ex.map(e => attract(w, cfg, e.n, i.n, c)));
    const flow = im.map(() => ex.map(() => 0));
    for (let pass = 0; pass < 3; pass++) {
      const prop = ex.map(() => 0), want = im.map(() => []);
      im.forEach((i, ji) => { if (i.rem <= 1e-9) return; let ws = 0; const wt = ex.map((e, ei) => { const x = (e.cap - e.sold) * A[ji][ei]; ws += x; return x; }); if (ws <= 0) return; wt.forEach((x, ei) => { const u = i.rem * x / ws; want[ji][ei] = u; prop[ei] += u; }); });
      const sc = ex.map((e, ei) => prop[ei] > e.cap - e.sold ? Math.max(0, e.cap - e.sold) / prop[ei] : 1);
      im.forEach((i, ji) => { want[ji].forEach((u, ei) => { if (!u) return; const a = u * sc[ei]; flow[ji][ei] += a; ex[ei].sold += a; i.rem -= a; }); });
    }
    const list = [];
    im.forEach((i, ji) => ex.forEach((e, ei) => { const u = flow[ji][ei]; if (u > 1e-9) { i.n.imp[c] += u; e.n.exp[c] += u; list.push([e.n.id, i.n.id, u]); } }));
    list.sort((a, b) => b[2] - a[2]);
    M.top[c] = list.filter((f, k) => k < 12 || f[0] === pl || f[1] === pl).slice(0, 40).map(f => [f[0], f[1], +f[2].toFixed(4)]);
    const my = { prod: P.prod[c], cons: P.cons[c], imp: P.imp[c], exp: P.exp[c], need: Math.max(0, P.cons[c] - P.prod[c]), unsold: 0 };
    const self = ex.find(e => e.n.id === pl); if (self) my.unsold = Math.max(0, self.cap - self.sold);
    M.pl[c] = my;
    M.pflows[c] = { imports: list.filter(f => f[1] === pl).map(f => [f[0], f[2]]), exports: list.filter(f => f[0] === pl).map(f => [f[1], f[2]]) };
    for (const n of nodes) n.tb += (n.exp[c] - n.imp[c]) * np * com.vm * 1e6;
    for (const n of nodes) n.tot = (n.tot || 0) * (c === CIDS[0] ? 0 : 1) + (n.prod[c] - n.cons[c]) * (np - com.base) * com.vm * 1e6;
  }
}

/* player <-> market bridge: stocks, tariffs, gauge ratios */
function playerMarket(w) {
  const P = w.playerCountry, M = w.market, ratios = {}; let impVal = 0, expVal = 0, tar = 0; const short = [];
  for (const c of CIDS) {
    const m = M.pl[c], pr = M.prices[c], com = D.commodities[c];
    const val = u => u * pr * com.vm * 1e6;
    impVal += val(m.imp); expVal += val(m.exp);
    tar += val(m.imp) * ((P.trade.tariffs[c] ?? P.trade.tariff) / 100);
    const avail = m.prod - m.exp + m.imp, shortage = Math.max(0, m.cons - avail), use = Math.min(P.stock[c] || 0, shortage);
    P.stock[c] = Math.max(0, (P.stock[c] || 0) - use);
    const surplus = Math.max(0, avail - m.cons) * (P.trade.exportBan[c] ? .6 : .15) + m.unsold * .4;
    P.stock[c] = Math.min(m.cons * 12, P.stock[c] + surplus);
    ratios[c] = (avail + use) / Math.max(1e-9, m.cons);
    if (ratios[c] < .97) short.push(c);
    m.ratio = ratios[c];
  }
  return { ratios, impVal, expVal, tar, short };
}

function addShock(w, s) { w.market.shocks.push({ id: rid(), c: s.c, kind: s.kind, mult: s.mult, months: s.months, left: s.months, src: s.src || "GLOBAL", title: s.title, eid: s.eid || null }); }

/* ---------- sandbox: everything unlimited (for testing) ---------- */
function sandboxFill(w, first) {
  if (!w.sandbox) return; const P = w.playerCountry;
  P.treasury = 1e15; P.debt = 0; for (const k in P.resources) P.resources[k] = 100;
  for (const c of CIDS) P.stock[c] = (P.cons[c] || P.cons0[c]) * 12;
  P.inflation = Math.min(P.inflation, 3.2); P.publicSatisfaction = Math.max(P.publicSatisfaction, 80); P.stability = Math.max(P.stability, 80);
  if (first) P.research.completed = Object.keys(D.techs);
  if (P.mil) { P.mil.ready = 100; P.mil.weary = 0; if (first) P.mil.techs = Object.keys(D.MIL.techs); }
}
/* ---------- player actions ---------- */
function spend(w, amount) { const c = w.playerCountry; if (c.treasury < amount) return false; c.treasury -= amount; return true; }
function build(w, type) {
  const cfg = getCfg(w), spec = cfg.buildingSpec(type), c = w.playerCountry; if (!spec) return { ok: false, key: "msg.unknown" };
  const cost = spec.cost * 1e9 * scale(w);
  if (c.treasury < cost) return { ok: false, key: "msg.noTreasury" };
  const mat = spec.materials * Math.max(1, scale(w) * .1);
  if (!w.sandbox && c.resources.rawMaterials < spec.materials) return { ok: false, key: "msg.noMaterials" };
  c.treasury -= cost; c.resources.rawMaterials = clamp(c.resources.rawMaterials - spec.materials);
  const lon = capOf(c.id), id = rid();
  const mo = w.sandbox ? 1 : spec.months; c.construction.push({ id, type, remaining: mo, total: mo, seed: Math.floor(rnd(w) * 1e6) });
  log(w, "log.build", { b: type, cost$: cost, months: mo });
  return { ok: true, key: "msg.buildStarted", p: { b: type } };
}
function setPolicy(w, key, value) {
  const allowed = { taxes: [5, 8, 12, 16, 20], subsidies: [0, 2, 4, 7, 10], investment: [0, 1, 2, 4, 6], defense: [1, 2, 4, 6, 9], environment: [0, 1, 2, 4, 6] };
  if (!allowed[key] || !allowed[key].includes(Number(value))) return false;
  w.playerCountry.policies[key] = Number(value); log(w, "log.policy", { pol: key, v: value }); return true;
}
function startResearch(w, key) {
  const t = D.techs[key], c = w.playerCountry, cfg = getCfg(w); if (!t || c.research.active) return { ok: false, key: "msg.researchBusy" };
  if (c.research.completed.includes(key)) return { ok: false, key: "msg.researchDone" };
  const cost = t.cost * 1e9 * scale(w) * cfg.rules.researchCostMult; if (c.treasury < cost) return { ok: false, key: "msg.noTreasury" };
  c.treasury -= cost; const mo = w.sandbox ? 1 : t.months; c.research.active = { key, remaining: mo, months: mo, bonus: t.bonus }; c.research.progress = 0; log(w, "log.research", { tech: key, cost$: cost });
  return { ok: true, key: "msg.researchStarted" };
}
function tradeSpot(w, action, c, pct) {
  const P = w.playerCountry, M = w.market, com = D.commodities[c]; pct = clamp(Number(pct) || 0, 1, 100);
  if (!com) return { ok: false, key: "msg.unknown" };
  const units = P.cons[c] * pct / 100, price = M.prices[c];
  if (action === "buy") {
    const tariff = (P.trade.tariffs[c] ?? P.trade.tariff) / 100; const cost = units * price * com.vm * 1e6 * (1 + tariff + .03);
    if (P.treasury < cost) return { ok: false, key: "msg.noTreasury" };
    if ((P.stock[c] || 0) + units > P.cons[c] * 12.001) return { ok: false, key: "msg.stockFull" };
    P.treasury -= cost; P.stock[c] = (P.stock[c] || 0) + units; log(w, "log.buy", { c, pct, cost$: cost });
    return { ok: true, key: "msg.bought", p: { c, cost$: cost } };
  }
  if ((P.stock[c] || 0) < units) return { ok: false, key: "msg.noStock" };
  const rev = units * price * com.vm * 1e6 * .97; P.stock[c] -= units; P.treasury += rev; log(w, "log.sell", { c, pct, cost$: rev });
  return { ok: true, key: "msg.sold", p: { c, cost$: rev } };
}
function setTariff(w, c, value) { const P = w.playerCountry; value = clamp(Math.round(Number(value) || 0), 0, 60); if (c === "*") { P.trade.tariff = value; P.trade.tariffs = {}; } else if (D.commodities[c]) P.trade.tariffs[c] = value; else return false; log(w, "log.tariff", { c: c === "*" ? "" : c, v: value }); return true; }
function toggleBan(w, c) { const P = w.playerCountry; if (!D.commodities[c]) return false; P.trade.exportBan[c] = !P.trade.exportBan[c]; log(w, P.trade.exportBan[c] ? "log.banOn" : "log.banOff", { c }); return true; }
function diplomacy(w, targetId, action) {
  const t = w.countries.find(x => x.id === targetId); if (!t) return { ok: false, key: "msg.unknown" };
  const P = w.playerCountry, aid = .5e9 * scale(w), T = P.trade;
  if (action === "aid") { if (!spend(w, aid)) return { ok: false, key: "msg.noTreasury" }; t.relation = clamp(t.relation + 12, -100, 100); t.treasury += aid; }
  else if (action === "trade") { if (T.pacts.includes(t.id)) return { ok: false, key: "msg.alreadyPact" }; if (t.relation < -20) return { ok: false, key: "msg.relationLow" }; T.pacts.push(t.id); t.relation = clamp(t.relation + 5, -100, 100); if (T.embargo.includes(t.id)) T.embargo = T.embargo.filter(x => x !== t.id); }
  else if (action === "research") { if (t.relation < 10) return { ok: false, key: "msg.relationLow" }; if (!P.researchPartners) P.researchPartners = []; if (P.researchPartners.includes(t.id)) return { ok: false, key: "msg.alreadyPact" }; P.researchPartners.push(t.id); t.relation = clamp(t.relation + 8, -100, 100); }
  else if (action === "summit") { t.relation = clamp(t.relation + 3 + (t.stability > 60 ? 1 : 0), -100, 100); }
  else if (action === "embargo") { if (T.embargo.includes(t.id)) { T.embargo = T.embargo.filter(x => x !== t.id); t.relation = clamp(t.relation + 6, -100, 100); log(w, "log.embargoOff", { cid: t.id }); return { ok: true, key: "msg.embargoOff" }; } T.embargo.push(t.id); T.pacts = T.pacts.filter(x => x !== t.id); t.relation = clamp(t.relation - 25, -100, 100); log(w, "log.embargoOn", { cid: t.id }); return { ok: true, key: "msg.embargoOn" }; }
  else return { ok: false, key: "msg.unknown" };
  log(w, "log.dip", { a: action, cid: t.id }); return { ok: true, key: "msg.dipDone" };
}
function repayDebt(w) { const c = w.playerCountry, pay = Math.min(c.debt, c.treasury * .5); if (pay <= 0) return { ok: false, key: "msg.noTreasury" }; c.treasury -= pay; c.debt -= pay; log(w, "log.repay", { cost$: pay }); return { ok: true, key: "msg.repaid", p: { cost$: pay } }; }
function political(w, action) {
  const c = w.playerCountry, cost = (action === "reform" ? .25e9 : action === "dialogue" ? .05e9 : 0) * scale(w);
  if (cost && c.treasury < cost) return { ok: false, key: "msg.noTreasury" };
  c.treasury -= cost;
  if (action === "election") {
    const mood = (c.publicSatisfaction - 55) / 12 + (c.stability - 55) / 25;
    const raw = c.parties.map((p, i) => Math.max(3, p.support + (rnd(w) - .5) * 10 + (i === 0 ? mood * 3 : -mood)));
    const sum = raw.reduce((a, b) => a + b, 0); let acc = 0;
    c.parties.forEach((p, i) => { p.support = i === c.parties.length - 1 ? 100 - acc : Math.round(raw[i] / sum * 100); acc += p.support; });
    const win = c.parties.slice().sort((a, b) => b.support - a.support)[0];
    c.stability = clamp(c.stability + (win.k === c.parties[0].k ? 1 : -1)); c.publicSatisfaction = clamp(c.publicSatisfaction + 1.5);
    c.lastElection = { turn: w.turn, winner: win.k }; log(w, "log.election", { pk: win.k });
  } else if (action === "reform") { c.education = clamp(c.education + 1); c.stability = clamp(c.stability + 1); log(w, "log.reform", {}); }
  else if (action === "dialogue") { c.stability = clamp(c.stability + 2); c.publicSatisfaction = clamp(c.publicSatisfaction + 1); log(w, "log.dialogue", {}); }
  return { ok: true, key: "msg.done" };
}
function security(w, action) { const c = w.playerCountry, cost = (action === "drill" ? .1e9 : .3e9) * scale(w); if (!spend(w, cost)) return { ok: false, key: "msg.noTreasury" }; if (action === "drill") c.defense = clamp(c.defense + 2); else { c.stability = clamp(c.stability + 1); c.publicSatisfaction = clamp(c.publicSatisfaction + .3); } log(w, "log.security", {}); return { ok: true, key: "msg.done" }; }
function environment(w, action) { const c = w.playerCountry; if (action === "restore") { if (!spend(w, .2e9 * scale(w))) return { ok: false, key: "msg.noTreasury" }; c.environment = clamp(c.environment + 2); } else { c.environment = clamp(c.environment + 1); c.gdp = Math.max(5e9, c.gdp * .999); } log(w, "log.environment", {}); return { ok: true, key: "msg.done" }; }
function investRegion(w, id) { const c = w.playerCountry, r = c.regions.find(x => x.id === id); if (!r) return { ok: false, key: "msg.unknown" }; if (!spend(w, .1e9 * scale(w))) return { ok: false, key: "msg.noTreasury" }; r.development = clamp(r.development + 2); log(w, "log.region", { reg: r.id }); return { ok: true, key: "msg.done" }; }

function pushEvent(w, ev) {
  if (ev.key && w.events.some(e => !e.resolved && e.key === ev.key)) return false;
  w.events.unshift({ id: rid(), resolved: false, createdTurn: w.turn, ...ev });
  const open = w.events.filter(e => !e.resolved), done = w.events.filter(e => e.resolved);
  w.events = [...open, ...done].slice(0, 30); w.events.sort((a, b) => (a.resolved - b.resolved) || (b.createdTurn - a.createdTurn));
  return true;
}
function resolveEvent(w, eventId, index) {
  const e = w.events.find(x => x.id === eventId); if (!e || e.resolved) return false;
  const ch = e.choices[index]; if (!ch) return false;
  const c = w.playerCountry, fx = ch.effects || {}, sc = scale(w);
  for (const [k, v] of Object.entries(fx)) {
    if (k === "treasury") c.treasury = Math.max(0, c.treasury + v * 1e9 * sc);
    else if (k === "gdp" || k === "debt") c[k] = Math.max(k === "gdp" ? 5e9 : 0, c[k] + v * 1e9 * sc);
    else if (k === "inflation") c.inflation = clamp(c.inflation + v, 0, 60);
    else if (["energy", "food", "freshwater", "rawMaterials"].includes(k)) c.resources[k] = clamp(c.resources[k] + v);
    else if (k === "satisfaction") c.publicSatisfaction = clamp(c.publicSatisfaction + v);
    else if (k === "relationAll") w.countries.forEach(t => t.relation = clamp(t.relation + v, -100, 100));
    else if (k === "relationBloc") w.countries.filter(t => t.bloc === v).forEach(t => t.relation = clamp(t.relation + (fx.relation || 0), -100, 100));
    else if (k === "relation") { /* applied by relationBloc */ }
    else if (k === "stockBuy") { const cost = valueOf(w, v, c.cons[v] * 1.5); if (c.treasury >= cost) { c.treasury -= cost; c.stock[v] = Math.min(c.cons[v] * 12, (c.stock[v] || 0) + c.cons[v] * 1.5); } }
    else if (k === "stockRelease") { const use = Math.min(c.stock[v] || 0, c.cons[v]); c.stock[v] -= use; c.resources.energy = clamp(c.resources.energy + (use > 0 ? 4 : 1)); }
    else if (k in c && typeof c[k] === "number") c[k] = clamp(c[k] + v);
  }
  e.resolved = true; e.outcome = ch.label; w.decisions.unshift({ turn: w.turn, title: e.title, choice: ch.label }); if (w.decisions.length > 120) w.decisions.length = 120;
  log(w, "log.decision", { title: e.title, choice: ch.label }); return true;
}

/* ---------- monthly simulation ---------- */
function advance(w) {
  w = migrate(w); if (window.WOE_MIL) window.WOE_MIL.ensure(w); sandboxFill(w); const cfg = getCfg(w), M = w.market, P = w.playerCountry, r = P.resources, pol = P.policies, sc = scale(w), rules = cfg.rules;
  const diff = w.difficulty === "hard" ? 1.18 : w.difficulty === "easy" ? .88 : 1;
  marketStep(w, false);
  const mk = playerMarket(w);
  /* finance */
  const tax = pol.taxes / 100, sub = pol.subsidies / 100, inv = pol.investment / 100;
  const interest = P.debt * .045 / 12;
  const revenue = P.gdp * (.012 + tax * .045) + mk.tar + mk.expVal * .03;
  const expenses = P.gdp * (.0105 + sub * .045 + inv * .035 + pol.defense / 100 * .018 + pol.environment / 100 * .012) + interest + (window.WOE_MIL ? window.WOE_MIL.upkeep(w) : 0);
  const bIncome = P.buildings.length * .018e9 * sc;
  const balance = revenue + bIncome - expenses;
  P.treasury += balance;
  if (P.treasury < 0) { P.debt += -P.treasury; P.treasury = 0; }
  else if (balance > 0 && P.debt > 0 && P.treasury > P.gdp * .08) { const rep = Math.min(P.debt, balance * .3); P.debt -= rep; P.treasury -= rep; }
  P.lastFinance = { revenue, expenses, balance, interest, tariffs: mk.tar };
  P.tradeLast = { impVal: mk.impVal, expVal: mk.expVal, balance: mk.expVal - mk.impVal };
  const ESS = { oil: .2, gas: .1, coal: .05, grain: .35, steel: .1, copper: .05, chips: .1, lithium: .025, rare: .025 };
  const sev = CIDS.reduce((a, c) => a + ESS[c] * Math.max(0, 1 - mk.ratios[c]), 0) + (r.freshwater < 30 ? .05 : 0);
  const shortage = sev > .004;
  const cnt = {}; for (const b of P.buildings) cnt[b.type] = (cnt[b.type] || 0) + 1;
  const factories = cnt.factory || 0;
  /* GDP, inflation */
  const totFx = clamp(.05 * P.tot / (P.gdp / 12), -.01, .01);
  const gm = P.growth / 1200 * diff + (rules.globalGrowthAdd / 1200) + (w.growthShift || 0) / 1200 + factories * .0004 / Math.sqrt(sc) + (P.technology - 50) * .00002 + totFx - (P.inflation > 10 ? .0008 : 0) - (balance < 0 ? .0003 : 0);
  P.gdp = Math.max(5e9, P.gdp * (1 + gm)); w.growthShift = (w.growthShift || 0) * .96;
  const avgTar = CIDS.reduce((a, c) => a + (P.trade.tariffs[c] ?? P.trade.tariff), 0) / CIDS.length;
  const priceStress = CIDS.reduce((a, c) => a + Math.max(0, M.prices[c] / D.commodities[c].base - 1.3) * ((P.cons[c] - P.prod[c]) > 0 ? 1 : .2), 0) / CIDS.length;
  P.inflation = clamp(P.inflation + Math.min(.5, sev * 4) + (balance < 0 ? .04 : -.02) + (sub > .07 ? -.04 : 0) + priceStress * .5 + (avgTar > 15 ? .03 : 0) + rules.inflationDrift + (3.2 - P.inflation) * .05, 0, 60);
  P.pop = P.population = Math.round(P.pop * (1 + (P.publicSatisfaction - 50) * .000012 / 12 * 12 * .5 + (P.health - 50) * .000006 + .0002));
  /* gauges */
  const R = mk.ratios, gsh = k => clamp((R[k] - 1) * 10, -4, 3);
  const tg = (ratio, bonus = 0) => clamp(70 + (ratio - 1) * 150 + bonus);
  r.energy = clamp(r.energy + (tg(.4 * R.oil + .3 * R.gas + .3 * R.coal, (cnt.power || 0) * 1.2) - r.energy) * .12);
  r.food = clamp(r.food + (tg(R.grain, (cnt.agri || 0) * 1 + (P.infrastructure > 60 ? 1 : 0)) - r.food) * .12);
  r.rawMaterials = clamp(r.rawMaterials + (tg((R.steel + R.copper) / 2, (cnt.factory || 0) * .5 + (cnt.mine || 0) * 1) - r.rawMaterials) * .08);
  r.freshwater = clamp(r.freshwater - .16 + (cnt.water || 0) * .8);
  P.technology = clamp(P.technology + gsh("chips") * .08 + (P.researchPartners || []).length * .01);
  P.education = clamp(P.education + (cnt.school || 0) * .22 + (P.technology > 70 ? .025 : 0) - .01);
  P.health = clamp(P.health + (cnt.hospital || 0) * .2 - .015);
  P.infrastructure = clamp(P.infrastructure + (cnt.road || 0) * .2 + inv * .12 - .01 + (cnt.port || 0) * .05);
  P.internet = clamp(P.internet + (cnt.internet || 0) * .3);
  P.publicSatisfaction = clamp(P.publicSatisfaction + .06 + (sub - .04) * 8 - Math.min(1.2, sev * 12) - (P.inflation > 10 ? .18 : 0) + (P.health - 60) * .002 - (P.debt / P.gdp > 1.5 ? .15 : 0));
  P.stability = clamp(P.stability + (clamp(.75 * P.publicSatisfaction + 20 - (P.inflation > 15 ? 10 : 0) - (P.debt / P.gdp > 1.8 ? 8 : 0)) - P.stability) * .04);
  P.foodSecurity = clamp(P.foodSecurity + (R.grain >= .99 ? .08 : -.35 * (1 - R.grain) * 10 / 3));
  P.environment = clamp(P.environment + pol.environment * .025 - factories * .035 / Math.sqrt(sc) + rules.envDrift);
  P.defense = clamp(P.defense + pol.defense * .025);
  /* construction & research */
  for (const q of P.construction) { q.remaining--; if (q.remaining <= 0) { P.buildings.push({ id: q.id, type: q.type, builtTurn: w.turn, seed: q.seed }); log(w, "log.built", { b: q.type }); } }
  P.construction = P.construction.filter(q => q.remaining > 0);
  if (P.research.active) {
    const t = P.research.active; t.remaining--; P.research.progress = (t.months - t.remaining) / t.months * 100;
    if (t.remaining <= 0) {
      P.research.completed.push(t.key);
      if (t.bonus === "energy") r.energy = clamp(r.energy + 8); if (t.bonus === "technology") P.technology = clamp(P.technology + 8); if (t.bonus === "health") P.health = clamp(P.health + 8);
      if (t.bonus === "industry") P.gdp *= 1.025; if (t.bonus === "water") r.freshwater = clamp(r.freshwater + 8); if (t.bonus === "materials") r.rawMaterials = clamp(r.rawMaterials + 8);
      log(w, "log.researched", { tech: t.key }); P.research.active = null; P.research.progress = 0;
    }
  }
  for (const reg of P.regions) { reg.development = clamp(reg.development + (P.infrastructure - 50) * .002); reg.population = P.pop * (reg.population / Math.max(1, P.regions.reduce((a, x) => a + x.population, 0))); }
  if (window.WOE_MIL) window.WOE_MIL.step(w);
  /* AI nations + rest of world */
  const retaliate = avgTar > 15;
  for (const n of [...w.countries, w.row]) {
    const gmn = (n.growth + rules.globalGrowthAdd + (w.growthShift || 0)) / 1200 + clamp(.05 * n.tot / (n.gdp / 12), -.01, .01) + (rnd(w) - .5) * .0016;
    n.gdp = Math.max(1e9, n.gdp * (1 + gmn)); n.pop *= 1.0002; n.treasury += n.gdp * .002;
    for (const c of CIDS) n.cap[c] *= 1.0021;
    n.stability = clamp(n.stability + (n.tot < 0 ? -.05 : .02) + (rnd(w) - .5) * .2, 5, 98);
    if (n.role === "ai") { n.relation = clamp(n.relation + (n.baseRel - n.relation) * .01 + (rnd(w) - .5) * .8 + rules.relationDrift - (retaliate ? .25 : 0) + (P.trade.pacts.includes(n.id) ? .08 : 0) - (P.trade.embargo.includes(n.id) ? .4 : 0), -100, 100); }
  }
  /* shocks age */
  for (const s of M.shocks) s.left--; M.shocks = M.shocks.filter(s => s.left > 0);
  /* events */
  for (const e of w.events) if (!e.resolved && w.turn - e.createdTurn >= 8) { e.resolved = true; e.outcome = { en: "No decision was made", fa: "تصمیمی گرفته نشد" }; P.publicSatisfaction = clamp(P.publicSatisfaction - .3); log(w, "log.expired", { title: e.title }); }
  const pool = [...D.worldEvents.map(e => ({ ...e, key: "w_" + e.id })), ...cfg.events.filter(e => w.turn % e.every === 0).map(e => ({ ...e, key: "m_" + e.id }))];
  const forced = cfg.events.filter(e => w.turn % e.every === 0 && w.turn > 1);
  let spawn = forced.length ? forced[0] : null;
  if (!spawn && rnd(w) < .3) spawn = D.worldEvents[Math.floor(rnd(w) * D.worldEvents.length)];
  if (spawn) {
    const key = (spawn.modId ? "m_" : "w_") + spawn.id;
    if (!w.events.some(e => !e.resolved && e.key === key)) {
      pushEvent(w, { key, type: "World", title: spawn.title, description: spawn.text, choices: spawn.choices });
      if (spawn.market) { addShock(w, { ...spawn.market, title: spawn.title, eid: spawn.id }); }
    }
  }
  if (P.inflation > 14) pushEvent(w, { key: "inflation", type: "Economy", title: { en: "Inflation warning", fa: "هشدار تورم" }, description: { en: "Rising prices are putting pressure on household budgets.", fa: "افزایش قیمت‌ها بر بودجهٔ خانوارها فشار می‌آورد." }, choices: [{ label: { en: "Targeted relief", fa: "کمک هدفمند" }, effects: { satisfaction: 2, treasury: -.35, inflation: -.8 } }, { label: { en: "Tighten spending", fa: "انقباض هزینه‌ها" }, effects: { inflation: -.5, satisfaction: -1 } }, { label: { en: "Hold course", fa: "ادامهٔ مسیر" }, effects: { stability: -.4 } }] });
  if (P.stability < 35) pushEvent(w, { key: "confidence", type: "Politics", title: { en: "Government confidence under pressure", fa: "اعتماد به دولت تحت فشار" }, description: { en: "Public confidence is falling. A cross-party consultation may help.", fa: "اعتماد عمومی رو به کاهش است. رایزنی میان‌حزبی می‌تواند کمک کند." }, choices: [{ label: { en: "Open national dialogue", fa: "گشودن گفت‌وگوی ملی" }, effects: { stability: 3, satisfaction: 1, treasury: -.1 } }, { label: { en: "Announce reforms", fa: "اعلام اصلاحات" }, effects: { stability: 1, education: 1 } }, { label: { en: "Make no changes", fa: "بدون تغییر" }, effects: { stability: -1 } }] });
  /* calendar */
  w.currentMonth++; if (w.currentMonth > 12) { w.currentMonth = 1; w.currentYear++; } w.turn++;
  M.history.push({ t: w.turn, gdp: P.gdp, treasury: P.treasury, infl: P.inflation, bal: mk.expVal - mk.impVal }); if (M.history.length > 120) M.history.shift();
  sandboxFill(w);
  evalObjectives(w);
  log(w, "log.monthly", { gdp$: P.gdp, tre$: P.treasury, infl: P.inflation.toFixed(1) });
  w.updatedAt = new Date().toISOString();
  return { balance, shortage, short: mk.short };
}

function evalObjectives(w) {
  const P = w.playerCountry;
  for (const o of w.objectives) {
    if (o.state !== "active") continue;
    const streak = (cond) => { o.streak = cond ? (o.streak || 0) + 1 : 0; o.progress = Math.min(100, o.streak / o.months * 100); if (o.streak >= o.months) o.state = "done"; };
    switch (o.type) {
      case "gdp": o.progress = Math.min(100, P.gdp / (o.startGdp * o.mult) * 100); if (P.gdp >= o.startGdp * o.mult) o.state = "done"; else if (o.deadline && (w.currentYear > o.deadline.y || (w.currentYear === o.deadline.y && w.currentMonth >= o.deadline.m))) o.state = "failed"; break;
      case "inflation": streak(P.inflation < o.value); break;
      case "stability": streak(P.stability >= o.value); break;
      case "approval": streak(P.publicSatisfaction >= o.value); break;
      case "environment": streak(P.environment >= o.value); break;
      case "foodsec": streak(P.foodSecurity >= o.value); break;
      case "buildings": o.progress = Math.min(100, P.buildings.length / o.value * 100); if (P.buildings.length >= o.value) o.state = "done"; break;
      case "research": o.progress = Math.min(100, P.research.completed.length / o.value * 100); if (P.research.completed.length >= o.value) o.state = "done"; break;
      case "pacts": o.progress = Math.min(100, P.trade.pacts.length / o.value * 100); if (P.trade.pacts.length >= o.value) o.state = "done"; break;
      case "tech": o.progress = Math.min(100, P.technology / o.value * 100); if (P.technology >= o.value) o.state = "done"; break;
    }
    if (o.state === "done") log(w, "log.objective", { obj: o.id, ot: o.type });
  }
  if (w.objectives.length && w.objectives.every(o => o.state === "done") && !w.status.won) { w.status.won = w.turn; log(w, "log.victory", {}); }
}

const nodeName = (w, id) => id === w.playerCountry.id ? w.playerCountry.name : null;
window.WOE = { sandboxFill, rnd, hashStr, rid, VERSION, CIDS, clamp, newWorld, migrate, advance, build, setPolicy, startResearch, tradeSpot, setTariff, toggleBan, diplomacy, repayDebt, political, security, environment, investRegion, resolveEvent, pushEvent,
  getCfg, scale, allNodes, nodeById, valueOf, validateMod, setUserMods, allMods, EFFECT_KEYS, BUILD_EFFECTS, capOf, CUS_PROF, dist, log, addShock, spend };
})();
