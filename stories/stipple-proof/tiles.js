import { StippleScene, unpack, THREE } from "../../engine/stipple/engine.js";
import p01 from "./assets/p01.stip"; import p01hd from "./assets/p01_250k.stip"; import yantra from "./assets/synth/yantra.stip"; import temple from "./assets/synth/temple.stip"; import rings from "./assets/synth/rings.stip"; import title from "./assets/synth/title.stip"; import tree from "./assets/synth/tree.stip"; import lotus from "./assets/synth/lotus.stip";
// Technique contact-sheet tiles: ?tile=<n> renders ONE frozen state (4 tiles from a single painting, 8 with no input art at all).
const q = new URLSearchParams(location.search), tile = Number(q.get("tile") || 1), cv = document.getElementById("c"), S = new StippleScene({ canvas: cv, width: 540, height: 960 });
const rnd = (() => { let a = 11; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const synthSet = (n, fn) => { const pos = new Float32Array(n * 3), col = new Uint8Array(n * 3), size = new Float32Array(n), seed = new Float32Array(n), order = new Float32Array(n); for (let i = 0; i < n; i++) { const o = fn(i, rnd); pos.set([o.x, o.y, 0], i * 3); col.set(o.c, i * 3); size[i] = o.s; seed[i] = rnd(); order[i] = rnd(); } return { n, pos, col, size, seed, order, meta: { aspect: 1 } }; };
const cfg = {
  1: { set: p01, cam: { dist: 1.95 }, u: { uSize: 0.0043 } },                                                                  // one image: the whole picture
  2: { set: p01hd, cam: { x: -0.07, y: 0.2, dist: 0.62 }, u: { uSize: 0.0009 } },                                                // same image: face close-up (dots are real, so we can push in)
  3: { set: p01hd, cam: { x: -0.1, y: 0.4, dist: 0.5 }, u: { uSize: 0.00075 } },                                                  // same image: detail crop (weapon hand)
  4: { set: p01, cam: { dist: 1.95 }, u: { uSize: 0.0043, uFlow: 0.85, uFlowAmp: 0.5 } },                                      // same image: flow state
  5: { set: yantra, cam: { dist: 2.1 }, u: { uSize: 0.0046, uForm: 0.55, uFormSpread: 0.5, uColorMix: 0 } },                    // no art: yantra drawn by code, forming
  6: { set: temple, cam: { dist: 2.1 }, u: { uSize: 0.0046, uReveal: 0.55, uColorMix: 0 } },                                   // no art: temple tiers drawn by code, ink reveal
  7: { set: rings, cam: { dist: 2.1 }, u: { uSize: 0.0046, uOrbit: 2.2, uOrbitSpeed: 0.12, uColorMix: 0, uInkCol: [0.55, 0.12, 0.08] } }, // no art: chakravyuha rings, orbiting
  8: { set: title, cam: { dist: 2.1 }, u: { uSize: 0.0044, uFlow: 0.1, uFlowAmp: 0.3, uColorMix: 0 } },                       // no art: Devanagari title as dots, dissolving
  9: { set: tree, cam: { dist: 2.1 }, u: { uSize: 0.0044, uReveal: 0.62, uColorMix: 0 } },                                     // no art: genealogy diagram, reveal
  10: { set: lotus, cam: { dist: 2.1 }, u: { uSize: 0.0046, uForm: 0.6, uFormSpread: 0.45, uColorMix: 0, uInkCol: [0.5, 0.1, 0.07] } }, // no art: lotus bloom
  11: { set: synthSet(9000, (i, r) => ({ x: r() - 0.5, y: 0, c: [212, 160, 62], s: 0.5 + r() })), cam: { dist: 2.0 }, u: { uSize: 0.0036, uPathAmt: 1, uPathPhase: 0.3, uPathWidth: 0.07, uForm: 1 }, path: [[-0.3, -0.38], [-0.28, -0.2], [-0.12, -0.05], [0.02, 0.02], [0.15, 0.1], [0.2, 0.22], [0.1, 0.34], [0, 0.44]] },   // no art: divine-energy stream (path-follow)
  12: { set: synthSet(9000, (i, r) => { const a = r(); return { x: (r() - 0.5) * 0.5, y: -0.5 + r() * 0.2, c: a < 0.25 ? [168, 38, 28] : [212, 150, 50], s: 0.4 + r() * 1.1 }; }), cam: { dist: 2.0 }, u: { uSize: 0.0035, uPathAmt: 1, uPathPhase: 0.2, uPathWidth: 0.2, uForm: 1 }, path: [[0, -0.5], [0.04, -0.35], [-0.05, -0.2], [0.06, -0.05], [-0.04, 0.1], [0.05, 0.25], [-0.02, 0.38], [0, 0.5]] }   // no art: rising embers (fire)
}[tile];
const C = S.addCloud("t", cfg.set.n && cfg.set.pos ? (cfg.set.col && cfg.set.col.BYTES_PER_ELEMENT ? cfg.set : unpack(cfg.set)) : unpack(cfg.set), { size: cfg.u.uSize });
for (const [k, v] of Object.entries(cfg.u)) { if (k === "uInkCol") C.U.uInkCol.value.set(...v); else if (k !== "uSize") C.U[k].value = v; }
if (cfg.path) C.U.uPathPts.value.forEach((v, i) => v.set(cfg.path[i][0], cfg.path[i][1]));
S.setCamera({ x: 0, y: 0, dist: 2, ...cfg.cam }); S.render();
window.getDuration = () => 1; window.renderAt = () => { S.render(); };
