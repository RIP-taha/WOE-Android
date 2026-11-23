/* WORLD OF EMPIRES — procedural sound (UI effects + ambience) and a user music player */
(() => {
"use strict";
const KEY = "woe.audio";
const defaults = { master: .8, sfx: .7, ambient: .45, music: .7, mute: false, ambientOn: true, loop: true, shuffle: false };
let st = { ...defaults }; try { st = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
let ctx = null, master, sfxG, ambG, ambTimer = null, ambNodes = [], unlocked = false;
const listeners = new Set(); const emit = () => listeners.forEach(f => { try { f(); } catch {} });

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); sfxG = ctx.createGain(); ambG = ctx.createGain();
  sfxG.connect(master); ambG.connect(master); master.connect(ctx.destination); applyVol(); return ctx;
}
function applyVol() {
  if (!ctx) return; const m = st.mute ? 0 : st.master;
  master.gain.setTargetAtTime(m, ctx.currentTime, .05); sfxG.gain.setTargetAtTime(st.sfx, ctx.currentTime, .05);
  ambG.gain.setTargetAtTime(st.ambient * (music.playing ? .35 : 1), ctx.currentTime, .4);
  if (music.el) music.el.volume = st.mute ? 0 : Math.min(1, st.music * st.master);
}
function unlock() { if (unlocked) return; const c = ensure(); if (!c) return; if (c.state === "suspended") c.resume(); unlocked = true; if (st.ambientOn && !st.mute) startAmbient(); }
["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, unlock, { once: false, capture: true }));

/* ---------- effects ---------- */
function tone(freq, dur, type = "sine", vol = .2, when = 0, slide = 0) {
  if (!ensure() || !unlocked || st.mute) return; const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + .05);
}
function noise(dur, vol = .08, lo = 400, hi = 2400, when = 0) {
  if (!ensure() || !unlocked || st.mute) return; const t = ctx.currentTime + when, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(lo, t); f.frequency.exponentialRampToValueAtTime(hi, t + dur); f.Q.value = .9;
  const g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(sfxG); s.start(t);
}
const FX = {
  click: () => tone(520, .07, "triangle", .12), hover: () => tone(900, .03, "sine", .02),
  open: () => { noise(.22, .05, 300, 1800); tone(330, .16, "sine", .06, 0, 120); }, close: () => { noise(.18, .04, 1800, 300); tone(330, .14, "sine", .05, 0, -90); },
  select: () => { tone(440, .08, "triangle", .1); tone(660, .12, "triangle", .08, .05); },
  success: () => { tone(523, .14, "sine", .14); tone(659, .14, "sine", .12, .09); tone(784, .26, "sine", .12, .18); },
  error: () => { tone(180, .18, "sawtooth", .08); tone(140, .22, "sawtooth", .07, .1); },
  turn: () => { tone(196, .5, "sine", .16); tone(294, .6, "sine", .09, .02); noise(.3, .025, 200, 900); },
  event: () => { tone(740, .12, "triangle", .1); tone(988, .22, "triangle", .1, .12); },
  build: () => { noise(.09, .08, 800, 3000); noise(.09, .08, 800, 3000, .14); tone(240, .12, "square", .04, .02); },
  trade: () => { tone(1200, .06, "sine", .1); tone(1600, .12, "sine", .09, .06); },
  zoom: () => tone(300, .05, "sine", .02)
};
function play(name) { try { FX[name] && FX[name](); } catch {} }

/* ---------- ambience: slow drone pad + sparse bell notes ---------- */
const PENT = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
function startAmbient() {
  if (!ensure() || ambNodes.length || !st.ambientOn) return;
  const t = ctx.currentTime;
  [[65.41, "sine", .5], [98, "sine", .32], [130.81, "triangle", .12]].forEach(([f, type, v], i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f * (1 + i * .0008); fl.type = "lowpass"; fl.frequency.value = 520; g.gain.value = 0; g.gain.linearRampToValueAtTime(v * .22, t + 4);
    lfo.frequency.value = .05 + i * .03; lg.gain.value = v * .08; lfo.connect(lg); lg.connect(g.gain); o.connect(fl); fl.connect(g); g.connect(ambG); o.start(); lfo.start(); ambNodes.push(o, lfo);
  });
  const bell = () => {
    if (!ambNodes.length) return; if (!st.mute && unlocked) { const f = PENT[Math.floor(Math.random() * PENT.length)] * (Math.random() < .3 ? 2 : 1), tt = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.05, tt + .02); g.gain.exponentialRampToValueAtTime(.0001, tt + 3.2); o.connect(g); g.connect(ambG); o.start(tt); o.stop(tt + 3.4); }
    ambTimer = setTimeout(bell, 5000 + Math.random() * 9000);
  };
  ambTimer = setTimeout(bell, 3000); applyVol();
}
function stopAmbient() { clearTimeout(ambTimer); ambNodes.forEach(n => { try { n.stop(); } catch {} }); ambNodes = []; }

