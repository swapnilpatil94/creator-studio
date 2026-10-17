// usage: node frames.mjs <scene.html> <outPrefix> <gpu|soft> t1 t2 ...   -> PNG per time + ms per frame (renderAt + screenshot)
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs"; import { pathToFileURL } from "node:url";
const [html, pre, mode, ...ts] = process.argv.slice(2);
const b = await chromium.launch(mode === "gpu" ? { headless: true } : { headless: true, args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 }); const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(pathToFileURL(html).href + "?render=1"); await p.evaluate(() => window.__ready || true);
const info = await p.evaluate(() => { const gl = document.createElement("canvas").getContext("webgl2"); const e = gl && gl.getExtension("WEBGL_debug_renderer_info"); return { renderer: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "n/a", dur: window.getDuration() }; }); console.log(JSON.stringify(info));
for (const t of ts) { const t0 = Date.now(); await p.evaluate(t => window.renderAt(t), Number(t)); await p.screenshot({ path: `${pre}${String(t).replace(".", "_")}.png` }); console.log(`t=${t} ${Date.now() - t0} ms`); }
console.log("stats", JSON.stringify(await p.evaluate(() => window.__stats && window.__stats())), "errors:", errs.slice(0, 4)); await b.close();
