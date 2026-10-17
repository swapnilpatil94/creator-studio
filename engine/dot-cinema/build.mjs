#!/usr/bin/env node
// usage: node build.mjs <entry.js> <out.html> [data.json]  -> single self-contained offline HTML
import { build } from "esbuild"; import fs from "node:fs/promises"; import path from "node:path";
const [entry, out, data] = process.argv.slice(2);
const r = await build({ entryPoints: [path.resolve(entry)], bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", minify: false, loader: { ".png": "dataurl", ".jpg": "dataurl", ".webp": "dataurl" } });
let js = r.outputFiles[0].text;
const dj = data ? await fs.readFile(data, "utf8") : "null";
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>dot-cinema</title>
<style>html,body{margin:0;background:#000;width:540px;height:960px;overflow:hidden}canvas{width:540px;height:960px;display:block}</style></head>
<body><canvas id="c" width="1080" height="1920"></canvas><script>window.DATA=${dj};</script><script>${js.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
if (/(src|href)=["']https?:/i.test(html)) throw new Error("remote asset");
await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true }); await fs.writeFile(out, html); console.log("built", out, (html.length / 1024).toFixed(0) + "KB");
