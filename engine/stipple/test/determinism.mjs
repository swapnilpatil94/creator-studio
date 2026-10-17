// Renders chosen times in two different orders (and one repeated) in the SAME page and in a FRESH page, and compares pixel hashes. usage: node determinism.mjs <scene.html> [fps]
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs"; import { pathToFileURL } from "node:url"; import crypto from "node:crypto";
const html = process.argv[2], fps = Number(process.argv[3] || 24), frames = [20, 100, 150, 230, 300, 372], times = frames.map(f => f / fps);
const args = ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
async function run(order) { const b = await chromium.launch({ headless: true, args }); const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 }); await p.goto(pathToFileURL(html).href + "?render=1"); await p.evaluate(() => window.__ready || true); const h = {};
  for (const i of order) { await p.evaluate(t => window.renderAt(t), times[i]); const buf = await p.screenshot(); h[frames[i]] = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16); } await b.close(); return h; }
const fwd = await run([0, 1, 2, 3, 4, 5]), rev = await run([5, 4, 3, 2, 1, 0]), shuf = await run([3, 0, 5, 1, 4, 2, 3, 0]);
let ok = true; for (const f of frames) { const same = fwd[f] === rev[f] && fwd[f] === shuf[f]; ok = ok && same; console.log(`frame ${f} (t=${(f / fps).toFixed(3)}s): forward ${fwd[f]} reverse ${rev[f]} shuffled ${shuf[f]} -> ${same ? "IDENTICAL" : "DIFFERENT"}`); }
console.log(ok ? "DETERMINISM PASS: frames are order-independent and repeatable across fresh pages" : "DETERMINISM FAIL"); process.exit(ok ? 0 : 1);
