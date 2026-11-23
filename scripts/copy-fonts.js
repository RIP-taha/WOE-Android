// Copies the Vazirmatn Persian font from node_modules into src/fonts (runs after "npm install").
const fs = require("fs"), path = require("path");
try {
  const root = path.join(__dirname, "..", "node_modules", "vazirmatn");
  const found = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.woff2$/i.test(f.name) && /vazirmatn/i.test(f.name)) found.push(p); } })(root);
  const pick = found.find(p => /\[wght\]/i.test(p) && !/arabic|latin-digit|nl|ui/i.test(path.basename(p))) || found.find(p => /Regular/i.test(p)) || found[0];
  if (pick) { fs.mkdirSync(path.join(__dirname, "..", "src", "fonts"), { recursive: true }); fs.copyFileSync(pick, path.join(__dirname, "..", "src", "fonts", "Vazirmatn.woff2")); console.log("Persian font installed:", path.basename(pick)); }
  else console.log("Vazirmatn not found; system Persian fonts will be used.");
} catch (e) { console.log("Font step skipped:", e.message); }
process.exit(0);
