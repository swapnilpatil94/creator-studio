/* Reel Factory runtime: pure functions of timeline time (seeded hashes only).
   window.RF is injected by the composer: { W,H,TOTAL, st:[{cx,cy,tilt,start,dwellEnd,moveEnd}], impacts:[t], fx:[{id,kind,n,x,y,w,h,t0,t1,seed,period}] } */
(function () {
  const C = window.RF, TAU = Math.PI * 2;
  function h32(s) { s = String(s); let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }
  function h01(seed, n) { let a = (h32(seed) + Math.imul(n | 0, 2654435761)) >>> 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const e3 = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, lerp = (a, b, t) => a + (b - a) * t, frac = x => x - Math.floor(x);
  function rest(i, t) { const s = C.st[i], d = s.dwellEnd - s.start, p = d > 0 ? Math.min(1, Math.max(0, (t - s.start) / d)) : 0; return { x: s.cx, y: s.cy, s: 1 + 0.035 * p, r: s.tilt }; }
  /* the one-take camera: rests with a slow push-in, then moves 0.9 s to the next station (power3.inOut, 22% zoom-out dip, rotation matched to the tilt); the last move returns to station 1 so the reel loops */
  function camAt(t) {
    const n = C.st.length; if (t >= C.TOTAL) return rest(0, 0);
    for (let i = 0; i < n; i++) { const s = C.st[i]; if (t >= s.start && t < s.moveEnd) {
      if (t < s.dwellEnd) return rest(i, t);
      const u = (t - s.dwellEnd) / (s.moveEnd - s.dwellEnd), a = rest(i, s.dwellEnd), nx = C.st[(i + 1) % n], e = e3(u);
      return { x: lerp(a.x, nx.cx, e), y: lerp(a.y, nx.cy, e), s: lerp(a.s, 1, e) * (1 - 0.22 * Math.sin(Math.PI * u)), r: lerp(a.r, nx.tilt, e) }; } }
    return rest(n - 1, t);
  }
  function shake(t) { let ox = 0, oy = 0; for (const ti of C.impacts) { const d = t - ti; if (d >= 0 && d < 0.7) { const a = 15 * Math.exp(-d * 8); ox += a * Math.sin(d * 71 + ti * 13); oy += a * Math.cos(d * 83 + ti * 7); } } return [ox, oy]; }
  let board, boils = [], fxs = [];
  function init() {
    board = document.getElementById("board"); boils = Array.from(document.querySelectorAll(".boil"));
    fxs = (C.fx || []).map(f => { const el = document.getElementById(f.id); return { f, el, kids: Array.from(el.children) }; });
  }
  function frameUpdate(t) {
    if (!board) init();
    const c = camAt(t), sh = shake(t);
    board.style.transform = "translate(" + (C.W / 2 + sh[0]).toFixed(2) + "px," + (C.H / 2 + sh[1]).toFixed(2) + "px) scale(" + c.s.toFixed(5) + ") rotate(" + (-c.r).toFixed(4) + "deg) translate(" + (-c.x).toFixed(2) + "px," + (-c.y).toFixed(2) + "px)";
    const fr = Math.floor(t * 12) % 24;   /* boil: jitter on twos (12 fps), 2 s cycle, seeded */
    for (let i = 0; i < boils.length; i++) { const b = boils[i], sd = b.dataset.seed || i, k = +(b.dataset.boil || 1); b.style.transform = "translate(" + ((h01(sd, fr) * 2 - 1) * 1.5 * k).toFixed(2) + "px," + ((h01(sd, fr + 31) * 2 - 1) * 1.5 * k).toFixed(2) + "px) rotate(" + ((h01(sd, fr + 77) * 2 - 1) * 0.5 * k).toFixed(3) + "deg)"; }
    for (const q of fxs) { const f = q.f, on = t >= f.t0 && t <= f.t1; q.el.style.display = on ? "block" : "none"; if (!on) continue;
      for (let k = 0; k < q.kids.length; k++) { const ph = frac(t / f.period + h01(f.seed, k)), px = h01(f.seed, k + 500), s = q.kids[k].style; let x, y, o, r = 0, sc = 1;
        if (f.kind === "sparks") { x = px * f.w + Math.sin(ph * TAU * 2 + k) * 24; y = f.h * (1 - ph); o = Math.sin(Math.PI * ph); sc = 0.5 + h01(f.seed, k + 900); }
        else if (f.kind === "petals") { x = px * f.w + Math.sin(ph * TAU + k) * 60; y = f.h * ph; o = Math.min(1, ph * 6, (1 - ph) * 6); r = ph * 360 * 2 * (k % 2 ? 1 : -1); }
        else if (f.kind === "burst") { const ang = (k / q.kids.length) * TAU, d = Math.min(1, (t - f.t0) / 0.6); x = f.w / 2 + Math.cos(ang) * f.w * 0.5 * d; y = f.h / 2 + Math.sin(ang) * f.h * 0.5 * d; o = 1 - d; sc = 1 + d; if (t - f.t0 > 0.6) { o = 0; } }
        else { x = px * f.w + Math.sin(ph * TAU + k) * 16; y = f.h * (0.2 + 0.6 * h01(f.seed, k + 700)) + Math.cos(ph * TAU + k) * 16; o = 0.25 + 0.35 * Math.sin(Math.PI * ph); }
        s.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + r.toFixed(1) + "deg) scale(" + sc.toFixed(2) + ")"; s.opacity = o.toFixed(3); } }
  }
  window.RF.frameUpdate = frameUpdate; window.RF.camAt = camAt; window.RF.h01 = h01;
})();
