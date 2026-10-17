#!/usr/bin/env node
// Renders a carousel item to 1080x1350 JPEGs (Instagram/Facebook feed, 4:5): ink-black + gold typography, one fact per slide, KATHAAYA footer. Text-only by default (saves, no deity-image risk).
// usage: node tools/content/carousel.mjs content/items/<id>.json [--out content/out] [--theme ink|parchment]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const file = a.find(x => !x.startsWith("--") && x.endsWith(".json")), item = JSON.parse(fs.readFileSync(path.resolve(file), "utf8")), theme = arg("--theme", "ink"), out = path.resolve(arg("--out", path.join(root, "content/out")), item.slug);
const T = { ink: { bg: "#14100d", fg: "#e9d9ae", gold: "#d4a94a", red: "#a53a2f", dim: "#8a7a5a" }, parchment: { bg: "#f2ead9", fg: "#1a1512", gold: "#9a6f1d", red: "#a53a2f", dim: "#7a6a4a" } }[theme];
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;"), N = item.slides.length;
const html = (text, i) => { const first = i === 0, last = i === N - 1, size = first ? 112 : last ? 70 : 84; return `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}body{width:1080px;height:1350px;background:${T.bg};color:${T.fg};font-family:'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif;position:relative;overflow:hidden}
.frame{position:absolute;inset:44px;border:2px solid ${T.gold}55}.rule{position:absolute;left:120px;top:150px;width:150px;height:6px;background:${first ? T.red : T.gold}}
#t{position:absolute;left:120px;right:120px;top:210px;bottom:250px;display:flex;align-items:center;font-weight:800;line-height:1.38;color:${first ? T.gold : T.fg};font-size:${size}px}
.n{position:absolute;left:120px;top:84px;font-size:34px;color:${T.dim};letter-spacing:.12em}.foot{position:absolute;left:120px;right:120px;bottom:96px;display:flex;justify-content:space-between;font-size:32px;color:${T.dim}}.foot b{color:${T.gold};font-size:38px}
.src{position:absolute;left:120px;right:120px;bottom:156px;font-size:28px;color:${T.dim};line-height:1.4}
</style><body><div class="frame"></div><div class="n">${i + 1} / ${N}</div><div class="rule"></div><div id="t"><span>${esc(text)}</span></div>${last && item.source_line ? `<div class="src">${esc(item.source_line)}</div>` : ""}<div class="foot"><b>KATHAAYA</b><span>@kathaaya.stories</span></div></body>`; };
const { chromium } = await import(pathToFileURL(path.join(root, "engine/node_modules/playwright/index.mjs")).href);
fs.mkdirSync(out, { recursive: true }); const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 }); const files = [];
for (let i = 0; i < N; i++) { await p.setContent(html(item.slides[i], i)); await p.evaluate(() => document.fonts.ready); await p.evaluate(() => { const t = document.getElementById("t"), s = t.firstChild; let f = parseFloat(getComputedStyle(t).fontSize); while (s.getBoundingClientRect().height > t.getBoundingClientRect().height && f > 40) { f -= 4; t.style.fontSize = f + "px"; } });
  const f = path.join(out, String(i + 1).padStart(2, "0") + ".jpg"); await p.screenshot({ path: f, type: "jpeg", quality: 92 }); files.push(f); }
await b.close(); fs.copyFileSync(files[0], path.join(out, "cover.jpg")); const big = files.filter(f => fs.statSync(f).size > 8e6); if (big.length) { console.error("slide over 8 MB:", big); process.exit(1); }
console.log(JSON.stringify({ slug: item.slug, slides: N, dir: out, sizeKB: files.map(f => Math.round(fs.statSync(f).size / 1024)) }));
