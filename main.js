const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
const safe = v => String(v || "").replace(/[^a-zA-Z0-9_-]/g, "");
const dir = name => { const d = path.join(app.getPath("userData"), name); fs.mkdirSync(d, { recursive: true }); return d; };
const readJSON = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };
const writeAtomic = (file, text) => { const tmp = file + ".tmp"; fs.writeFileSync(tmp, text, "utf8"); fs.renameSync(tmp, file); };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1100, minHeight: 700,
    backgroundColor: "#070b10", title: "WORLD OF EMPIRES", autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
}

/* ---------- Saves ---------- */
ipcMain.handle("world:list", async () => {
  const d = dir("saves");
  return fs.readdirSync(d).filter(f => f.endsWith(".json")).map(f => {
    const data = readJSON(path.join(d, f), null);
    if (!data || !data.id) return null;
    return { id: data.id, name: data.name, year: data.currentYear, month: data.currentMonth,
      country: data.playerCountry?.name || data.playerCountry?.id || "?", countryId: data.playerCountry?.id, scenario: data.scenarioId, sandbox: !!data.sandbox, updatedAt: data.updatedAt };
  }).filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
});
ipcMain.handle("world:save", async (_e, world) => {
  if (!world || typeof world !== "object" || !world.id) throw new Error("Invalid world data.");
  const id = safe(world.id); if (!id) throw new Error("Invalid save identifier.");
  writeAtomic(path.join(dir("saves"), id + ".json"), JSON.stringify(world));
  return { success: true };
});
ipcMain.handle("world:load", async (_e, id) => {
  const file = path.join(dir("saves"), safe(id) + ".json");
  if (!fs.existsSync(file)) throw new Error("Save not found.");
  return JSON.parse(fs.readFileSync(file, "utf8"));
});
ipcMain.handle("world:delete", async (_e, id) => {
  const file = path.join(dir("saves"), safe(id) + ".json");
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return { success: true };
});

/* ---------- Mods (JSON files in userData/mods) ---------- */
ipcMain.handle("mods:list", async () => {
  const d = dir("mods");
  return fs.readdirSync(d).filter(f => f.endsWith(".json")).map(f => readJSON(path.join(d, f), null)).filter(m => m && m.id);
});
ipcMain.handle("mods:import", async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openFile", "multiSelections"], filters: [{ name: "Mod (JSON)", extensions: ["json"] }] });
  if (r.canceled) return [];
  const out = [];
  for (const f of r.filePaths) {
    const m = readJSON(f, null);
    if (m && typeof m === "object" && safe(m.id)) { m.id = safe(m.id); writeAtomic(path.join(dir("mods"), m.id + ".json"), JSON.stringify(m, null, 2)); out.push(m); }
  }
  return out;
});
ipcMain.handle("mods:delete", async (_e, id) => {
  const f = path.join(dir("mods"), safe(id) + ".json");
  if (fs.existsSync(f)) fs.unlinkSync(f);
  return true;
});
ipcMain.handle("mods:openFolder", async () => { const { shell } = require("electron"); shell.openPath(dir("mods")); return true; });

/* ---------- Music playlist ---------- */
const playlistFile = () => path.join(app.getPath("userData"), "music.json");
const getPlaylist = () => readJSON(playlistFile(), []).filter(t => t && t.path && fs.existsSync(t.path));
ipcMain.handle("music:list", async () => getPlaylist());
ipcMain.handle("music:pick", async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openFile", "multiSelections"], filters: [{ name: "Audio", extensions: ["mp3", "ogg", "wav", "m4a", "flac", "aac", "opus"] }] });
  if (r.canceled) return getPlaylist();
  const list = getPlaylist();
  for (const p of r.filePaths) if (!list.some(t => t.path === p)) list.push({ path: p, name: path.basename(p) });
  writeAtomic(playlistFile(), JSON.stringify(list));
  return list;
});
ipcMain.handle("music:remove", async (_e, p) => {
  const list = getPlaylist().filter(t => t.path !== p);
  writeAtomic(playlistFile(), JSON.stringify(list));
  return list;
});
ipcMain.handle("music:read", async (_e, p) => {
  const t = getPlaylist().find(x => x.path === p);
  if (!t) throw new Error("Track not in playlist.");
  return fs.readFileSync(t.path);
});

/* ---------- Optional detailed map data (GeoJSON, e.g. Natural Earth) ---------- */
ipcMain.handle("geo:load", async () => {
  const candidates = [path.join(app.getPath("userData"), "maps", "world.geojson"), path.join(__dirname, "src", "data", "world.geojson")];
  for (const c of candidates) if (fs.existsSync(c)) { try { return fs.readFileSync(c, "utf8"); } catch {} }
  return null;
});
ipcMain.handle("geo:folder", async () => { const { shell } = require("electron"); shell.openPath(dir("maps")); return true; });

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
