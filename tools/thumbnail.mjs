#!/usr/bin/env node
// Thumbnail from a real frame of the built scene + <= 4-word overlay (the OTHER half of the story, per titles-and-thumbnails).
// Outputs stories/<name>/output/thumb-9x16.png (1080x1920) and thumb-16x9.png (1280x720, frame centred on a blurred copy).
// usage: node tools/thumbnail.mjs stories/<name> [--t 29] [--text "बिना माँ के?"]   (reads publish.seed.json defaults)
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs"; import fs from "node:fs"; import path from "node:path"; import { pathToFileURL } from "node:url";
const dir = path.resolve(process.argv[2]), arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d, P = f => path.join(dir, f);
const seed = fs.existsSync(P("publish.seed.json")) ? JSON.parse(fs.readFileSync(P("publish.seed.json"), "utf8")).thumbnail || {} : {}, t = Number(arg("--t", seed.t ?? 5)), text = arg("--text", seed.overlay ?? "");
if ([...text.split(/\s+/)].filter(Boolean).length > 4) { console.error("overlay text must be <= 4 words"); process.exit(1); }
// build a caption-free copy of the scene (the film burns captions into the canvas); the real film is untouched
const sceneSrc = P("scene.js"), tmpScene = P(".thumb-scene.js"), html = "/tmp/.thumb-" + path.basename(dir) + ".html";
if (!fs.existsSync(sceneSrc)) { console.error("scene.js not found"); process.exit(1); }
fs.writeFileSync(tmpScene, fs.readFileSync(sceneSrc, "utf8").replace(/\n\s*caption\(n\);/, "\n"));
const bld = (await import("node:child_process")).spawnSync("node", [path.resolve(path.dirname(new URL(import.meta.url).pathname), "../engine/dot-cinema/build.mjs"), tmpScene, html, P(JSON.parse(fs.readFileSync(P("story.json"), "utf8")).segments)], { encoding: "utf8" }); fs.rmSync(tmpScene, { force: true });
if (bld.status !== 0) { console.error(bld.stderr || bld.stdout); process.exit(1); }
const b = await chromium.launch({ headless: true }); const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(html).href); const info = await p.evaluate(t => { window.renderAt(t); const c = document.getElementById("c"); return { url: c.toDataURL("image/png") }; }, t);
const out = P("output"); fs.mkdirSync(out, { recursive: true }); const q = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
// the scene burns captions into the frame; hide the caption band by painting the same near-black used by the film under it, then place the overlay instead
const FONT = "'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif";
await q.setContent(`<body style="margin:0;background:#020306"><div style="position:relative;width:1080px;height:1920px;overflow:hidden"><img src="${info.url}" style="position:absolute;inset:0;width:1080px;height:1920px"><div style="position:absolute;left:0;right:0;top:1380px;bottom:0;background:linear-gradient(#02030600,#020306cc 40%)"></div>
<div style="position:absolute;left:40px;right:40px;top:1480px;text-align:center;font:900 190px/1.15 ${FONT};color:#ffd37a;text-shadow:0 0 40px #000,0 6px 0 #000">${text}</div></div></body>`);
await q.screenshot({ path: path.join(out, "thumb-9x16.png") });
const r = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await r.setContent(`<body style="margin:0;background:#020306"><div style="position:relative;width:1280px;height:720px;overflow:hidden"><img src="${info.url}" style="position:absolute;left:-290px;top:-250px;width:1280px;height:2276px"><div style="position:absolute;inset:0;background:linear-gradient(90deg,#02030600 40%,#020306e6 70%)"></div>
<div style="position:absolute;left:760px;right:20px;top:200px;font:900 130px/1.15 ${FONT};color:#ffd37a;text-shadow:0 0 30px #000,0 5px 0 #000">${text}</div></div></body>`);
await r.screenshot({ path: path.join(out, "thumb-16x9.png") }); await b.close(); console.log("thumbnails written to " + out + " (frame t=" + t + "s, overlay: " + text + ")");
