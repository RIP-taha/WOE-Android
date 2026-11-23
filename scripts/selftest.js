// Headless engine self-test: node scripts/selftest.js
global.window = global;
const path = require("path"), s = p => require(path.join(__dirname, "..", "src", "scripts", p));
s("data.js"); s("engine.js");
const D = WOE_DATA, E = WOE;
let failures = 0;
const fail = m => { failures++; console.log("  FAIL:", m); };
function scan(obj, p, seen = new Set()) {
  if (obj && typeof obj === "object") { if (seen.has(obj)) return; seen.add(obj); for (const k in obj) scan(obj[k], p + "." + k, seen); }
  else if (typeof obj === "number" && !Number.isFinite(obj)) fail("non-finite number at " + p);
}
const cases = [["USA", "modern"], ["CHN", "energy"], ["SAU", "tradewar"], ["CUS", "recession"], ["BRA", "green"], ["IND", "food"], ["JPN", "techrace"], ["RUS", "modern"], ["DEU", "energy"]];
for (const [cid, sc] of cases) {
  const w = E.newWorld({ countryId: cid, scenarioId: sc, nationName: "Testland", mods: sc === "modern" ? ["free_trade", "green_future"] : [] });
  const P = w.playerCountry;
  let minP = {}, maxP = {};
  for (let t = 0; t < 180; t++) {
    // random player actions
    const r = Math.random();
    try {
      if (t % 5 === 0) E.build(w, E.getCfg(w).buildingKeys()[t % 11]);
      if (t % 7 === 0) E.tradeSpot(w, t % 14 === 0 ? "buy" : "sell", E.CIDS[t % 9], 10);
      if (t % 9 === 0) E.setTariff(w, E.CIDS[t % 9], (t * 3) % 40);
      if (t % 11 === 0) E.toggleBan(w, E.CIDS[t % 9]);
      if (t % 13 === 0) E.diplomacy(w, w.countries[t % w.countries.length].id, ["summit", "trade", "research", "aid", "embargo"][t % 5]);
      if (t % 17 === 0) E.startResearch(w, Object.keys(D.techs)[t % 6]);
      if (t % 19 === 0) E.political(w, ["election", "reform", "dialogue"][t % 3]);
      if (t % 23 === 0) E.repayDebt(w);
      for (const e of w.events.filter(e => !e.resolved)) if (r < .6) E.resolveEvent(w, e.id, Math.floor(Math.random() * e.choices.length));
      E.advance(w);
    } catch (e) { fail(`${cid}/${sc} turn ${t}: ${e.stack}`); break; }
    for (const c of E.CIDS) { const p = w.market.prices[c]; minP[c] = Math.min(minP[c] ?? 1e99, p / D.commodities[c].base); maxP[c] = Math.max(maxP[c] ?? 0, p / D.commodities[c].base); }
    if (P.treasury < 0) fail(`negative treasury ${cid}/${sc} t${t}`);
    for (const k of ["stability", "publicSatisfaction", "education", "health", "infrastructure", "technology", "environment", "defense", "internet", "foodSecurity"]) if (P[k] < 0 || P[k] > 100) fail(`${k} out of range`);
    for (const k in P.resources) if (P.resources[k] < 0 || P.resources[k] > 100) fail(`resource ${k} out of range`);
  }
  scan(w, "world");
  JSON.parse(JSON.stringify(w));
  const ratio = E.CIDS.map(c => `${c}:${minP[c].toFixed(2)}-${maxP[c].toFixed(2)}`).join(" ");
  console.log(`${cid}/${sc}: gdp ${(P.gdp / 1e9).toFixed(0)}B (start ${(P.gdp0 / 1e9).toFixed(0)}B) infl ${P.inflation.toFixed(1)} stab ${P.stability.toFixed(0)} sat ${P.publicSatisfaction.toFixed(0)} energy ${P.resources.energy.toFixed(0)} food ${P.resources.food.toFixed(0)} raw ${P.resources.rawMaterials.toFixed(0)} | events open ${w.events.filter(e => !e.resolved).length} | objectives ${w.objectives.map(o => o.state[0]).join("")}`);
  console.log("   price range x base:", ratio);
}
// quiet world: no player actions, 15 years — market must stay sane
{
  const w = E.newWorld({ countryId: "FRA", scenarioId: "modern" });
  for (let t = 0; t < 180; t++) { E.advance(w); for (const e of w.events) if (!e.resolved) E.resolveEvent(w, e.id, 2); }
  const r = E.CIDS.map(c => (w.market.prices[c] / D.commodities[c].base).toFixed(2)).join(" ");
  console.log("quiet 15y price ratios:", r);
  for (const c of E.CIDS) { const x = w.market.prices[c] / D.commodities[c].base; if (x < .45 || x > 2.6) fail(`quiet-world price runaway ${c} ${x.toFixed(2)}`); }
}
// baseline balance check
{
  const w = E.newWorld({ countryId: "USA", scenarioId: "modern" });
  for (const c of E.CIDS) { const m = w.market.sd[c]; const d = Math.abs(m.D - m.S) / m.S; if (d > .12) fail(`baseline imbalance ${c}: ${(d * 100).toFixed(1)}%`); }
  console.log("baseline S/D balance ok");
}
// mod validation
{
  const bad = E.validateMod({ id: "x y!", name: "T", countries: { USA: { growth: 999 }, ZZZ: {} }, rules: { tariffBase: -5 }, events: [{ title: "t", choices: [{ label: "a", effects: { treasury: 9999, evil: 1 } }] }] });
  const m = bad.mod;
  if (m.id !== "xy") fail("mod id not sanitised: " + m.id);
  if (m.countries.USA.growth !== 6) fail("mod growth not clamped");
  if (m.countries.ZZZ) fail("unknown country accepted");
  if (m.events[0].choices[0].effects.treasury !== 10 || m.events[0].choices[0].effects.evil !== undefined) fail("mod event effects not sanitised");
  console.log("mod validation ok");
}
console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL ENGINE TESTS PASSED");
process.exit(failures ? 1 : 0);
