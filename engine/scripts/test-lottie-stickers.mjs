#!/usr/bin/env node
// Renders each new Lottie sticker to a PNG so they can be eyeballed before trusting them in a real film.
import { chromium } from "playwright"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), lotDir = path.join(root, "engine/longform/lottie");
const lottieSrc = fs.readFileSync(path.join(root, "engine/node_modules/lottie-web/build/player/lottie_canvas.min.js"), "utf8");
const names = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(lotDir).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
const outDir = "/tmp/lottie-check"; fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ headless: true }); const p = await b.newPage({ viewport: { width: 400, height: 400 } });
await p.setContent(`<!doctype html><html><body style="margin:0;background:#111"><canvas id="c" width="400" height="400"></canvas></body></html>`);
await p.addScriptTag({ content: lottieSrc });
for (const name of names) {
  const data = JSON.parse(fs.readFileSync(path.join(lotDir, name + ".json"), "utf8"));
  await p.evaluate(({ data }) => { const c = document.getElementById("c"); c.getContext("2d").clearRect(0, 0, 400, 400); window.__anim && window.__anim.destroy(); window.__anim = window.lottie.loadAnimation({ renderer: "canvas", loop: false, autoplay: false, animationData: data, rendererSettings: { context: c.getContext("2d"), clearCanvas: true } }); window.__anim.goToAndStop(15, true); }, { data });
  await p.screenshot({ path: path.join(outDir, name + ".png") });
  console.log(name, "-> ", path.join(outDir, name + ".png"));
}
await b.close();
