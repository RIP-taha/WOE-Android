/* WORLD OF EMPIRES — boot, home screen, new-world flow, language, shortcuts */
(() => {
"use strict";
const UI = window.UI, E = WOE, D = WOE_DATA, T = I18N, A = WOE_AUDIO, G = WOE_GEO, t = T.t, esc = UI.esc, $ = UI.$, $$ = UI.$$;
let homeMap = null, driftT = 0;

function showScreen(id) {
  for (const s of $$(".screen")) { s.classList.toggle("active", s.id === id); s.classList.remove("enter"); }
  const el = $("#" + id); void el.offsetWidth; el.classList.add("enter");
}
/* ---------- home ---------- */
async function renderHome() {
  let list = []; try { list = await UI.store.list(); } catch (e) { UI.toast(t("msg.listFail"), true); }
  $("#saveCount").textContent = t("home.count", { n: list.length });
  $("#saveList").innerHTML = list.length ? list.map(s => {
    const nm = s.countryId && s.countryId !== "CUS" ? T.cname(s.countryId) : s.country;
    return `<div class="save-item"><div><b>${esc(s.name)}</b>${s.sandbox ? ` <span class="tag gold">${t("home.sandboxTag")}</span>` : ""}<div class="mini">${esc(nm)} · ${esc(T.date(s.year, s.month))}${s.scenario && D.scenarios[s.scenario] ? " · " + esc(T.tx(D.scenarios[s.scenario].name)) : ""}</div></div><div class="acts"><button class="primary" data-act="openSave" data-id="${esc(s.id)}">${t("home.continue")}</button><button class="icon-btn sm" data-act="delSave" data-id="${esc(s.id)}" aria-label="${esc(t("md.delete"))}"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button></div></div>`;
  }).join("") : `<div class="empty">${t("home.empty")}</div>`;
  $("#homeLangTxt").textContent = T.lang() === "fa" ? "English" : "فارسی";
}
function initHomeMap() {
  if (homeMap) return;
  homeMap = new MapView($("#homeCanvas"), { fill: id => ({ west: "rgba(79,140,255,.34)", east: "rgba(226,88,77,.30)", neutral: "rgba(83,194,139,.28)" }[(D.countries[id] || {}).bloc] || "#2a3a47"), active: id => id !== "CUS", name: id => "", cityName: () => "", seaName: () => "", riverName: () => "", chokeName: () => "", font: () => "sans-serif", mine: () => null });
  homeMap.opts = { labels: false, cities: false, relief: true, flows: false, builds: false };
  homeMap.t = { cx: 0, cy: .45, k: homeMap.kMin * 1.7 }; homeMap.limit(); homeMap.v = { ...homeMap.t };
  setInterval(() => { if (!$("#home").classList.contains("active")) return; driftT += .0035; homeMap.t.cx = Math.sin(driftT) * 2.2; homeMap.limit(); homeMap.dirty = true; }, 40);
}
UI.act.openSave = async el => {
  try { const w = await UI.store.load(el.dataset.id); UI.tutorial = false; await UI.openWorld(w); } catch (e) { UI.toast(t("msg.loadFail") + " " + (e.message || ""), true); A.play("error"); }
};
UI.act.delSave = el => {
  const id = el.dataset.id; UI.modal(`<h2>${t("home.confirmDelete")}</h2><p class="desc">${t("home.confirmDeleteText")}</p><div class="actions"><button class="ghost" data-act="closeModal">${t("md.cancel")}</button><button class="danger" id="confirmDel">${t("md.delete")}</button></div>`, m => { m.querySelector("#confirmDel").onclick = async () => { await UI.store.del(id); UI.closeModal(); renderHome(); }; });
};

/* ---------- new world ---------- */
function openNewWorld() {
  const st = { country: "CUS", scenario: "modern", diff: "normal", mods: [] };
  const names = Object.keys(D.countries).sort((a, b) => D.countries[a][T.lang()].localeCompare(D.countries[b][T.lang()], T.lang()));
  const m = UI.modal(`<p class="eyebrow">${t("nw.eyebrow")}</p><h2>${t("nw.title")}</h2>
    <div class="field"><label>${t("nw.worldName")}</label><input type="text" id="nwName" maxlength="32" placeholder="${esc(t("nw.worldPh"))}"></div>
    <div class="field"><label>${t("nw.country")}</label><select id="nwCountry"><option value="CUS">★ ${esc(t("nw.custom"))}</option>${names.map(id => `<option value="${id}">${esc(D.countries[id][T.lang()])} — ${esc(T.money(D.countries[id].gdp * 1e9))}</option>`).join("")}</select></div>
    <div class="field" id="nwNationBox"><label>${t("nw.nationName")}</label><input type="text" id="nwNation" maxlength="24" value="Veyra"></div>
    <div class="field"><label>${t("nw.scenario")}</label><div class="scn-grid">${Object.entries(D.scenarios).map(([k, s]) => `<button class="scn ${k === "modern" ? "on" : ""}" data-sc="${k}"><b>${esc(T.tx(s.name))}</b><span>${esc(T.tx(s.desc))}</span></button>`).join("")}</div></div>
    <div class="field"><label>${t("nw.difficulty")}</label><div class="seg" id="nwDiff">${["easy", "normal", "hard"].map(d => `<button data-d="${d}" class="${d === "normal" ? "on" : ""}">${t("diff." + d)}</button>`).join("")}</div></div>
    <div class="field"><label class="switch" style="padding-top:0"><span>${t("nw.sandbox")}</span><span class="tg"><input type="checkbox" id="nwSandbox"><i></i></span></label><p class="mini">${t("nw.sandboxDesc")}</p></div>
    <div class="field"><label>${t("nw.mods")}</label><div class="modlist">${E.allMods().map(md => `<div class="modrow"><span class="tg"><input type="checkbox" data-mod="${esc(md.id)}"><i></i></span><div><b>${esc(T.tx(md.name))}</b><p>${esc(T.tx(md.description))}</p></div></div>`).join("")}</div></div>
    <div class="actions"><button class="ghost" data-act="closeModal">${t("md.cancel")}</button><button class="primary big" id="nwCreate">${t("nw.create")}</button></div>`, root => {
    const nat = root.querySelector("#nwNationBox"); root.querySelector("#nwCountry").onchange = e => { st.country = e.target.value; nat.classList.toggle("hidden", st.country !== "CUS"); };
    root.querySelectorAll("[data-sc]").forEach(b => b.onclick = () => { st.scenario = b.dataset.sc; root.querySelectorAll("[data-sc]").forEach(x => x.classList.toggle("on", x === b)); A.play("select"); });
    root.querySelectorAll("#nwDiff button").forEach(b => b.onclick = () => { st.diff = b.dataset.d; root.querySelectorAll("#nwDiff button").forEach(x => x.classList.toggle("on", x === b)); A.play("click"); });
    root.querySelectorAll("[data-mod]").forEach(c => c.onchange = () => { st.mods = [...root.querySelectorAll("[data-mod]:checked")].map(x => x.dataset.mod); });
    root.querySelector("#nwCreate").onclick = async () => {
      try {
        const sc0 = D.scenarios[st.scenario], nm0 = root.querySelector("#nwName").value.trim() || (st.country === "CUS" ? (root.querySelector("#nwNation").value.trim() || "Veyra") : T.cname(st.country)) + " " + sc0.year;
        const w = E.newWorld({ worldName: nm0, countryId: st.country, nationName: root.querySelector("#nwNation").value, scenarioId: st.scenario, difficulty: st.diff, mods: st.mods, sandbox: root.querySelector("#nwSandbox").checked });
        await UI.store.save(w); UI.closeModal(); UI.tutorial = false; await UI.openWorld(w); A.play("success");
      } catch (e) { console.error(e); UI.toast(t("msg.error") + " " + e.message, true); }
    };
  });
}

/* ---------- open / close a world ---------- */
UI.openWorld = async w => {
  w = E.migrate(w); w.settings = Object.assign({ autosave: true, speed: 1 }, w.settings || {});
  UI.stop(); UI.w = w; UI.bpos = {}; UI.sel = null; UI.layer = "political"; UI.com = "oil"; UI.tab = null; UI.newEvents = 0;
  T.ctx.customName = w.playerCountry.name || "Veyra"; T.ctx.playerId = w.playerCountry.id;
  $("#panel").classList.remove("open"); document.documentElement.style.setProperty("--pw", "0px");
  showScreen("game"); UI.initMap(); UI.map.resize(); UI.render(); UI.openTab("overview", true);
  setTimeout(() => { UI.map.resize(); UI.map.focus(w.playerCountry.id, .35); }, 650);
  A.play("open");
};
UI.backToMenu = async () => { UI.stop(); if (!UI.tutorial) await UI.saveSilently(); UI.tutorial = false; if (window.WOE_TUT) WOE_TUT.stopCoach(); UI.w = null; UI.closeModal(); showScreen("home"); renderHome(); };
UI.act.menu = () => { UI.closeModal(); UI.backToMenu(); };
UI.act.gameMenu = () => UI.modal(`<p class="eyebrow">${esc(UI.w.name)}</p><h2>${t("top.menu")}</h2><div class="btn-grid" style="grid-template-columns:1fr"><button class="primary" data-act="closeModal">${t("menu.resume")}</button><button data-act="saveNow">${t("top.save")}</button><button data-act="openSettings">${t("nav.settings")}</button><button data-act="openTutorialFromGame">${t("home.tutorial")}</button><button class="danger" data-act="menu">${t("set.menu")}</button></div>`);
UI.act.openSettings = () => { UI.closeModal(); UI.openTab("settings"); };
UI.act.openTutorialFromGame = () => { UI.closeModal(); WOE_TUT.open(true); };

/* ---------- language ---------- */
UI.setLang = l => {
  T.setLang(l); T.apply(document); renderHome(); $("#btnTopLang").textContent = l === "fa" ? "EN" : "فارسی";
  if (UI.w) { UI.render(); } if (UI.map) UI.map.dirty = true; if (homeMap) homeMap.dirty = true; if (window.WOE_TUT) WOE_TUT.refresh();
  const nm = $("#modalRoot .modal"); if (nm && nm.querySelector("#nwCreate")) { UI.closeModal(); openNewWorld(); }
};

/* ---------- mods manager from the home screen ---------- */
function openModsManager() {
  UI.modal(`<p class="eyebrow">${t("md.eyebrow")}</p><h2>${t("home.mods")}</h2><p class="desc">${t("md.desc")}</p><div class="modlist" id="homeModList">${UI.modsList(false)}</div><div class="btn-row" style="margin-top:14px"><button class="primary" data-act="modImport">${t("md.import")}</button>${window.worldAPI && window.worldAPI.openModsFolder ? `<button data-act="modFolder">${t("md.folder")}</button>` : ""}</div><div class="actions"><button class="ghost" data-act="closeModal">${t("md.close")}</button></div>`);
}

/* ---------- boot ---------- */
async function boot() {
  T.setLang(T.lang()); T.apply(document);
  try { const mods = await UI.store.mods(); E.setUserMods(mods); } catch {}
  try { if (window.worldAPI && window.worldAPI.loadGeo) { const txt = await window.worldAPI.loadGeo(); if (txt) { const n = G.applyGeoJSON(txt); if (n) UI.geoSource = t("set.customMap", { n }); } } } catch {}
  A.loadList();
  initHomeMap(); renderHome();
  $("#btnNew").onclick = () => { A.play("click"); openNewWorld(); };
  $("#btnTutorial").onclick = () => { A.play("click"); WOE_TUT.open(false); };
  $("#btnHomeMods").onclick = () => { A.play("click"); openModsManager(); };
  $("#homeLang").onclick = () => UI.setLang(T.lang() === "fa" ? "en" : "fa");
  $("#btnTopLang").onclick = () => UI.setLang(T.lang() === "fa" ? "en" : "fa");
  $("#homeSound").onclick = () => { A.set("mute", !A.state().mute); $("#homeSound").style.opacity = A.state().mute ? .45 : 1; };
  $("#btnTopSound").onclick = () => { A.set("mute", !A.state().mute); UI.renderTop(); };
  $("#btnMenu").onclick = () => { A.play("click"); UI.act.gameMenu(); };
  $("#btnSave").onclick = () => UI.act.saveNow();
  $("#panelClose").onclick = () => UI.closePanel(); $("#panelWide").onclick = () => UI.toggleWide();
  $("#btnAdvance").onclick = () => { if (UI.playing) UI.stop(); UI.advance(); };
  $("#btnPlay").onclick = () => { A.play("click"); UI.playing ? UI.stop() : UI.play(); };
  $$("#speedSeg button").forEach(b => b.onclick = () => { A.play("click"); UI.setSpeed(+b.dataset.speed); });
  $("#zIn").onclick = () => UI.map.zoomBy(1.6); $("#zOut").onclick = () => UI.map.zoomBy(1 / 1.6); $("#zWorld").onclick = () => { UI.map.fitWorld(); }; $("#zHome").onclick = () => UI.map.focus(UI.w.playerCountry.id, .35); $("#zOpts").onclick = () => { $("#mapOpts").classList.toggle("hidden"); A.play("click"); };
  /* shortcuts */
  document.addEventListener("keydown", e => {
    const tag = (e.target.tagName || "").toLowerCase(), typing = ["input", "textarea", "select"].includes(tag) && e.target.type !== "range" && e.target.type !== "checkbox";
    if (e.key === "Escape") { if ($("#modalRoot .modal-back")) UI.closeModal(); else if (window.WOE_TUT && WOE_TUT.isOpen()) WOE_TUT.close(); else if (UI.sel) UI.selectCountry(null); else if (UI.tab) UI.closePanel(); return; }
    if (typing || !UI.w || !$("#game").classList.contains("active") || $("#modalRoot .modal-back")) return;
    if (e.key === " " && (tag === "body" || tag === "canvas")) { e.preventDefault(); if (UI.playing) UI.stop(); UI.advance(); }
    else if (e.key === "p" || e.key === "P") { UI.playing ? UI.stop() : UI.play(); }
    else if (e.key === "m" || e.key === "M") { A.set("mute", !A.state().mute); UI.renderTop(); }
    else if (e.key === "+" || e.key === "=") UI.map.zoomBy(1.4); else if (e.key === "-") UI.map.zoomBy(1 / 1.4);
  });
  window.addEventListener("error", e => { console.error(e.error || e.message); });
  window.addEventListener("unhandledrejection", e => { console.error(e.reason); });
  window.addEventListener("resize", () => { if (UI.map) UI.map.resize(); });
}
boot();
})();
