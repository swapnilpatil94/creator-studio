// Per-frame GPU cost (render + 1x1 readPixels to force completion) at several particle counts, flow field ON (12 advection steps/dot), headless Chromium with SOFTWARE WebGL
// (SwiftShader: headless Chromium here exposes no hardware GPU, so real Metal-GPU numbers will be better). Also the full cost incl. PNG screenshot. usage: node bench.mjs <scene.html>
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs"; import { pathToFileURL } from "node:url";
const html = process.argv[2], args = ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const b = await chromium.launch({ headless: true, args }); const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 }); await p.goto(pathToFileURL(html).href + "?render=1"); await p.evaluate(() => window.__ready || true);
const res = await p.evaluate(async () => {
  const S = window.__S, gl = S.renderer.getContext(), px = new Uint8Array(4), out = [];
  for (const k of Object.values(S.clouds)) k.pts.visible = false;
  for (const n of [50000, 100000, 200000, 400000, 800000]) {
    const pos = new Float32Array(n * 3), seed = new Float32Array(n), order = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.5; pos[i * 3 + 1] = (Math.sin(i * 78.233) * 43758.5453 % 1) * 0.5; seed[i] = (Math.sin(i * 3.1) * 9999 % 1 + 1) % 1; order[i] = seed[(i * 7) % n]; }
    const c = S.addCloud("bench" + n, { n, pos, col: new Uint8Array(n * 3).fill(120), size: new Float32Array(n).fill(1), seed, order, meta: { aspect: 1 } }, { size: 0.003 }); c.U.uFlow.value = 1; c.U.uFlowAmp.value = 0.5; c.U.uMorph.value = 0;
    S.setCamera({ dist: 2 }); const t0 = performance.now(); const N = 6; for (let i = 0; i < N; i++) { S.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } const ms = (performance.now() - t0) / N;
    out.push({ n, ms: Math.round(ms) }); c.pts.visible = false; c.pts.geometry.dispose();
  } return out; });
console.log("dots   | ms/frame (render+sync, software WebGL)"); for (const r of res) console.log(String(r.n).padEnd(6), "|", r.ms);
const e2e = []; for (const d of [0.25, 0.5, 1]) { const q = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 }); await q.goto(pathToFileURL(html).href + "?render=1&n=" + d); await q.evaluate(() => window.__ready || true); const t0 = Date.now(); for (const t of [1, 4, 8, 10, 13, 14.5]) { await q.evaluate(t => window.renderAt(t), t); await q.screenshot(); } const st = await q.evaluate(() => window.__stats()); e2e.push({ d, dots: st.points, ms: Math.round((Date.now() - t0) / 6), heap: await q.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1) }); await q.close(); }
console.log("\nproof scene end-to-end (renderAt + 1080x1920 PNG screenshot):"); for (const r of e2e) console.log(`density ${r.d}: ${r.dots} dots drawn/frame, ${r.ms} ms/frame, JS heap ${r.heap} MB`); await b.close();
