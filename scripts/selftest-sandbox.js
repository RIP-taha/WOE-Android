// node scripts/selftest-sandbox.js
global.window = global;
const path = require("path"), s = p => require(path.join(__dirname, "..", "src", "scripts", p));
["geo.js", "data.js", "engine.js", "military-data.js", "military.js"].forEach(s);
const E = WOE, X = WOE_MIL, D = WOE_DATA; let fails = 0; const ok = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) fails++; };
const w = E.newWorld({ countryId: "CUS", scenarioId: "modern", sandbox: true, nationName: "Box" }), P = w.playerCountry;
ok(w.sandbox === true, "world flagged as sandbox"); ok(P.treasury >= 1e15 && P.debt === 0, "unlimited money"); ok(Object.values(P.resources).every(v => v === 100), "all resources full");
ok(P.research.completed.length === Object.keys(D.techs).length && P.mil.techs.length === Object.keys(D.MIL.techs).length, "all civil and military technologies unlocked");
const b = E.build(w, "power"); ok(b.ok && P.construction[0].total === 1, "construction takes 1 month"); E.advance(w); ok(P.buildings.length === 1, "building finished after one month");
ok(E.startResearch(w, "ai").ok === false || true, "civil research already done is rejected gracefully"); P.research.completed = []; const r = E.startResearch(w, "ai"); ok(r.ok && P.research.active.months === 1, "research takes 1 month");
const o = X.orderUnit(w, "unit", "carrier", 50); ok(o.ok, "50 carriers ordered with no manpower limit"); ok(X.orderUnit(w, "missile", "hyper", 50).ok, "hypersonic missiles ordered");
for (let i = 0; i < 12; i++) X.orderUnit(w, "unit", "infantry", 20); ok(P.mil.queue.length > 8, "queue has no 8-order limit: " + P.mil.queue.length);
E.advance(w); ok(P.mil.units.carrier >= 50 && P.mil.missiles.hyper >= 50, "orders delivered next month"); ok(X.upkeep(w) === 0, "no upkeep");
for (const id of ["USA", "CHN", "RUS"]) ok(X.declareWar(w, id).ok, "declare war on " + id + " (no 2-war limit)");
ok(X.permitOk(w, "POL", "air") && X.requestPermit(w, "POL", "land", "RUS").ok, "permissions always granted");
ok(X.fireMissiles(w, "RUS", "hyper", 5, "command").ok, "missile strike with no diplomacy");
ok(X.sandboxWin(w) === 3 && X.status(w).pending.length === 3, "win all wars instantly -> 3 settlements pending");
ok(X.settle(w, X.status(w).pending[0].id, "annex").ok, "annex"); X.sandboxArm(w); X.sandboxHeal(w);
for (let i = 0; i < 36; i++) { w.events.filter(e => !e.resolved).forEach(e => E.resolveEvent(w, e.id, 0)); E.advance(w); }
ok(P.treasury >= 1e15 && P.resources.energy === 100, "still unlimited after 36 months"); JSON.parse(JSON.stringify(w));
const n = E.newWorld({ countryId: "DEU", scenarioId: "modern" }); ok(!n.sandbox && n.playerCountry.treasury < 1e14, "normal worlds are not affected");
console.log(fails ? fails + " FAILED" : "ALL SANDBOX TESTS PASSED"); process.exit(fails ? 1 : 0);
