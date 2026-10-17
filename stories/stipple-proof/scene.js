import { StippleScene, unpack, kf, smooth, smoother, mix, seg, clamp, skeletonMatrices } from "../../engine/stipple/engine.js";
import p01to06 from "./assets/p01to06.stip"; import p04 from "./assets/p04.stip"; import figure from "./assets/figure.stip";

// Proof film for the KATHAAYA stipple engine (16 s). Every dot is a GPU particle; each mode below is a pure function of t.
//  0.0 ink reveal (contours first) | 2.2 flow (curl-noise advection, then the same field run backwards: dots converge home) | 5.0 scatter + reform | 7.0 morph painting 1 -> 2
//  9.4 layered parallax (3 depth layers + camera) | 12.4 rigged stippled walker with a path-following energy stream
const DURATION = 16, cv = document.getElementById("c"), S = new StippleScene({ canvas: cv, width: 1080, height: 1920 });
const urlN = new URLSearchParams(location.search).get("n"), density = urlN ? Number(urlN) : 1;   // ?n=0.5 renders every dot cloud at half density (quality preset)
function thin(set, f) { if (f >= 1) return set; const keep = []; for (let i = 0; i < set.n; i++) if (set.seed[i] < f) keep.push(i); const pick = (a, c) => { const o = new a.constructor(keep.length * c); keep.forEach((k, j) => { for (let q = 0; q < c; q++) o[j * c + q] = a[k * c + q]; }); return o; }; const o = { n: keep.length, meta: set.meta }; for (const k of Object.keys(set)) if (set[k] && set[k].length && k !== "meta") o[k] = pick(set[k], set[k].length / set.n); return o; }
const A = S.addCloud("a", thin(unpack(p01to06), density), { size: 0.0043 }), C = S.addCloud("c", thin(unpack(p04), density), { size: 0.0043 }), figSet = unpack(figure), F = S.addCloud("f", figSet, { size: 0.0021 });
// procedural "divine energy" stream: dots born along a curve, gold, additive-looking via small size (no image involved)
const nD = Math.round(7000 * density), rnd = (() => { let a = 7; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const D = S.addCloud("d", { n: nD, pos: Float32Array.from({ length: nD * 3 }, (_, i) => i % 3 === 2 ? 0 : rnd() - 0.5), col: Uint8Array.from({ length: nD * 3 }, (_, i) => [212, 160, 62][i % 3]), size: Float32Array.from({ length: nD }, () => 0.5 + rnd() * 0.9), seed: Float32Array.from({ length: nD }, () => rnd()), order: Float32Array.from({ length: nD }, () => rnd()), meta: { aspect: 1 } }, { size: 0.0034 });
const skel = figSet.meta.skeleton, DUR_W = 0.9;
function walkAngles(t) { const ph = 2 * Math.PI * t / DUR_W, s = Math.sin, cl = x => Math.max(0, x); return { thighN: 0.55 * s(ph), thighF: -0.55 * s(ph), shinN: -0.95 * cl(Math.cos(ph)), shinF: 0.95 * cl(Math.cos(ph)) * 0 - 0.95 * cl(-Math.cos(ph)), footN: 0.15 * s(ph + 1.6), footF: 0.15 * s(ph + 1.6 + Math.PI), uArmN: -0.5 * s(ph), uArmF: 0.5 * s(ph), fArmN: -0.45 - 0.25 * s(ph), fArmF: -0.45 + 0.25 * s(ph), head: -0.03 * s(2 * ph) }; }
function setCloud(c, o) { for (const [k, v] of Object.entries(o)) c.U[k].value = v; }
function frame(t) {
  // camera
  const cam = t < 9.4 ? { dist: kf([[0, 2.25], [2.2, 1.95], [5, 2.05], [7, 2.1], [9.4, 1.8]], t), x: 0, y: 0, yaw: 0 } : t < 12.4 ? { dist: kf([[9.4, 1.75], [12.4, 1.55]], t), x: kf([[9.4, -0.16], [12.4, 0.16]], t), y: 0, yaw: kf([[9.4, -9], [12.4, 9]], t) } : { dist: 2.0, x: 0, y: 0.0, yaw: kf([[12.4, 0], [16, 3]], t) };
  S.setCamera({ ...cam, roll: 0 });
  const fade = 1 - smooth(seg(t, 15.3, 16));
  // A: painting 1 -> painting 2
  const flowA = kf([[2.2, 0], [3.6, 1.0], [5.0, 0], [9.2, 0], [9.9, 0.9]], t);
  setCloud(A, { uReveal: 0.04 + 0.96 * smooth(seg(t, 0, 2.2)), uRevealSoft: 0.1, uForm: kf([[5.0, 1], [5.7, 0.0], [7.0, 1]], t), uFormSpread: 0.9, uFormStagger: 0.7, uFlow: flowA, uFlowAmp: 0.55, uFlowFreq: 2.2, uFlowT0: 0.5 + (t > 9 ? 3 : 0), uMorph: kf([[7.0, 0], [9.2, 1]], t), uMorphArc: 0.5, uAlpha: (1 - smooth(seg(t, 9.2, 9.9))) * fade });
  // C: layered painting, parallax from the camera + dots reform from a scatter
  setCloud(C, { uForm: smoother(seg(t, 9.4, 11.2)), uFormSpread: 0.7, uFormStagger: 0.8, uAlpha: smooth(seg(t, 9.4, 9.9)) * (1 - smooth(seg(t, 12.0, 12.6))) * fade, uFlow: 0.9 * smooth(seg(t, 12.0, 12.6)), uFlowAmp: 0.5, uFlowT0: 7.0, uOrbit: 0.0 });
  // F: rigged walker (ink dots on parchment) + D: path-following stream
  const tw = Math.max(0, t - 12.4), root = { x: mix(-0.2, 0.2, seg(t, 12.4, 15.6)), y: -0.012 * Math.cos(4 * Math.PI * tw / DUR_W) + 0.0, rot: 0.04 }, m = skeletonMatrices(skel, walkAngles(tw), root);
  F.U.uBone.value.forEach((mat, i) => { if (m[i]) mat.copy(m[i]); });
  setCloud(F, { uUseBones: 1, uReveal: smooth(seg(t, 12.4, 13.2)), uAlpha: (t >= 12.4 ? 1 : 0) * fade, uForm: 1 });
  const pts = [[-0.55, -0.34], [-0.35, -0.2], [-0.15, 0.05], [0.05, 0.18], [0.22, 0.12], [0.38, 0.22], [0.5, 0.3], [0.58, 0.34]]; D.U.uPathPts.value.forEach((v, i) => v.set(pts[i][0], pts[i][1]));
  setCloud(D, { uPathAmt: 1, uPathPhase: t * 0.11, uPathWidth: 0.07, uAlpha: smooth(seg(t, 12.6, 13.4)) * fade * 0.9, uForm: 1, uReveal: 1 });
  S.render();
}
window.getDuration = () => DURATION; window.renderAt = t => { frame(Math.max(0, Math.min(DURATION, Number(t) || 0))); }; window.__stats = () => S.stats(); window.__S = S;
frame(0);
