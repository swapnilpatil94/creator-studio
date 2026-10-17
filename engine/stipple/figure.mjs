#!/usr/bin/env node
// Procedural, manually rigged stippled person (profile, facing +x). NOT a portrait animator: a flat arbitrary image has no hidden limbs or depth, so
// articulated motion needs authored bones/masks like these. The figure is rasterised from capsule bones, stippled with the same sampler, and every dot
// gets skinning weights (nearest two connected bones) so joints bend smoothly. usage: node engine/stipple/figure.mjs <out.stip> [--n 9000] [--seed 4]
import fs from "node:fs"; import { stipple, toStip } from "./sample.mjs"; import { pack } from "./format.mjs";
export const SKELETON = { order: [2, 3, 6, 7, 8, 0, 1, 9, 10, 11, 4, 5], bones: [   // draw order: far arm, far leg, torso, head, near leg, near arm
  { name: "pelvis", parent: -1, a: [0, 0], b: [0.005, 0.27], r: 0.06, tone: [190, 96, 42], near: 1 },
  { name: "head", parent: 0, a: [0.005, 0.27], b: [0.02, 0.345], r: 0.05, tone: [176, 120, 84], near: 1 },
  { name: "uArmF", parent: 0, a: [-0.012, 0.25], b: [-0.012, 0.12], r: 0.026, tone: [118, 78, 54], near: 0 },
  { name: "fArmF", parent: 2, a: [-0.012, 0.12], b: [-0.008, 0.0], r: 0.021, tone: [118, 78, 54], near: 0 },
  { name: "uArmN", parent: 0, a: [0.014, 0.25], b: [0.014, 0.12], r: 0.026, tone: [176, 120, 84], near: 1 },
  { name: "fArmN", parent: 4, a: [0.014, 0.12], b: [0.018, 0.0], r: 0.021, tone: [176, 120, 84], near: 1 },
  { name: "thighF", parent: 0, a: [-0.012, 0], b: [-0.012, -0.19], r: 0.036, tone: [96, 90, 80], near: 0 },
  { name: "shinF", parent: 6, a: [-0.012, -0.19], b: [-0.012, -0.385], r: 0.027, tone: [96, 90, 80], near: 0 },
  { name: "footF", parent: 7, a: [-0.012, -0.385], b: [0.045, -0.40], r: 0.02, tone: [96, 90, 80], near: 0 },
  { name: "thighN", parent: 0, a: [0.014, 0], b: [0.014, -0.19], r: 0.036, tone: [150, 140, 125], near: 1 },
  { name: "shinN", parent: 9, a: [0.014, -0.19], b: [0.014, -0.385], r: 0.027, tone: [150, 140, 125], near: 1 },
  { name: "footN", parent: 10, a: [0.014, -0.385], b: [0.07, -0.40], r: 0.02, tone: [150, 140, 125], near: 1 }] };
const segDist = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9; let t = ((px - a[0]) * dx + (py - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); const cx = a[0] + t * dx, cy = a[1] + t * dy; return [Math.hypot(px - cx, py - cy), cx, cy]; };
export function buildFigure(n = 9000, seed = 4) {
  // each bone is rasterised and stippled on its own (so limbs that are hidden behind the torso at rest still own dots and their outlines show when they swing out)
  const W = 300, H = 600, X0 = -0.25, Y0 = 0.45, S = 0.9 / H, B = SKELETON.bones, area = B.map(b => 2 * b.r * Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) + Math.PI * b.r * b.r), sum = area.reduce((p, q) => p + q, 0);
  const pos = [], col = [], size = [], order = [], seedA = [], edge = [], bone = [], region = [];
  B.forEach((b, k) => {
    const rgb = new Uint8Array(W * H * 3).fill(255), inside = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wx = X0 + x * S * (900 / 600) * (600 / 900) , wy = Y0 - y * S; const [d, cx, cy] = segDist(X0 + x * (0.5 / W), wy, b.a, b.b); if (d > b.r) continue;
      const px = X0 + x * (0.5 / W), nx = (px - cx) / b.r, ny = (wy - cy) / b.r, rr = Math.hypot(nx, ny), lit = 0.5 + 0.5 * (rr > 1e-6 ? (nx * -0.6 + ny * 0.6) / rr : 0) * Math.min(1, rr), sh = (0.3 + 0.7 * Math.max(0, lit)) * (b.near ? 1 : 0.8) * 0.5, i = (y * W + x) * 3;
      rgb[i] = b.tone[0] * sh; rgb[i + 1] = b.tone[1] * sh; rgb[i + 2] = b.tone[2] * sh; inside[y * W + x] = 1;
    }
    const nb = Math.max(250, Math.round(n * 1.2 * area[k] / sum)), s = stipple({ w: W, h: H, rgb }, { n: nb, iters: 6, mode: "ink", seed: seed + k * 31, edge: 1.7 });
    for (let i = 0; i < s.n; i++) {
      const ix = Math.round((s.pos[i * 3] / s.aspect + 0.5) * W), iy = Math.round((0.5 - s.pos[i * 3 + 1]) * H); if (!inside[Math.min(H - 1, Math.max(0, iy)) * W + Math.min(W - 1, Math.max(0, ix))]) continue;
      const wx = X0 + (ix) * (0.5 / W) + ((s.pos[i * 3] / s.aspect + 0.5) * W - ix) * (0.5 / W), wy = Y0 - ((0.5 - s.pos[i * 3 + 1]) * H) * S;
      const dx = b.b[0] - b.a[0], dy = b.b[1] - b.a[1], t = Math.max(0, Math.min(1, ((wx - b.a[0]) * dx + (wy - b.a[1]) * dy) / (dx * dx + dy * dy)));      // position along the bone: blend with the parent near the joint
      const wp = b.parent >= 0 ? 0.5 * Math.max(0, 1 - t / 0.22) : 0; pos.push(wx, wy, b.near ? 0.006 : -0.006); bone.push(k, b.parent >= 0 ? b.parent : k, 1 - wp, 0); region.push(k);
      col.push(b.tone[0], b.tone[1], b.tone[2]); size.push(s.size[i]); order.push(s.order[i]); seedA.push(s.seed[i]); edge.push(s.edge[i]);
    }
  });
  const P = region.length; return { n: P, pos: Float32Array.from(pos), col: Uint8Array.from(col), size: Float32Array.from(size), order: Float32Array.from(order), region: Uint8Array.from(region), seed: Float32Array.from(seedA), edge: Float32Array.from(edge), bone: Float32Array.from(bone), meta: { aspect: 0.5555, skeleton: SKELETON, kind: "figure", n } };
}
export const figToStip = f => pack(f.n, [["pos", "f32", 3, f.pos], ["col", "u8", 3, f.col], ["size", "f32", 1, f.size], ["order", "f32", 1, f.order], ["region", "u8", 1, f.region], ["seed", "f32", 1, f.seed], ["edge", "f32", 1, f.edge], ["bone", "f32", 4, f.bone]], f.meta);
if (process.argv[1] && process.argv[1].endsWith("figure.mjs")) { const a = process.argv.slice(2); const t0 = Date.now(), f = buildFigure(Number(a.includes("--n") ? a[a.indexOf("--n") + 1] : 9000), Number(a.includes("--seed") ? a[a.indexOf("--seed") + 1] : 4)); fs.writeFileSync(a[0], figToStip(f)); console.log(`${a[0]}: ${f.n} dots in ${((Date.now() - t0) / 1000).toFixed(1)}s`); }
