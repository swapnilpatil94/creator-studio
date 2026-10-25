/* Reel Factory runtime v2: pure functions of timeline time (seeded hashes only).
   window.RF (injected): { W,H,TOTAL, impacts:[t], fx:[...], film:bool, leaks:[{t,d}] } */
(function () {
  const C = window.RF, TAU = Math.PI * 2;
  function h32(s) { s = String(s); let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }
  function h01(seed, n) { let a = (h32(seed) + Math.imul(n | 0, 2654435761)) >>> 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const lerp = (a, b, t) => a + (b - a) * t, frac = x => x - Math.floor(x), $ = id => document.getElementById(id);
  let stage, boils = [], fxs = [], film = null;
  function init() {
    stage = $("stage"); boils = Array.from(document.querySelectorAll(".boil"));
    fxs = (C.fx || []).map(f => { const el = $(f.id); return { f, el, kids: Array.from(el.children) }; });
    if (C.film) film = { grain: $("filmgrain"), leak: $("filmleak"), ts: $("filmts"), sc: [$("filmsc1"), $("filmsc2")] };
  }
  function shake(t) { let ox = 0, oy = 0; for (const ti of C.impacts) { const d = t - ti; if (d >= 0 && d < 0.7) { const a = 15 * Math.exp(-d * 8); ox += a * Math.sin(d * 71 + ti * 13); oy += a * Math.cos(d * 83 + ti * 7); } } return [ox, oy]; }
  /* ---- shapes for match cuts: unit polygons computed by the composer (src/lib/shapes.mjs) ---- */
  const NP = 72; function shape(name) { return C.shapes[name] || C.shapes.circle; }
  /* iris reveal that morphs between two shapes while it grows: the match cut */
  function irisClip(sel, o, u) {
    const el = document.querySelector(sel), A = shape(o.a), B = shape(o.b), m = Math.min(1, u * 1.7), R = lerp(o.r0, o.r1, Math.pow(u, 2.1)), pts = [];
    for (let i = 0; i < NP; i++) pts.push((o.cx + lerp(A[i][0], B[i][0], m) * R).toFixed(1) + "px " + (o.cy + lerp(A[i][1], B[i][1], m) * R).toFixed(1) + "px");
    el.style.clipPath = "polygon(" + pts.join(",") + ")";
  }
  /* ---- map flights: d3-geo orthographic globe drawn per frame (pure function of t) ---- */
  const MAPS = {}; const smooth = u => u * u * (3 - 2 * u), clamp01 = u => Math.max(0, Math.min(1, u));
  function mapUpdate(t0_) {
    const t = t0_ >= C.loopStart ? 0 : t0_;   /* the loop window shows scene 1 again: draw its start state */
    for (const m of C.maps || []) { if (t < m.t0 - 0.05 || t > m.t1 + 3) continue;
      let q = MAPS[m.id]; if (!q) { const cv = $(m.id), topo = window.GEO_TOPO, feats = topojson.feature(topo, topo.objects.countries).features; q = MAPS[m.id] = { cv, g: cv.getContext("2d"), feats, hi: feats.filter(f => f.properties.name === m.hi), grat: d3.geoGraticule10(), sphere: { type: "Sphere" } }; }
      const u = clamp01((t - m.t0) / (m.t1 - m.t0)), a = smooth(clamp01(u / 0.45)), b = smooth(clamp01((u - 0.4) / 0.6)), lon = lerp(m.lon0, m.lon1, a), lat = lerp(m.lat0, m.lat1, a), r = m.r0 * Math.pow(m.r1 / m.r0, b);
      const proj = d3.geoOrthographic().rotate([-lon, -lat]).scale(r).translate([m.size / 2, m.size / 2]).clipAngle(90), g = q.g, path = d3.geoPath(proj, g);
      g.clearRect(0, 0, m.size, m.size); g.save(); g.beginPath(); g.arc(m.size / 2, m.size / 2, m.size / 2 - 6, 0, TAU); g.clip();
      g.fillStyle = m.ocean; g.fillRect(0, 0, m.size, m.size); g.beginPath(); path(q.sphere); g.fillStyle = m.ocean; g.fill();
      g.beginPath(); path(q.grat); g.strokeStyle = "rgba(255,255,255,.14)"; g.lineWidth = 2; g.stroke();
      g.beginPath(); for (const f of q.feats) path(f); g.fillStyle = m.land; g.fill(); g.strokeStyle = m.line; g.lineWidth = 2 + 2 * b; g.stroke();
      if (q.hi.length) { g.beginPath(); for (const f of q.hi) path(f); g.fillStyle = m.hiCol; g.globalAlpha = 0.55 + 0.4 * b; g.fill(); g.globalAlpha = 1; g.lineWidth = 4; g.stroke(); }
      g.restore(); g.beginPath(); g.arc(m.size / 2, m.size / 2, m.size / 2 - 6, 0, TAU); g.lineWidth = 12; g.strokeStyle = m.line; g.stroke();
      const pin = clamp01((u - 0.82) / 0.12); if (pin > 0) { const cx = m.size / 2, cy = m.size / 2, ring = frac((t - m.t0) * 1.2); g.beginPath(); g.arc(cx, cy, 30 + 70 * ring, 0, TAU); g.strokeStyle = "rgba(179,38,30," + (0.8 * (1 - ring)).toFixed(2) + ")"; g.lineWidth = 8; g.stroke(); g.save(); g.translate(cx, cy - (1 - pin) * 200); g.fillStyle = m.pin; g.strokeStyle = m.line; g.lineWidth = 8; g.beginPath(); g.arc(0, -46, 34, 0, TAU); g.moveTo(-26, -26); g.lineTo(0, 0); g.lineTo(26, -26); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -46, 12, 0, TAU); g.fillStyle = "#fff"; g.fill(); g.restore(); }
    }
  }
  function frameUpdate(t) {
    if (!stage) init();
    const sh = shake(t), f = Math.floor(t * 12) % 24; let wx = 0, wy = 0, wr = 0;
    if (C.film) { wx = (h01("wx", f) * 2 - 1) * 2.4; wy = (h01("wy", f) * 2 - 1) * 1.8; wr = (h01("wr", f) * 2 - 1) * 0.14; }   /* gate weave, on twos */
    stage.style.transform = "translate(" + (sh[0] + wx).toFixed(2) + "px," + (sh[1] + wy).toFixed(2) + "px) rotate(" + wr.toFixed(3) + "deg)";
    const fr = f;   /* boil: jitter on twos (12 fps), 2 s cycle, seeded */
    for (let i = 0; i < boils.length; i++) { const b = boils[i], sd = b.dataset.seed || i, k = +(b.dataset.boil || 1) * (window.RF.boilK == null ? 1 : window.RF.boilK); b.style.transform = "translate(" + ((h01(sd, fr) * 2 - 1) * 1.5 * k).toFixed(2) + "px," + ((h01(sd, fr + 31) * 2 - 1) * 1.5 * k).toFixed(2) + "px) rotate(" + ((h01(sd, fr + 77) * 2 - 1) * 0.5 * k).toFixed(3) + "deg)"; }
    for (const q of fxs) { const f2 = q.f, on = t >= f2.t0 && t <= f2.t1; q.el.style.display = on ? "block" : "none"; if (!on) continue;
      for (let k = 0; k < q.kids.length; k++) { const ph = frac(t / f2.period + h01(f2.seed, k)), px = h01(f2.seed, k + 500), s = q.kids[k].style; let x, y, o, r = 0, sc = 1;
        if (f2.kind === "sparks") { x = px * f2.w + Math.sin(ph * TAU * 2 + k) * 24; y = f2.h * (1 - ph); o = Math.sin(Math.PI * ph); sc = 0.5 + h01(f2.seed, k + 900); }
        else if (f2.kind === "petals") { x = px * f2.w + Math.sin(ph * TAU + k) * 60; y = f2.h * ph; o = Math.min(1, ph * 6, (1 - ph) * 6); r = ph * 720 * (k % 2 ? 1 : -1); }
        else if (f2.kind === "burst") { const ang = (k / q.kids.length) * TAU, d = Math.min(1, (t - f2.t0) / 0.6); x = f2.w / 2 + Math.cos(ang) * f2.w * 0.5 * d; y = f2.h / 2 + Math.sin(ang) * f2.h * 0.5 * d; o = 1 - d; sc = 1 + d; }
        else { x = px * f2.w + Math.sin(ph * TAU + k) * 16; y = f2.h * (0.2 + 0.6 * h01(f2.seed, k + 700)) + Math.cos(ph * TAU + k) * 16; o = 0.25 + 0.35 * Math.sin(Math.PI * ph); }
        s.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + r.toFixed(1) + "deg) scale(" + sc.toFixed(2) + ")"; s.opacity = o.toFixed(3); } }
    mapUpdate(t);
    if (film) {
      film.grain.style.backgroundPosition = -((h01("gx", f) * 256) | 0) + "px " + -((h01("gy", f) * 256) | 0) + "px";
      let lk = 0.0; for (const l of C.leaks || []) { const d = (t - l.t) / l.d; if (d >= 0 && d <= 1) lk = Math.max(lk, Math.sin(Math.PI * d)); } lk += 0.06 + 0.05 * Math.sin(TAU * t / C.TOTAL + 2);   /* a faint breathing leak plus bursts at cuts */
      film.leak.style.opacity = Math.min(1, lk).toFixed(3);
      const tt = t >= C.TOTAL ? 0 : t, s = Math.floor(tt), pad = n => String(n).padStart(2, "0"); film.ts.textContent = "REC ● 00:" + pad(Math.floor(s / 60)) + ":" + pad(s % 60) + ":" + pad(Math.floor((tt - s) * 30));
      film.sc[0].style.left = (h01("s1", f) * 1080 | 0) + "px"; film.sc[0].style.opacity = h01("s1o", f) > 0.7 ? 0.5 : 0; film.sc[1].style.left = (h01("s2", f) * 1080 | 0) + "px"; film.sc[1].style.opacity = h01("s2o", f) > 0.85 ? 0.35 : 0;
    }
  }
  window.RF.frameUpdate = frameUpdate; window.RF.h01 = h01; window.RF.irisClip = irisClip; window.RF.shape = shape;
})();
