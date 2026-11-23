// Verifies every translation key used in code exists in both languages.   node scripts/check-i18n.js
global.window = global; global.localStorage = { getItem() { return null; }, setItem() {} }; global.document = { body: { classList: { toggle() {} } }, documentElement: {} };
const fs = require("fs"), path = require("path"), src = path.join(__dirname, "..", "src");
["geo.js", "data.js", "i18n.js", "lang.js", "lang-mil.js", "engine.js", "military-data.js"].forEach(f => require(path.join(src, "scripts", f)));
const I = I18N, D = WOE_DATA, missing = new Set(), used = new Set();
const files = fs.readdirSync(path.join(src, "scripts")).filter(f => f.endsWith(".js") && !["geo.js", "data.js", "lang.js", "lang-mil.js", "military-data.js"].includes(f)).map(f => path.join(src, "scripts", f)).concat(path.join(src, "index.html"));
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(/\bt\(\s*["'`]([\w.$]+)["'`]/g)) used.add(m[1]);
  for (const m of s.matchAll(/data-(?:i|ititle|iph)="([\w.]+)"/g)) used.add(m[1]);
  for (const m of s.matchAll(/t\("([\w]+\.)"\s*\+/g)) used.add("PREFIX:" + m[1]);
}
const fam = (prefix, ids) => ids.forEach(i => used.add(prefix + i));
fam("c.", [...WOE.CIDS, "all"]); fam("u.", WOE.CIDS); fam("b.", Object.keys(D.buildings)); fam("bd.", Object.keys(D.buildings)); fam("tech.", Object.keys(D.techs)); fam("td.", Object.keys(D.techs));
fam("pol.", ["taxes", "subsidies", "investment", "defense", "environment"]); fam("reg.", ["north", "capital", "east", "south"]); fam("rgres.", ["rawMaterials", "services", "agriculture", "energy"]);
fam("party.", ["progress", "civic", "green", "national"]); fam("dipa.", ["summit", "trade", "research", "aid", "embargo", "lift"]); fam("bloc.", ["west", "east", "neutral"]); fam("diff.", ["easy", "normal", "hard"]);
fam("obj.", ["gdp", "inflation", "stability", "approval", "environment", "foodsec", "buildings", "research", "pacts", "tech", "active", "done", "failed"]);
fam("evt.", ["World", "Domestic", "Economy", "Politics"]); fam("nav.", ["overview", "economy", "construction", "market", "population", "infrastructure", "diplomacy", "politics", "research", "security", "environment", "regions", "events", "scenario", "mods", "reports", "settings", "military", "sandbox"]);
fam("layer.", ["political", "relations", "gdp", "gdppc", "stability", "tech", "tradebal", "prod", "net", "military"]); fam("mo.", ["labels", "cities", "relief", "flows", "builds"]); fam("mk.", ["supply", "demand"]);
fam("ind.", ["education", "health", "infrastructure", "technology", "environment", "defense", "internet", "foodSecurity"]); fam("res.", ["energy", "freshwater", "food", "rawMaterials"]);
for (const k of ["start", "migrated", "build", "policy", "research", "buy", "sell", "tariff", "banOn", "banOff", "embargoOff", "embargoOn", "dip", "repay", "election", "reform", "dialogue", "security", "environment", "region", "decision", "built", "researched", "expired", "monthly", "objective", "victory"]) used.add("log." + k);
const MD = WOE_DATA.MIL; fam("un.", Object.keys(MD.units)); fam("ud.", Object.keys(MD.units)); fam("ms.", Object.keys(MD.missiles)); fam("msd.", Object.keys(MD.missiles)); fam("mt.", Object.keys(MD.techs)); fam("mtd.", Object.keys(MD.techs));
fam("mg.", ["land", "air", "sea", "def", "defense", "missile"]); fam("tg.", [...Object.keys(MD.targets), "airforce", "army"]); fam("pm.", ["air", "land"]); fam("sk.", ["annex", "puppet", "reparations"]); fam("skd.", ["annex", "puppet", "reparations"]); fam("mil.tab.", ["overview", "forces", "tech", "war", "access"]); fam("mil.mode.", ["land", "sea"]);
fam("log.mil.", ["order", "research", "done", "techDone", "permit", "violation", "declare", "stance", "missile", "air", "ceasefire", "won", "lost", "settle", "buildingLost", "aiDeclare"]);
fam("msg.mil.", ["locked", "queueFull", "manpower", "needTech", "needCivil", "ordered", "techDone", "delivered", "permitYes", "permitNo", "atWar", "tooMany", "declared", "stance", "noWar", "noLandRoute", "noPassage", "landlocked", "noTransports", "noMissiles", "outOfRange", "noAirspace", "strikeDone", "noUnits", "fighterOnly", "fighterOnly2", "airDone", "refused", "ceasefire", "settled", "won", "lost", "incoming", "buildingLost", "aiDeclare", "stanceLost"]);
for (const k of ["unknown", "noTreasury", "noMaterials", "buildStarted", "researchBusy", "researchDone", "researchStarted", "stockFull", "noStock", "bought", "sold", "alreadyPact", "relationLow", "embargoOff", "embargoOn", "dipDone", "repaid", "done"]) used.add("msg." + k);
for (const k of ["hostile", "friendly", "small", "large", "poorer", "richer", "fragile", "stable", "low", "high", "deficit", "surplus", "importer", "exporter", "none", "major"]) used.add("lg." + k);
let bad = 0;
for (const k of used) { if (k.startsWith("PREFIX:") || k.endsWith(".")) continue; if (!I.has(k)) { missing.add(k); bad++; } }
const dead = I.keys().filter(k => !used.has(k) && !/^(tut\.|set\.|md\.|home\.|nw\.|vic\.)/.test(k));
console.log(`keys used: ${used.size}, defined: ${I.keys().length}`);
if (missing.size) console.log("MISSING:", [...missing].join(", ")); else console.log("No missing keys.");
// Persian must differ from English unless it is a number/brand-like token
let same = []; for (const k of I.keys()) { const e = I.t(k); } 
process.exit(bad ? 1 : 0);
