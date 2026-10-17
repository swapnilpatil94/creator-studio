#!/usr/bin/env node
// Thumbnail from a real frame of the built scene + <= 4-word overlay (the OTHER half of the story, per titles-and-thumbnails).
// Outputs stories/<name>/output/thumb-9x16.png (1080x1920) and thumb-16x9.png (1280x720, frame centred on a blurred copy).
// usage: node tools/thumbnail.mjs stories/<name> [--t 29] [--text "बिना माँ के?"]   (reads publish.seed.json defaults)
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs"; import fs from "node:fs"; import path from "node:path"; import { pathToFileURL } from "node:url";
const dir = path.resolve(process.argv[2]), arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d, P = f => path.join(dir, f);
const seed = fs.existsSync(P("publish.seed.json")) ? JSON.parse(fs.readFileSync(P("publish.seed.json"), "utf8")).thumbnail || {} : {}, t = Number(arg("--t", seed.t ?? 5)), l1 = arg("--line1", seed.line1 ?? ""), l2 = arg("--line2", seed.line2 ?? ""), text = (l1 + " " + l2).trim() || arg("--text", seed.overlay ?? "");
const brandF = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../channels/kathaaya/youtube.json"), brand = fs.existsSync(brandF) ? (JSON.parse(fs.readFileSync(brandF, "utf8")).brand || {}) : {}, pal = { bg: "#050a16", storm: "#16335e", gold: "#f2c14e", soft: "#ffd37a", white: "#f4f6fb", ice: "#bfe3ff", ...(brand.palette ? { bg: brand.palette.bg_dark, storm: brand.palette.storm_blue, gold: brand.palette.gold, soft: brand.palette.gold_soft, white: brand.palette.title_white, ice: brand.palette.ice_blue } : {}) };
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
const FONT = "'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif", MARK = `<div style="position:absolute;left:36px;top:30px;font:600 30px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:9px;color:${pal.gold};opacity:.92">KATHAAYA</div>`;
const titleHtml = (size, align) => `<div style="font:900 ${size}px/1.12 ${FONT};text-align:${align};text-shadow:0 0 36px #000,0 6px 0 #000"><div style="color:${pal.white}">${l1}</div><div style="color:${pal.gold};text-shadow:0 0 36px #000,0 6px 0 #000,0 0 28px ${pal.gold}66">${l2}</div></div>`;
// 9:16 (Shorts): frame full-bleed, brand wordmark top-left, two-line title on a fade at the bottom
await q.setContent(`<body style="margin:0;background:${pal.bg}"><div style="position:relative;width:1080px;height:1920px;overflow:hidden"><img src="${info.url}" style="position:absolute;inset:0;width:1080px;height:1920px"><div style="position:absolute;left:0;right:0;top:1250px;bottom:0;background:linear-gradient(#050a1600,#050a16e6 45%)"></div>${MARK}
<div style="position:absolute;left:40px;right:40px;top:1440px">${titleHtml(205, "center")}<div style="margin:22px auto 0;width:360px;height:4px;background:linear-gradient(90deg,transparent,${pal.gold},transparent)"></div></div></div></body>`);
await q.screenshot({ path: path.join(out, "thumb-9x16.png") });
// 16:9: channel template: stormy navy field, figure right, title left, thin gold rule, wordmark top-left
const r = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await r.setContent(`<body style="margin:0;background:${pal.bg}"><div style="position:relative;width:1280px;height:720px;overflow:hidden;background:radial-gradient(900px 600px at 78% 40%,${pal.storm},${pal.bg} 70%)"><img src="${info.url}" style="position:absolute;left:500px;top:-120px;width:844px;height:1500px;mask-image:radial-gradient(closest-side,#000 62%,transparent);-webkit-mask-image:radial-gradient(closest-side,#000 62%,transparent)">${MARK}
<div style="position:absolute;left:44px;top:150px;width:640px">${titleHtml(150, "left")}<div style="margin-top:26px;width:300px;height:4px;background:linear-gradient(90deg,${pal.gold},transparent)"></div></div></div></body>`);
await r.screenshot({ path: path.join(out, "thumb-16x9.png") }); await b.close(); console.log("thumbnails written to " + out + " (frame t=" + t + "s, text: " + text + ")");
