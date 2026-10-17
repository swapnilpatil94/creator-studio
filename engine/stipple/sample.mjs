#!/usr/bin/env node
// Deterministic stippling of an image: density-adaptive Poisson-disk start (Bridson 2007, variable radius) refined by pixel-weighted Lloyd iterations
// (discrete weighted centroidal Voronoi, Secord 2002). Image decoding uses ffmpeg (no npm dependencies). Same input + options => byte-identical output.
// usage: node engine/stipple/sample.mjs <image> <out.stip> [--n 60000] [--iters 10] [--maxw 1200] [--mode ink|light] [--seed 1] [--layers layers.json] [--mask mask.png] [--edge 1.2]
//   mode ink  : dark pixels get more dots (black ink on parchment); mode light: bright pixels get more dots (light dots on black).
//   --mask    : optional grayscale image, value/32 -> region id (0..7), authored by hand (head, torso, ...)
//   --layers  : optional JSON [{ "z": -0.3, "polygon": [[u,v],...] }, ...] in image-fraction coords; later entries win; default layer 0
import fs from "node:fs"; import { spawnSync } from "node:child_process"; import { pack } from "./format.mjs";
export function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function loadRGB(file, maxw) {
  const pr = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file], { encoding: "utf8" }); const [iw, ih] = pr.stdout.trim().split("x").map(Number); const w = Math.min(maxw, iw), h = Math.round(ih * w / iw);
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${w}:${h}:flags=lanczos`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 30 }); if (r.status !== 0) throw new Error("ffmpeg failed: " + r.stderr); return { w, h, rgb: new Uint8Array(r.stdout) };
}
const inPoly = (poly, u, v) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > v) !== (yj > v)) && (u < (xj - xi) * (v - yi) / (yj - yi) + xi)) c = !c; } return c; };
export function stipple(img, o = {}) {
  const { w, h, rgb } = img, N = o.n || 60000, iters = o.iters ?? 10, seed = o.seed || 1, ink = (o.mode || "ink") === "ink", edgeW = o.edge ?? 1.2, rnd = mulberry(seed), npx = w * h;
  const lum = new Float32Array(npx), sat = new Float32Array(npx); for (let i = 0; i < npx; i++) { const r = rgb[i * 3] / 255, g = rgb[i * 3 + 1] / 255, b = rgb[i * 3 + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); lum[i] = 0.299 * r + 0.587 * g + 0.114 * b; sat[i] = mx > 0 ? (mx - mn) / mx : 0; }
  const edge = new Float32Array(npx); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] + lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1], gy = -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] + lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1]; edge[i] = Math.min(1, Math.hypot(gx, gy) / 2); }
  // density: tonal (ink: dark = dense) + contour emphasis + saturated colour so faces, jewellery and linework keep their dots
  const dens = new Float32Array(npx); for (let i = 0; i < npx; i++) { const tone = ink ? 1 - lum[i] : lum[i]; dens[i] = Math.min(1, Math.max(0.02, 0.62 * Math.pow(tone, 1.3) + edgeW * 0.55 * edge[i] + 0.18 * sat[i])); }
  const mean = dens.reduce((a, b) => a + b, 0) / npx; // radius field r = k / sqrt(density); choose k so that expected count ~ N (refined by a search below)
  const gen = k => { // variable-radius Bridson
    const rmin = k / Math.sqrt(1), cell = Math.max(1, (k * 0.45) / Math.SQRT2), gw = Math.ceil(w / cell), gh = Math.ceil(h / cell), grid = new Int32Array(gw * gh).fill(-1), px = [], py = [], pr = [], active = [];
    const R = (x, y) => k / Math.sqrt(dens[Math.min(h - 1, y | 0) * w + Math.min(w - 1, x | 0)]);
    const put = (x, y) => { const id = px.length; px.push(x); py.push(y); pr.push(R(x, y)); grid[(y / cell | 0) * gw + (x / cell | 0)] = id; active.push(id); };
    put(w * (0.25 + rnd() * 0.5), h * (0.25 + rnd() * 0.5));
    const maxR = k / Math.sqrt(0.02), reach = Math.ceil(maxR / cell) + 1;
    while (active.length) {
      const ai = Math.floor(rnd() * active.length), id = active[ai], x0 = px[id], y0 = py[id], r0 = pr[id]; let found = false;
      for (let t = 0; t < 24; t++) {
        const a = rnd() * 6.283185307, rr = r0 * (1 + rnd()), x = x0 + Math.cos(a) * rr, y = y0 + Math.sin(a) * rr; if (x < 0 || y < 0 || x >= w || y >= h) continue; const rc = R(x, y); let ok = true;
        const gx = x / cell | 0, gy = y / cell | 0, lim = Math.min(reach, Math.ceil(0.5 * (rc + maxR) / cell) + 1);
        for (let yy = Math.max(0, gy - lim); ok && yy <= Math.min(gh - 1, gy + lim); yy++) for (let xx = Math.max(0, gx - lim); xx <= Math.min(gw - 1, gx + lim); xx++) { const j = grid[yy * gw + xx]; if (j < 0) continue; const dx = px[j] - x, dy = py[j] - y; if (dx * dx + dy * dy < 0.25 * (rc + pr[j]) * (rc + pr[j])) { ok = false; break; } }
        if (ok) { put(x, y); found = true; break; }
      }
      if (!found) { active[ai] = active[active.length - 1]; active.pop(); }
    }
    return { px, py };
  };
  let k = Math.sqrt(npx / (N * Math.max(mean, 0.05))) * 0.95, pts = null;
  for (let it = 0; it < 7; it++) { pts = gen(k); const c = pts.px.length; if (Math.abs(c - N) / N < 0.04) break; k *= Math.pow(c / N, 0.5); rnd.reset; }
  let P = pts.px.length, X = Float32Array.from(pts.px), Y = Float32Array.from(pts.py);
  // pixel-weighted Lloyd relaxation (nearest point per pixel via bucket grid)
  const cs = Math.max(2, Math.sqrt(npx / P) * 1.5), bw = Math.ceil(w / cs), bh = Math.ceil(h / cs); let accW, accX, accY, accR, accG, accB;
  const relax = last => {
    const heads = new Int32Array(bw * bh).fill(-1), nxt = new Int32Array(P); for (let i = 0; i < P; i++) { const b = (Y[i] / cs | 0) * bw + (X[i] / cs | 0); nxt[i] = heads[b]; heads[b] = i; }
    accW = new Float64Array(P); accX = new Float64Array(P); accY = new Float64Array(P); accR = new Float64Array(P); accG = new Float64Array(P); accB = new Float64Array(P);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bx = x / cs | 0, by = y / cs | 0; let best = -1, bd = 1e30;
      for (let rad = 1; best < 0 || rad <= 2; rad++) { for (let yy = Math.max(0, by - rad); yy <= Math.min(bh - 1, by + rad); yy++) for (let xx = Math.max(0, bx - rad); xx <= Math.min(bw - 1, bx + rad); xx++) for (let j = heads[yy * bw + xx]; j >= 0; j = nxt[j]) { const dx = X[j] - x, dy = Y[j] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j; } } if (rad > 6) break; }
      if (best < 0) continue; const i = y * w + x, wt = dens[i]; accW[best] += wt; accX[best] += wt * x; accY[best] += wt * y; accR[best] += rgb[i * 3]; accG[best] += rgb[i * 3 + 1]; accB[best] += rgb[i * 3 + 2];
    }
    if (!last) for (let i = 0; i < P; i++) if (accW[i] > 0) { X[i] = Math.min(w - 1, Math.max(0, accX[i] / accW[i])); Y[i] = Math.min(h - 1, Math.max(0, accY[i] / accW[i])); }
  };
  for (let it = 0; it < iters; it++) relax(false); relax(true);
  // per-point attributes
  const aspect = w / h, pos = new Float32Array(P * 3), col = new Uint8Array(P * 3), size = new Float32Array(P), order = new Float32Array(P), region = new Uint8Array(P), layer = new Float32Array(P), seedA = new Float32Array(P), edgeA = new Float32Array(P);
  let mask = null; if (o.mask) { const m = loadRGB(o.mask, w); mask = m; } const layers = o.layers ? JSON.parse(fs.readFileSync(o.layers, "utf8")) : [];
  const cnt = new Float64Array(P); for (let i = 0; i < P; i++) cnt[i] = Math.max(accW[i], 1e-6);
  const pxCount = new Float64Array(P); // pixels owned (for colour mean) approximated through weights; recompute exactly:
  const dist = new Float32Array(P);
  for (let i = 0; i < P; i++) {
    const ix = Math.min(w - 1, X[i] | 0), iy = Math.min(h - 1, Y[i] | 0), pi = iy * w + ix; pos[i * 3] = (X[i] / w - 0.5) * aspect; pos[i * 3 + 1] = 0.5 - Y[i] / h;
    col[i * 3] = rgb[pi * 3]; col[i * 3 + 1] = rgb[pi * 3 + 1]; col[i * 3 + 2] = rgb[pi * 3 + 2];
    const d = dens[pi]; size[i] = 0.55 + 0.9 * (ink ? 1 - lum[pi] : lum[pi]) * 0.8 + 0.5 * edge[pi]; edgeA[i] = edge[pi]; seedA[i] = rnd();
    if (mask) region[i] = Math.min(7, Math.floor(mask.rgb[(Math.min(mask.h - 1, iy) * mask.w + Math.min(mask.w - 1, ix)) * 3] / 32));
    let z = 0; for (const L of layers) if (inPoly(L.polygon, X[i] / w, Y[i] / h)) z = L.z; layer[i] = z; pos[i * 3 + 2] = z;
    order[i] = 1 - Math.min(1, edge[pi] * 2.2 + 0.0); dist[i] = Math.hypot(X[i] / w - 0.5, Y[i] / h - 0.5);
  }
  // reveal order: strong contours first (low value), then the rest from the centre outward; deterministic jitter keeps it organic
  let dmax = 0; for (let i = 0; i < P; i++) dmax = Math.max(dmax, dist[i]); for (let i = 0; i < P; i++) order[i] = Math.min(1, 0.55 * order[i] + 0.4 * (dist[i] / dmax) + 0.05 * seedA[i]);
  return { n: P, w, h, aspect, pos, col, size, order, region, seed: seedA, edge: edgeA, meta: { mode: ink ? "ink" : "light", seed, iters, targetN: N, k } };
}
export function toStip(s) { return pack(s.n, [["pos", "f32", 3, s.pos], ["col", "u8", 3, s.col], ["size", "f32", 1, s.size], ["order", "f32", 1, s.order], ["region", "u8", 1, s.region], ["seed", "f32", 1, s.seed], ["edge", "f32", 1, s.edge]], { ...s.meta, aspect: s.aspect, w: s.w, h: s.h }); }
if (process.argv[1] && process.argv[1].endsWith("sample.mjs")) {
  const a = process.argv.slice(2), arg = (n, d) => a.includes(n) ? a[a.indexOf(n) + 1] : d; if (a.length < 2) { console.error("usage: sample.mjs <image> <out.stip> [options]"); process.exit(1); }
  const t0 = Date.now(), img = loadRGB(a[0], Number(arg("--maxw", 1200))), s = stipple(img, { n: Number(arg("--n", 60000)), iters: Number(arg("--iters", 10)), mode: arg("--mode", "ink"), seed: Number(arg("--seed", 1)), layers: arg("--layers"), mask: arg("--mask"), edge: Number(arg("--edge", 1.2)) });
  fs.writeFileSync(a[1], toStip(s)); console.log(`${a[1]}: ${s.n} points from ${s.w}x${s.h} in ${((Date.now() - t0) / 1000).toFixed(1)}s (${a.includes("--mode") ? arg("--mode") : "ink"})`);
}
