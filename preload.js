const { contextBridge, ipcRenderer } = require("electron");
const call = ch => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld("worldAPI", {
  listWorlds: call("world:list"), saveWorld: call("world:save"), loadWorld: call("world:load"), deleteWorld: call("world:delete"),
  listMods: call("mods:list"), importMods: call("mods:import"), deleteMod: call("mods:delete"), openModsFolder: call("mods:openFolder"),
  listMusic: call("music:list"), pickMusic: call("music:pick"), removeMusic: call("music:remove"), readMusic: call("music:read"),
  loadGeo: call("geo:load"), openMapsFolder: call("geo:folder")
});
