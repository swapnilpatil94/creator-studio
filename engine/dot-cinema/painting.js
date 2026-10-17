// Painting support for dot-cinema: baked images (see stories/*/assets/prep.py) drawn through the same camera, then dotified.
import * as L from "./lib.js";
export function loadImages(map) { // { key: dataUrl } -> { key: HTMLImageElement }; window.__ready resolves when all decoded (render scripts await it)
  const out = {}, ps = [];
  for (const [k, url] of Object.entries(map)) { const im = new Image(); im.src = url; out[k] = im; ps.push(im.decode ? im.decode().catch(() => {}) : new Promise(r => { im.onload = r; im.onerror = r; })); }
  window.__ready = Promise.all(ps).then(() => true); return out;
}
// world rect of an image: fit = "cover" (fills the 1080x1920 world frame) or "height" (frame height, width follows; pan with cam.x)
export function rectFor(img, fit) { const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = fit === "height" ? L.H / ih : Math.max(L.W / iw, L.H / ih); const w = iw * s, h = ih * s; return { x: fit === "height" ? 0 : (L.W - w) / 2, y: (L.H - h) / 2, w, h, s, iw, ih }; }
// draw into a half-res mask layer through the camera; opts.clip = [cx, cy, r] (world coords) for a spotlight; opts.alpha
export function drawPainting(layer, img, cam, rect, opts = {}) {
  if (!img || !(img.complete && img.naturalWidth)) return; const g = layer.g; L.applyCam(g, cam, opts.p === undefined ? 1 : opts.p); g.save();
  if (opts.clip) { g.beginPath(); g.arc(opts.clip[0], opts.clip[1], opts.clip[2], 0, Math.PI * 2); g.clip(); }
  g.globalAlpha = opts.alpha === undefined ? 1 : opts.alpha; g.imageSmoothingEnabled = opts.smooth === undefined ? false : opts.smooth; g.drawImage(img, rect.x, rect.y, rect.w, rect.h);
  if (opts.feather) { const [cx, cy, r] = opts.feather; g.globalAlpha = 1; g.globalCompositeOperation = "destination-in"; const gr = g.createRadialGradient(cx, cy, r * 0.25, cx, cy, r); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
  g.restore();
}
// image (u,v in 0..1) -> world coords
export const at = (rect, u, v) => [rect.x + u * rect.w, rect.y + v * rect.h];

// Coloured halftone: R channel = palette index (nearest-neighbour sampled), G channel = dot size. Hex grid like lib.dotify. o: {cell, gain, dis, seed, alpha}
export function dotifyPalette(g, layer, pal, o = {}) {
  const cell = o.cell || 6, gain = o.gain === undefined ? 1 : o.gain, dis = o.dis || 0, seed = o.seed || 0, NB = 6, BB = 3, BA = [0.30, 0.62, 1], K = pal.length, LW_ = L.LW, LH_ = L.LH;
  const d = layer.g.getImageData(0, 0, LW_, LH_).data, buckets = []; for (let i = 0; i < K * NB * BB; i++) buckets.push(new Path2D());
  const rowH = cell * 0.866; let row = 0;
  for (let y = cell / 2; y < L.H; y += rowH, row++) { let col = 0;
    for (let x = (row & 1) * cell / 2 + cell / 2; x < L.W; x += cell, col++) {
      const i = (((y / 2) | 0) * LW_ + ((x / 2) | 0)) * 4, a = d[i + 3]; if (a < 200) continue;
      const sz = Math.min(1, (d[i + 1] / 255) * gain); if (sz < 0.06) continue; const idx = Math.min(K - 1, d[i]); const sb = Math.min(NB - 1, (sz * NB) | 0), bb = d[i + 2] < 90 ? 0 : d[i + 2] < 170 ? 1 : 2;
      let px = x, py = y; if (dis > 0) { const hv = L.hash(row * 977 + col + seed), ang = hv * L.TAU, mag = Math.pow(dis, 1.4) * (60 + 220 * L.hash(hv * 91 + 3)); px += Math.cos(ang) * mag * 0.7; py += Math.sin(ang) * mag * 0.5 - dis * 90 * (0.3 + hv); }
      const r = cell * 0.56 * Math.pow((sb + 1) / NB, 0.7) * (1 - dis * 0.6), pth = buckets[(idx * NB + sb) * BB + bb]; pth.moveTo(px + r, py); pth.arc(px, py, r, 0, L.TAU);
    } }
  g.save(); g.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * (1 - dis);
  const A0 = g.globalAlpha; for (let k = 0; k < K; k++) { const c = pal[k]; g.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; for (let bb2 = 0; bb2 < BB; bb2++) { g.globalAlpha = A0 * BA[bb2]; for (let b = 0; b < NB; b++) g.fill(buckets[(k * NB + b) * BB + bb2]); } }
  g.restore();
}
