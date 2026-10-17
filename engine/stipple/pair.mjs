#!/usr/bin/env node
// Pairs two stipple clouds for morphing: A keeps its dots and each dot gets a target (pos2, col2) taken from B by matching Hilbert-curve rank, which keeps
// neighbouring dots moving together (a cheap, deterministic stand-in for optimal transport). usage: node engine/stipple/pair.mjs a.stip b.stip out.stip
import fs from "node:fs"; import { unpack, pack } from "./format.mjs";
function hilbert(x, y, n = 1024) { let d = 0; for (let s = n >> 1; s > 0; s >>= 1) { const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0; d += s * s * ((3 * rx) ^ ry); if (ry === 0) { if (rx === 1) { x = n - 1 - x; y = n - 1 - y; } const t = x; x = y; y = t; } } return d; }
const keyOf = (set, i) => { const asp = set.meta.aspect; return hilbert(Math.max(0, Math.min(1023, Math.floor((set.pos[i * 3] / asp + 0.5) * 1023))), Math.max(0, Math.min(1023, Math.floor((0.5 - set.pos[i * 3 + 1]) * 1023)))); };
export function pairSets(A, B) {
  const ia = Array.from({ length: A.n }, (_, i) => i).sort((p, q) => keyOf(A, p) - keyOf(A, q) || p - q), ib = Array.from({ length: B.n }, (_, i) => i).sort((p, q) => keyOf(B, p) - keyOf(B, q) || p - q);
  const pos2 = new Float32Array(A.n * 3), col2 = new Uint8Array(A.n * 3); const ra = A.meta.aspect, rb = B.meta.aspect, fit = Math.min(ra / rb, 1) ; // B is scaled to A's frame (same height)
  ia.forEach((a, r) => { const b = ib[Math.min(B.n - 1, Math.floor(r * B.n / A.n))]; pos2[a * 3] = B.pos[b * 3]; pos2[a * 3 + 1] = B.pos[b * 3 + 1]; pos2[a * 3 + 2] = B.pos[b * 3 + 2]; col2[a * 3] = B.col[b * 3]; col2[a * 3 + 1] = B.col[b * 3 + 1]; col2[a * 3 + 2] = B.col[b * 3 + 2]; });
  return { ...A, pos2, col2 };
}
export const pairedToStip = P => pack(P.n, [["pos", "f32", 3, P.pos], ["col", "u8", 3, P.col], ["size", "f32", 1, P.size], ["order", "f32", 1, P.order], ["region", "u8", 1, P.region], ["seed", "f32", 1, P.seed], ["edge", "f32", 1, P.edge], ["pos2", "f32", 3, P.pos2], ["col2", "u8", 3, P.col2]], P.meta);
if (process.argv[1] && process.argv[1].endsWith("pair.mjs")) { const [a, b, o] = process.argv.slice(2), A = unpack(new Uint8Array(fs.readFileSync(a))), B = unpack(new Uint8Array(fs.readFileSync(b))); fs.writeFileSync(o, pairedToStip(pairSets(A, B))); console.log(`${o}: ${A.n} dots paired to ${B.n}`); }
