/* WORLD OF EMPIRES — permanent interactive map (canvas, Miller projection, smooth zoom/pan) */
(() => {
"use strict";
const G = window.WOE_GEO, D = window.WOE_DATA;
const RAD = Math.PI / 180;
const proj = (lon, lat) => [lon * RAD, 1.25 * Math.log(Math.tan(Math.PI / 4 + .4 * lat * RAD))];
const unproj = (x, y) => [x / RAD, (2.5 * Math.atan(Math.exp(.8 * y)) - .625 * Math.PI) / RAD];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Y_MIN = -2.15, Y_MAX = 2.15;

function ringProj(r) { const a = new Float64Array(r.length * 2); r.forEach((p, i) => { const q = proj(p[0], p[1]); a[i * 2] = q[0]; a[i * 2 + 1] = q[1]; }); return a; }
function pathOf(rings) { const p = new Path2D(); for (const a of rings) { p.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) p.lineTo(a[i], a[i + 1]); p.closePath(); } return p; }
function bboxOf(a) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < a.length; i += 2) { x0 = Math.min(x0, a[i]); x1 = Math.max(x1, a[i]); y0 = Math.min(y0, a[i + 1]); y1 = Math.max(y1, a[i + 1]); } return [x0, y0, x1, y1]; }
function areaCentroid(a) { let A = 0, cx = 0, cy = 0; const n = a.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n, x0 = a[i * 2], y0 = a[i * 2 + 1], x1 = a[j * 2], y1 = a[j * 2 + 1], f = x0 * y1 - x1 * y0; A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f; } A /= 2; if (Math.abs(A) < 1e-9) return { A: 0, c: [a[0], a[1]] }; return { A: Math.abs(A), c: [cx / (6 * A), cy / (6 * A)] }; }
function inRing(a, x, y) { let c = false; const n = a.length / 2; for (let i = 0, j = n - 1; i < n; j = i++) { const xi = a[i * 2], yi = a[i * 2 + 1], xj = a[j * 2], yj = a[j * 2 + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }

class MapView {
  constructor(canvas, hooks) {
    this.cv = canvas; this.ctx = canvas.getContext("2d"); this.h = hooks; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = 800; this.H = 500; this.v = { cx: 0.3, cy: 0.45, k: 100 }; this.t = { ...this.v };
    this.strikes = []; this.warIds = []; this.sel = null; this.hover = null; this.layer = "political"; this.flows = []; this.markers = []; this.shocks = []; this.opts = { labels: true, cities: true, relief: true, flows: true, builds: true };
    this.time = 0; this.dirty = true; this.pointers = new Map(); this.lastTap = 0; this.anims = 0;
    this.buildGeometry(); this.bind(); this.resize(); this.fitWorld(true); this.loop();
  }
  buildGeometry() {
    this.cs = {};
    for (const [id, polys] of Object.entries(G.countries)) {
      const rings = polys.map(ringProj), info = rings.map(a => ({ a, bb: bboxOf(a), ac: areaCentroid(a) }));
      const big = info.reduce((m, x) => x.ac.A > m.ac.A ? x : m, info[0]);
      this.cs[id] = { id, rings: info, path: pathOf(rings), c: big.ac.c, bb: big.bb, area: info.reduce((s, x) => s + x.ac.A, 0) };
    }
    this.landPath = pathOf(G.land.map(ringProj)); this.waterPaths = G.water.map(w => pathOf([ringProj(w.pts)]));
    this.rivers = G.rivers.map(r => ({ ...r, a: ringProj(r.pts) }));
    this.mts = G.mountains.map(m => { const a = ringProj(m.pts), tri = []; for (let i = 0; i + 3 < a.length; i += 2) { const x0 = a[i], y0 = a[i + 1], x1 = a[i + 2], y1 = a[i + 3], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / .045)); for (let j = 0; j < n; j++) { const f = (j + .5) / n, jx = Math.sin((i + j) * 12.9898) * .008, jy = Math.cos((i + j) * 78.233) * .008; tri.push([x0 + (x1 - x0) * f + jx, y0 + (y1 - y0) * f + jy, .7 + ((i * 7 + j * 13) % 5) / 8]); } } return { ...m, tri, mid: [a[Math.floor(a.length / 4) * 2], a[Math.floor(a.length / 4) * 2 + 1]] }; });
    this.cities = D.cities.map(c => ({ ...c, p: proj(c.x, c.y) }));
    this.chokes = D.chokepoints.map(c => ({ ...c, p: proj(c.x, c.y) }));
    this.seas = D.seas.map(s => ({ ...s, p: proj(s.x, s.y) }));
  }
  bind() {
    const cv = this.cv;
    new ResizeObserver(() => this.resize()).observe(cv.parentElement);
    cv.addEventListener("wheel", e => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0016))); this.h.onView && this.h.onView(); }, { passive: false });
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }); if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; } });
    cv.addEventListener("pointermove", e => {
      const p = this.pointers.get(e.pointerId); const r = cv.getBoundingClientRect();
      if (p) {
        const dx = e.clientX - p.x, dy = e.clientY - p.y; if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 4) p.moved = true; p.x = e.clientX; p.y = e.clientY;
        if (this.pointers.size === 2 && this.pinch) { const [a, b] = [...this.pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); this.zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / this.pinch.d, true); this.pinch.d = d; }
        else if (p.moved) { this.t.cx -= dx / this.t.k; this.t.cy += dy / this.t.k; this.v.cx = this.t.cx; this.v.cy = this.t.cy; this.limit(); cv.style.cursor = "grabbing"; this.dirty = true; this.h.onView && this.h.onView(); }
      } else { this.setHover(this.pick(e.clientX - r.left, e.clientY - r.top), e); }
    });
    const up = e => { const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId); this.pinch = null; cv.style.cursor = ""; if (p && !p.moved) { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now(); const mk = this.pickMarker(x, y); if (mk && this.h.onMarker) this.h.onMarker(mk); else { const id = this.pick(x, y); this.select(id); this.h.onSelect && this.h.onSelect(id); } if (now - this.lastTap < 320) this.zoomAt(x, y, 1.9); this.lastTap = now; } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", e => { this.pointers.delete(e.pointerId); this.pinch = null; });
    cv.addEventListener("pointerleave", () => this.setHover(null));
  }
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
    this.W = r.width; this.H = r.height; this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr); this.cv.style.width = this.W + "px"; this.cv.style.height = this.H + "px";
    const old = this.kMin; this.kMin = Math.max(this.W / 6.35, this.H / 4.15); this.kMax = this.kMin * 70;
    if (!old) { this.v.k = this.t.k = this.kMin; } else { const f = this.kMin / old; this.v.k *= f; this.t.k *= f; }
    this.limit(); this.dirty = true;
  }
  limit() {
    for (const o of [this.v, this.t]) {
      o.k = clamp(o.k, this.kMin, this.kMax); const hw = this.W / (2 * o.k), hh = this.H / (2 * o.k);
      o.cx = hw * 2 >= 2 * Math.PI ? 0 : clamp(o.cx, -Math.PI + hw, Math.PI - hw); o.cy = hh * 2 >= Y_MAX - Y_MIN ? (Y_MAX + Y_MIN) / 2 : clamp(o.cy, Y_MIN + hh, Y_MAX - hh);
    }
  }
  fitWorld(instant) { this.t = { cx: 0, cy: .12, k: this.kMin }; this.limit(); if (instant) { this.v = { ...this.t }; } this.dirty = true; }
  zoomAt(sx, sy, f, instant) {
    const k0 = this.t.k, k1 = clamp(k0 * f, this.kMin, this.kMax); if (k1 === k0) return;
    const wx = this.t.cx + (sx - this.W / 2) / k0, wy = this.t.cy - (sy - this.H / 2) / k0;
    this.t.k = k1; this.t.cx = wx - (sx - this.W / 2) / k1; this.t.cy = wy + (sy - this.H / 2) / k1; this.limit();
    if (instant) { this.v = { ...this.t }; } this.dirty = true;
  }
  zoomBy(f) { this.zoomAt(this.W / 2, this.H / 2, f); this.h.onView && this.h.onView(); }
  focus(id, zoom) {
    const c = this.cs[id]; if (!c) return;
    const w = c.bb[2] - c.bb[0], h = c.bb[3] - c.bb[1], k = clamp(Math.min(this.W / (w * 2.6), this.H / (h * 2.6)), this.kMin * 1.25, this.kMax * (zoom || .5));
    this.t = { cx: (c.bb[0] + c.bb[2]) / 2, cy: (c.bb[1] + c.bb[3]) / 2, k }; this.limit(); this.dirty = true;
  }
  focusPoint(lon, lat, zoomMul) { const p = proj(lon, lat); this.t = { cx: p[0], cy: p[1], k: clamp(this.kMin * (zoomMul || 6), this.kMin, this.kMax) }; this.limit(); this.dirty = true; }
  toScreen(x, y) { return [(x - this.v.cx) * this.v.k + this.W / 2, this.H / 2 - (y - this.v.cy) * this.v.k]; }
  toWorld(sx, sy) { return [this.v.cx + (sx - this.W / 2) / this.v.k, this.v.cy - (sy - this.H / 2) / this.v.k]; }
  pick(sx, sy) {
    const [x, y] = this.toWorld(sx, sy);
    for (const c of Object.values(this.cs)) { if (this.h.active && !this.h.active(c.id)) continue; for (const r of c.rings) { const b = r.bb; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue; if (inRing(r.a, x, y)) return c.id; } }
    return null;
  }
  pickMarker(sx, sy) { if (!this.opts.builds) return null; for (const m of this.markers) { const [px, py] = this.toScreen(m.p[0], m.p[1]); if (Math.hypot(px - sx, py - sy) < 11) return m; } return null; }
  setHover(id, e) {
    const mk = e ? this.pickMarker(e.clientX - this.cv.getBoundingClientRect().left, e.clientY - this.cv.getBoundingClientRect().top) : null;
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
    this.cv.style.cursor = mk || id ? "pointer" : ""; if (this.h.onHover) this.h.onHover(id, e, mk);
  }
  select(id) { this.sel = id; this.dirty = true; }
  setMarkers(list) { this.markers = list.map(m => ({ ...m, p: proj(m.lon, m.lat) })); this.dirty = true; }
  addStrike(a, b, n) { this.strikes.push({ a: proj(a[0], a[1]), b: proj(b[0], b[1]), t0: this.time, dur: 2400, n: n || 3 }); this.dirty = true; }
  setFlows(list) { this.flows = list.map(f => ({ ...f, a: proj(f.from[0], f.from[1]), b: proj(f.to[0], f.to[1]) })); this.dirty = true; }
  loop() {
    const step = ts => {
      if (!this.cv.getClientRects().length) { this.last = ts; this.raf = requestAnimationFrame(step); return; }
      const dt = Math.min(50, ts - (this.last || ts)); this.last = ts; this.time += dt;
      const v = this.v, t = this.t, e = 1 - Math.pow(1 - .2, dt / 16.7);
      if (Math.abs(t.k - v.k) > 1e-4 * v.k || Math.abs(t.cx - v.cx) > .05 / v.k || Math.abs(t.cy - v.cy) > .05 / v.k) { v.k += (t.k - v.k) * e; v.cx += (t.cx - v.cx) * e; v.cy += (t.cy - v.cy) * e; this.dirty = true; this.h.onView && this.h.onView(); }
      else if (v.k !== t.k || v.cx !== t.cx || v.cy !== t.cy) { v.k = t.k; v.cx = t.cx; v.cy = t.cy; this.dirty = true; }
      const animating = this.strikes.length || this.warIds.length || (this.opts.flows && this.flows.length) || this.markers.some(m => m.building) || this.shocks.length;
      if (this.dirty || (animating && ts - (this.lastDraw || 0) > 33)) { this.draw(); this.lastDraw = ts; this.dirty = false; }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  destroy() { cancelAnimationFrame(this.raf); }

  draw() {
    const ctx = this.ctx, { W, H, dpr } = this, v = this.v, k = v.k, rel = k / this.kMin, cs = getComputedStyle(this.cv.parentElement);
    const col = n => cs.getPropertyValue(n).trim() || "#888";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.setTransform(k * dpr, 0, 0, -k * dpr, (W / 2 - v.cx * k) * dpr, (H / 2 + v.cy * k) * dpr);
    const px = 1 / k;
    /* graticule */
    ctx.lineWidth = px; ctx.strokeStyle = col("--grid"); ctx.beginPath();
    const step = rel > 6 ? 5 : rel > 2.5 ? 10 : 30;
    for (let lo = -180; lo <= 180; lo += step) { const x = lo * RAD; ctx.moveTo(x, Y_MIN); ctx.lineTo(x, Y_MAX); }
    for (let la = -80; la <= 80; la += step) { const y = proj(0, la)[1]; ctx.moveTo(-Math.PI, y); ctx.lineTo(Math.PI, y); }
    ctx.stroke();
    ctx.strokeStyle = col("--grid2"); ctx.beginPath(); const eq = proj(0, 0)[1]; ctx.moveTo(-Math.PI, eq); ctx.lineTo(Math.PI, eq); ctx.stroke();
    /* land */
    ctx.fillStyle = col("--land"); ctx.fill(this.landPath); ctx.lineWidth = px * 1; ctx.strokeStyle = col("--coast"); ctx.stroke(this.landPath);
    ctx.fillStyle = col("--sea"); for (const p of this.waterPaths) { ctx.fill(p); ctx.lineWidth = px; ctx.strokeStyle = col("--coast"); ctx.stroke(p); }
    /* countries */
    const fillFor = this.h.fill, stroke = col("--border"), brass = col("--brass");
    for (const c of Object.values(this.cs)) {
      if (this.h.active && !this.h.active(c.id)) continue;
      ctx.fillStyle = fillFor(c.id); ctx.fill(c.path);
      if (c.id === this.hover && c.id !== this.sel) { ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fill(c.path); }
    }
    ctx.lineWidth = Math.max(px * .8, px * (.6 + rel * .12)); ctx.strokeStyle = stroke; ctx.lineJoin = "round";
    for (const c of Object.values(this.cs)) { if (this.h.active && !this.h.active(c.id)) continue; ctx.stroke(c.path); }
    /* relief: rivers, mountains */
    if (this.opts.relief && rel > 1.35) {
      ctx.lineWidth = Math.min(px * 1.8, px * (.8 + rel * .08)); ctx.strokeStyle = col("--river"); ctx.lineCap = "round";
      for (const r of this.rivers) { ctx.beginPath(); ctx.moveTo(r.a[0], r.a[1]); for (let i = 2; i < r.a.length; i += 2) ctx.lineTo(r.a[i], r.a[i + 1]); ctx.stroke(); }
      ctx.globalAlpha = .8; ctx.fillStyle = col("--mount"); const s = Math.min(.011, .003 + rel * .0006);
      ctx.beginPath(); for (const m of this.mts) for (const t of m.tri) { const z = s * t[2]; ctx.moveTo(t[0] - z, t[1] - z * .7); ctx.lineTo(t[0], t[1] + z); ctx.lineTo(t[0] + z, t[1] - z * .7); ctx.closePath(); } ctx.fill(); ctx.globalAlpha = 1;
    }
    /* selection */
    const sc = this.sel && this.cs[this.sel];
    if (sc) { ctx.save(); ctx.shadowColor = brass; ctx.shadowBlur = 14 * dpr; ctx.lineWidth = px * 2.4; ctx.strokeStyle = brass; ctx.stroke(sc.path); ctx.restore(); ctx.lineWidth = px * 1.2; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.stroke(sc.path); }
    for (const id of this.warIds) { const c = this.cs[id]; if (!c) continue; ctx.globalAlpha = .55 + .35 * Math.sin(this.time / 380); ctx.lineWidth = px * 2.2; ctx.strokeStyle = "#ff5a4d"; ctx.stroke(c.path); ctx.globalAlpha = 1; }
    if (this.h.mine && this.cs[this.h.mine()] && this.h.mine() !== this.sel) { ctx.lineWidth = px * 1.8; ctx.strokeStyle = col("--teal"); ctx.stroke(this.cs[this.h.mine()].path); }
    /* screen-space layer */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const placed = [];
    const free = (x, y, w, h) => { for (const r of placed) if (x < r[0] + r[2] && x + w > r[0] && y < r[1] + r[3] && y + h > r[1]) return false; placed.push([x, y, w, h]); return true; };
    const font = this.h.font ? this.h.font() : "Segoe UI";
    const label = (txt, x, y, size, weight, fill, halo, force) => {
      ctx.font = `${weight} ${size}px ${font}`; const w = ctx.measureText(txt).width; if (!force && !free(x - w / 2, y - size / 2, w, size)) return false;
      ctx.lineWidth = 3; ctx.strokeStyle = halo; ctx.lineJoin = "round"; ctx.strokeText(txt, x, y); ctx.fillStyle = fill; ctx.fillText(txt, x, y); return true;
    };
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    /* seas */
    if (rel < 4.5) { for (const s of this.seas) { const [x, y] = this.toScreen(s.p[0], s.p[1]); if (x < -80 || x > W + 80 || y < -20 || y > H + 20) continue; if (s.s === 2 && rel < 1.6) continue; ctx.globalAlpha = .55; label(this.h.seaName(s), x, y, s.s === 3 ? 13 + rel * 2 : 10 + rel, 500, col("--seatext"), "rgba(0,0,0,0)", true); ctx.globalAlpha = 1; } }
    /* player marker + country labels */
    if (this.opts.labels) {
      const order = Object.values(this.cs).filter(c => !this.h.active || this.h.active(c.id)).sort((a, b) => b.area - a.area);
      for (const c of order) {
        const [x, y] = this.toScreen(c.c[0], c.c[1]); const bw = (c.bb[2] - c.bb[0]) * k; if (x < -50 || x > W + 50 || y < -20 || y > H + 20) continue;
        const name = this.h.name(c.id); ctx.font = `600 12px ${font}`; const tw = ctx.measureText(name).width; const isSel = c.id === this.sel || c.id === this.hover;
        if (!isSel && bw < tw * .75 && rel < 6) continue;
        const size = clamp(10 + Math.log2(rel) * 1.7 + (bw > 200 ? 2 : 0), 10, 17);
        label(name, x, y, size, c.id === (this.h.mine && this.h.mine()) ? 700 : 600, col("--labeltext"), col("--labelhalo"), isSel);
      }
    }
    /* cities */
    if (this.opts.cities) {
      for (const c of this.cities) {
        const need = c.r === 1 ? 2.1 : c.r === 2 ? 3 : 5; if (rel < need) continue; if (this.h.active && !this.h.active(c.c)) continue;
        const [x, y] = this.toScreen(c.p[0], c.p[1]); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        ctx.fillStyle = c.r === 1 ? col("--brass") : col("--ivory"); ctx.beginPath(); if (c.r === 1) { ctx.moveTo(x, y - 4); ctx.lineTo(x + 3.5, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3.5, y); ctx.closePath(); } else ctx.arc(x, y, c.r === 2 ? 2.6 : 2, 0, 7); ctx.fill();
        label(this.h.cityName(c), x, y - 9, c.r === 1 ? 11.5 : 10.5, c.r === 1 ? 600 : 500, col("--ivory"), col("--labelhalo"));
      }
    }
    /* rivers & mountain names at high zoom */
    if (this.opts.relief && rel > 4) { for (const r of this.rivers) { const i = Math.floor(r.a.length / 4) * 2, [x, y] = this.toScreen(r.a[i], r.a[i + 1]); if (x > 0 && x < W && y > 0 && y < H) label(this.h.riverName(r), x, y - 7, 10, 500, col("--river"), col("--labelhalo")); } for (const m of this.mts) { const [x, y] = this.toScreen(m.mid[0], m.mid[1]); if (x > 0 && x < W && y > 0 && y < H) label(this.h.riverName(m), x, y + 12, 10, 500, col("--mounttext"), col("--labelhalo")); } }
    /* trade flows */
    if (this.opts.flows && this.flows.length) {
      const T = this.time / 1000;
      for (const f of this.flows) {
        const [x0, y0] = this.toScreen(f.a[0], f.a[1]), [x1, y1] = this.toScreen(f.b[0], f.b[1]);
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 4) continue;
        const cx = mx - dy * .22, cy = my + dx * .22 - L * .12;
        ctx.globalAlpha = .22 + .5 * f.w; ctx.strokeStyle = f.color; ctx.lineWidth = 1 + 3.2 * f.w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
        ctx.globalAlpha = .95; ctx.fillStyle = "#fff";
        for (let j = 0; j < 2; j++) { const u = (T * .25 + j * .5 + f.ph) % 1, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c2 = u * u; ctx.beginPath(); ctx.arc(a * x0 + b * cx + c2 * x1, a * y0 + b * cy + c2 * y1, 1.6 + 1.6 * f.w, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    }
    /* missile / air strikes */
    if (this.strikes.length) {
      this.strikes = this.strikes.filter(s => this.time - s.t0 < s.dur + 900);
      for (const s of this.strikes) {
        const [x0, y0] = this.toScreen(s.a[0], s.a[1]), [x1, y1] = this.toScreen(s.b[0], s.b[1]), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, cx = (x0 + x1) / 2 - dy * .25, cy = (y0 + y1) / 2 + dx * .25 - L * .18;
        for (let k = 0; k < s.n; k++) {
          const u = (this.time - s.t0) / s.dur - k * .1; if (u < 0) continue; const uu = Math.min(1, u), a2 = (1 - uu) * (1 - uu), b2 = 2 * (1 - uu) * uu, c2 = uu * uu, px2 = a2 * x0 + b2 * cx + c2 * x1, py2 = a2 * y0 + b2 * cy + c2 * y1;
          if (u < 1) { ctx.globalAlpha = .9; ctx.strokeStyle = "#ffb27a"; ctx.lineWidth = 2; ctx.beginPath(); for (let j = 0; j <= 8; j++) { const v = Math.max(0, uu - j * .02), A = (1 - v) * (1 - v), Bq = 2 * (1 - v) * v, C = v * v, qx = A * x0 + Bq * cx + C * x1, qy = A * y0 + Bq * cy + C * y1; j ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px2, py2, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
          else { const ph = Math.min(1, (u - 1) / .35); ctx.globalAlpha = 1 - ph; ctx.strokeStyle = "#ff7a4d"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x1 + (k % 2 ? 6 : -6), y1 + (k % 3 - 1) * 5, 4 + ph * 22, 0, 7); ctx.stroke(); ctx.fillStyle = "rgba(255,170,90,.35)"; ctx.fill(); ctx.globalAlpha = 1; }
        }
      }
    }
    /* chokepoints */
    if (rel > 1.15) for (const c of this.chokes) {
      const [x, y] = this.toScreen(c.p[0], c.p[1]); if (x < 0 || x > W || y < 0 || y > H) continue;
      const hot = this.shocks.includes(c.id); ctx.strokeStyle = hot ? col("--coral") : col("--brass"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 4.5); ctx.lineTo(x + 4.5, y); ctx.lineTo(x, y + 4.5); ctx.lineTo(x - 4.5, y); ctx.closePath(); ctx.stroke();
      if (hot) { const ph = (this.time / 900) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(x, y, 6 + ph * 12, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      if (rel > 3) label(this.h.chokeName(c), x, y + 13, 9.5, 500, col("--brass"), col("--labelhalo"));
    }
    /* buildings on the player's territory */
    if (this.opts.builds && this.markers.length) {
      const mine = this.h.mine && this.cs[this.h.mine()]; const mw = mine ? (mine.bb[2] - mine.bb[0]) * k : 0; const big = rel > 1.9 || mw > 150;
      for (const m of this.markers) {
        const [x, y] = this.toScreen(m.p[0], m.p[1]); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        if (!big) { ctx.fillStyle = m.color; ctx.globalAlpha = m.building ? .6 : 1; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; continue; }
        const r = 9, pulse = m.building ? 1 + .12 * Math.sin(this.time / 260 + m.p[0] * 50) : 1;
        ctx.save(); ctx.shadowColor = m.color; ctx.shadowBlur = m.building ? 6 : 10; ctx.fillStyle = "rgba(8,18,26,.92)"; ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, 7); ctx.fill(); ctx.restore();
        ctx.lineWidth = 2; ctx.strokeStyle = m.color; ctx.globalAlpha = m.building ? .45 : 1; ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        if (m.building) { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, r * pulse, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * m.progress); ctx.stroke(); }
        ctx.fillStyle = m.color; ctx.font = `700 ${m.building ? 10 : 11}px "Segoe UI Symbol","Segoe UI",sans-serif`; ctx.globalAlpha = m.building ? .7 : 1; ctx.fillText(m.icon, x, y + .5); ctx.globalAlpha = 1;
      }
    }
  }
}
window.MapView = MapView; window.WOE_PROJ = { proj, unproj };
})();
