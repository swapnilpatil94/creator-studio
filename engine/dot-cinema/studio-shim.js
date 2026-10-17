// Studio shim: injected BEFORE a pasted scene's own scripts. Makes typical model-written HTML deterministic and framable,
// and overlays word-synced captions so the scene itself only has to draw visuals.
// Config arrives as window.__STUDIO = { compat, fit, captions:{segments,lead,dim,y}|null, hideCaptions }.
(function () {
  "use strict";
  const CFG = window.__STUDIO || {};
  const info = window.__studioInfo = { randomCalls: 0, dateCalls: 0, rafCalls: 0, timerCalls: 0, fitZoom: 1, designWidth: 540, captions: !!CFG.captions };
  let clock = 0;
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let prng = mulberry(1);
  if (CFG.compat !== false) {
    Math.random = function () { info.randomCalls++; return prng(); };
    const RealDate = Date, base = 1700000000000;
    class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else { info.dateCalls++; super(base + clock * 1000); } } static now() { info.dateCalls++; return base + clock * 1000; } }
    window.Date = FakeDate; performance.now = function () { info.dateCalls++; return clock * 1000; };
    window.requestAnimationFrame = function () { info.rafCalls++; return 0; }; window.cancelAnimationFrame = function () { };
    window.setTimeout = function () { info.timerCalls++; return 0; }; window.setInterval = function () { info.timerCalls++; return 0; };
    const st = document.createElement("style"); st.textContent = "*,*::before,*::after{animation:none!important;transition:none!important}"; document.addEventListener("DOMContentLoaded", () => document.head.appendChild(st));
  }
  // ---- caption overlay ----
  let ov = null, bd = null, box = null;
  const FONT = "'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',system-ui,sans-serif";
  function buildOverlay() {
    if (!CFG.captions || ov) return;
    ov = document.createElement("div"); ov.id = "__cap"; ov.style.cssText = "position:fixed;left:0;top:0;width:540px;height:960px;pointer-events:none;z-index:2147483647;overflow:hidden";
    bd = document.createElement("div"); bd.style.cssText = "position:absolute;left:0;width:540px;opacity:0"; box = document.createElement("div");
    box.style.cssText = "position:absolute;left:50px;width:440px;text-align:center;font:800 31px/44px " + FONT + ";color:#f6f8ff;text-shadow:0 0 11px rgba(0,0,0,.9);opacity:0";
    ov.appendChild(bd); ov.appendChild(box); document.documentElement.appendChild(ov);
  }
  let geom = null;
  function updateOverlay(t) {
    if (!CFG.captions) return; buildOverlay(); geom = null;
    const n = t / (CFG.captions.timeScale || 1) - (CFG.captions.lead || 0), segs = CFG.captions.segments, b = segs.find(s => n >= s.start_seconds - 0.12 && n <= s.end_seconds + 0.5);
    if (!b || CFG.hideCaptions) { box.style.opacity = 0; bd.style.opacity = 0; return; }
    const disp = b.text.split(/\s+/).filter(Boolean), tokens = disp.length === b.words.length ? disp : b.words.map(w => w.word);
    const fade = Math.min(1, Math.max(0, (n - (b.start_seconds - 0.12)) / 0.2)) * (1 - Math.min(1, Math.max(0, (n - (b.end_seconds + 0.25)) / 0.25)));
    box.innerHTML = tokens.map((tk, i) => { const w = b.words[Math.min(i, b.words.length - 1)], st = n < w.start ? 0 : n <= w.end + 0.08 ? 1 : 2; return '<span style="margin:0 3px;opacity:' + (st === 0 ? 0.42 : 1) + ';color:' + (st === 1 ? "rgb(255,184,74)" : "#f6f8ff") + '">' + tk.replace(/</g, "&lt;") + "</span>"; }).join(" ");
    const bottom = CFG.captions.bottom || 800; box.style.top = "auto"; box.style.bottom = (960 - bottom) + "px"; box.style.opacity = fade;
    const r = box.getBoundingClientRect(), dim = CFG.captions.dim === undefined ? 0.6 : CFG.captions.dim, pad = 60;
    bd.style.top = (r.top - pad) + "px"; bd.style.height = (r.height + pad * 2) + "px"; bd.style.background = "linear-gradient(to bottom,rgba(0,0,0,0)," + "rgba(0,0,0," + dim + ") 28%,rgba(0,0,0," + dim + ") 72%,rgba(0,0,0,0))"; bd.style.opacity = fade;
    let minX = 1e9, maxX = -1e9; box.querySelectorAll("span").forEach(s => { const q = s.getBoundingClientRect(); minX = Math.min(minX, q.left); maxX = Math.max(maxX, q.right); });
    geom = { x0: minX * 2, x1: maxX * 2, y0: r.top * 2 - 6, y1: r.bottom * 2 + 6 };
  }
  window.__capGeom = () => geom;
  window.__capSet = o => { Object.assign(CFG.captions || {}, o); };
  window.__capHide = h => { CFG.hideCaptions = !!h; };
  function exposure() { if (document.body && CFG.exposure && CFG.exposure !== 1) document.body.style.filter = 'brightness(' + CFG.exposure + ')'; }
  window.__setExposure = x => { CFG.exposure = x; exposure(); };
  // ---- fit a 1080-wide (or other) design into the 540x960 CSS frame ----
  function fit() {
    if (CFG.fit === false || !document.body) return;
    const w = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    info.designWidth = w;
    if (w > 600) { const z = 540 / w; document.body.style.zoom = z; info.fitZoom = z; }
    document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden";
  }
  document.addEventListener("DOMContentLoaded", () => { fit(); exposure(); });
  window.addEventListener("load", () => { fit(); exposure(); });
  // ---- wrap renderAt: seed random + clock per frame, then caption overlay ----
  let user = null;
  const wrapped = function (t) { t = Number(t) || 0; clock = t; prng = mulberry(Math.floor(t * 1000) + 7); if (user) user.call(window, t); updateOverlay(t); };
  Object.defineProperty(window, "renderAt", { configurable: true, get() { return user ? wrapped : undefined; }, set(fn) { user = fn; } });
})();
