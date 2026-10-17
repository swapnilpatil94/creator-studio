#!/usr/bin/env node
// usage: node build.mjs <entry.js> <out.html> [data.json]  -> single self-contained offline HTML
import { build } from "esbuild"; import fs from "node:fs/promises"; import path from "node:path";
const [entry, out, data, size = "1080x1920"] = process.argv.slice(2), [PW, PH] = size.split("x").map(Number), CW = PW / 2, CH = PH / 2;   // canvas px (render DSF 2) -> CSS px
const r = await build({ entryPoints: [path.resolve(entry)], bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", minify: false, loader: { ".png": "dataurl", ".jpg": "dataurl", ".webp": "dataurl", ".stip": "binary" } });
let js = r.outputFiles[0].text;
const dj = data ? await fs.readFile(data, "utf8") : "null";
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>dot-cinema</title>
<style>html,body{margin:0;background:#000;width:${CW}px;height:${CH}px;overflow:hidden}canvas{width:${CW}px;height:${CH}px;display:block}</style></head>
<body><canvas id="c" width="${PW}" height="${PH}"></canvas><script>window.DATA=${dj};</script><script>${js.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
if (/(src|href)=["']https?:/i.test(html)) throw new Error("remote asset");
await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true }); await fs.writeFile(out, html); console.log("built", out, (html.length / 1024).toFixed(0) + "KB");