/* ---------- user music (files chosen in Settings) ---------- */
const music = { list: [], index: -1, el: null, playing: false, url: null, error: "" };
const api = () => window.worldAPI;
async function loadList() { try { music.list = (await api().listMusic()) || []; } catch { music.list = []; } emit(); return music.list; }
async function addFiles() {
  if (api() && api().pickMusic) { try { music.list = (await api().pickMusic()) || music.list; } catch (e) { music.error = String(e.message || e); } emit(); return; }
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "audio/*"; inp.multiple = true;
  inp.onchange = () => { for (const f of inp.files) music.list.push({ path: "blob:" + f.name, name: f.name, file: f }); emit(); }; inp.click();
}
async function removeTrack(i) {
  const t = music.list[i]; if (!t) return; if (i === music.index) stop();
  if (api() && api().removeMusic && !t.file) { try { music.list = (await api().removeMusic(t.path)) || []; } catch {} } else music.list.splice(i, 1);
  if (music.index > i) music.index--; emit();
}
async function playIndex(i) {
  if (!music.list.length) return; i = (i + music.list.length) % music.list.length; const t = music.list[i]; music.error = "";
  try {
    let blob; if (t.file) blob = t.file; else { const buf = await api().readMusic(t.path); blob = new Blob([buf instanceof ArrayBuffer ? buf : buf.buffer ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf]); }
    if (music.url) URL.revokeObjectURL(music.url); music.url = URL.createObjectURL(blob);
    if (!music.el) { music.el = new Audio(); music.el.addEventListener("ended", () => next(true)); music.el.addEventListener("error", () => { music.error = "decode"; music.playing = false; applyVol(); emit(); }); }
    music.el.src = music.url; music.index = i; applyVol(); await music.el.play(); music.playing = true;
  } catch (e) { music.playing = false; music.error = "play"; }
  applyVol(); emit();
}
function toggle() { if (!music.el || music.index < 0) { playIndex(Math.max(0, music.index)); return; } if (music.el.paused) { music.el.play().then(() => { music.playing = true; applyVol(); emit(); }); } else { music.el.pause(); music.playing = false; applyVol(); emit(); } }
function stop() { if (music.el) { music.el.pause(); music.el.currentTime = 0; } music.playing = false; applyVol(); emit(); }
function next(auto) { if (!music.list.length) return; if (auto && !st.loop && music.index === music.list.length - 1 && !st.shuffle) { stop(); return; } playIndex(st.shuffle ? Math.floor(Math.random() * music.list.length) : music.index + 1); }
function prev() { playIndex(music.index - 1); }

window.WOE_AUDIO = {
  play, state: () => st, music, loadList, addFiles, removeTrack, playIndex, toggle, stop, next, prev, onChange: f => listeners.add(f),
  set(k, v) { st[k] = v; save(); applyVol(); if (k === "ambientOn") { v ? (unlocked && startAmbient()) : stopAmbient(); } if (k === "mute") { if (v) { if (music.el) music.el.pause(); } else { if (music.playing && music.el) music.el.play().catch(() => {}); if (st.ambientOn && unlocked) startAmbient(); } } emit(); },
  unlock
};
})();
