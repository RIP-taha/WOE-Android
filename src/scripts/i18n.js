/* WORLD OF EMPIRES — language layer (English / Persian). Layout direction is NOT flipped; only text changes. */
window.I18N = (() => {
"use strict";
const D = window.WOE_DATA;
let lang = "en"; try { lang = localStorage.getItem("woe.lang") || "en"; } catch {}
if (lang !== "en" && lang !== "fa") lang = "en";
const DICT = {}; const ctx = { customName: "Veyra", playerId: null, bname: null };
const MON = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], fa: ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن", "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"] };
const loc = () => lang === "fa" ? "fa-IR" : "en-US";
const fmtCache = {};
function nf(d) { const k = lang + d; return fmtCache[k] || (fmtCache[k] = new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: true })); }
const num = (n, d = 0) => Number.isFinite(+n) ? nf(d).format(+n) : "—";
const pct = (n, d = 0) => num(n, d) + (lang === "fa" ? "٪" : "%");
function money(n, d) {
  if (!Number.isFinite(+n)) return "—"; n = +n; const a = Math.abs(n), s = n < 0 ? "-" : ""; const f = (v, dd) => num(v, dd);
  const dec = x => x >= 100 ? 0 : x >= 10 ? 1 : 2;
  if (lang === "fa") { const fs = n < 0 ? "−" : ""; if (a >= 1e12) return fs + f(a / 1e12, 2) + " تریلیون دلار"; if (a >= 1e9) return fs + f(a / 1e9, dec(a / 1e9)) + " میلیارد دلار"; if (a >= 1e6) return fs + f(a / 1e6, dec(a / 1e6)) + " میلیون دلار"; if (a >= 1e3) return fs + f(a / 1e3, 0) + " هزار دلار"; return fs + f(a, 0) + " دلار"; }
  if (a >= 1e12) return s + "$" + f(a / 1e12, 2) + "T"; if (a >= 1e9) return s + "$" + f(a / 1e9, dec(a / 1e9)) + "B"; if (a >= 1e6) return s + "$" + f(a / 1e6, dec(a / 1e6)) + "M"; if (a >= 1e3) return s + "$" + f(a / 1e3, 0) + "K"; return s + "$" + f(a, 0);
}
function big(n) { n = +n; const a = Math.abs(n); if (lang === "fa") { if (a >= 1e9) return num(n / 1e9, 2) + " میلیارد"; if (a >= 1e6) return num(n / 1e6, a >= 1e8 ? 0 : 1) + " میلیون"; if (a >= 1e3) return num(n / 1e3, 0) + " هزار"; return num(n, 0); } if (a >= 1e9) return num(n / 1e9, 2) + "B"; if (a >= 1e6) return num(n / 1e6, a >= 1e8 ? 0 : 1) + "M"; if (a >= 1e3) return num(n / 1e3, 0) + "K"; return num(n, 0); }
const date = (y, m) => lang === "fa" ? `${MON.fa[m - 1]} ${num(y).replace(/٬/g, "")}` : `${MON.en[m - 1]} ${y}`;
const isoDate = s => { const [y, m] = String(s).split("-").map(Number); return m ? date(y, m) : s; };
const tx = o => typeof o === "string" ? o : o ? (o[lang] || o.en || o.fa || "") : "";
function cname(id) {
  if (!id) return ""; if (id === ctx.playerId && ctx.customName && id === "CUS") return ctx.customName; if (id === "CUS") return ctx.customName;
  if (id === "ROW") return t("row"); const c = D.countries[id]; return c ? c[lang] || c.en : id;
}
function t(key, p) {
  const e = DICT[key]; let s = e ? (e[lang] ?? e.en) : key; if (s === undefined) s = key;
  if (p) s = s.replace(/\{([\w$]+)\}/g, (m, k) => { if (!(k in p)) return m; return res(k, p[k]); });
  return s;
}
function res(k, v) {
  if (v === undefined || v === null || v === "") return "";
  switch (k) {
    case "b": return ctx.bname ? ctx.bname(v) : t("b." + v); case "c": return t("c." + v); case "cid": case "id": return cname(v); case "tech": return t("tech." + v); case "pol": return t("pol." + v);
    case "reg": return t("reg." + v); case "pk": return t("party." + v); case "scn": return D.scenarios[v] ? tx(D.scenarios[v].name) : v; case "a": return t("dipa." + v); case "ot": return t("obj." + v);
    case "title": case "choice": return tx(v); case "obj": return v;
    case "un": return t(v); case "mt": return t("mt." + v); case "tg": return t("tg." + v); case "pm": return t("pm." + v); case "sk": return t("sk." + v);
    case "list": return Array.isArray(v) ? v.map(cname).join(", ") : String(v);
  }
  if (k.endsWith("$")) return money(v); if (typeof v === "number") return num(v, Number.isInteger(v) ? 0 : 1); return String(v);
}
function add(obj) { for (const [k, v] of Object.entries(obj)) DICT[k] = { en: v[0], fa: v[1] }; }
function setLang(l) { lang = l === "fa" ? "fa" : "en"; try { localStorage.setItem("woe.lang", lang); } catch {} document.documentElement.lang = lang; document.documentElement.dir = "ltr"; document.body.classList.toggle("fa", lang === "fa"); }
function apply(root = document) {
  root.querySelectorAll("[data-i]").forEach(el => { el.textContent = t(el.dataset.i); });
  root.querySelectorAll("[data-ititle]").forEach(el => { el.title = t(el.dataset.ititle); el.setAttribute("aria-label", t(el.dataset.ititle)); });
  root.querySelectorAll("[data-iph]").forEach(el => { el.placeholder = t(el.dataset.iph); });
}
return { t, tx, add, num, pct, money, big, date, isoDate, cname, setLang, apply, lang: () => lang, ctx, has: k => k in DICT, keys: () => Object.keys(DICT) };
})();
