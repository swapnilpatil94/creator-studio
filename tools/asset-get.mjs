#!/usr/bin/env node
// Downloads APPROVED candidates only. Without --approve it just prints the list (file, source, licence, size) for sign-off.
// usage: node tools/asset-get.mjs stories/<name> [--approve] [--width 2400]   (ids come from asset-map.json, candidate refs in use)
// Saves assets/original/<id>.jpg (scaled via Commons thumbnail URL when --width is set) and appends credits to assets/CREDITS.md.
import fs from "node:fs"; import path from "node:path";
const a = process.argv.slice(2), dir = path.resolve(a[0] || "."), P = f => path.join(dir, f), approve = a.includes("--approve"), wi = a.indexOf("--width"), width = wi > -1 ? +a[wi + 1] : 0;
const map = JSON.parse(fs.readFileSync(P("assets/asset-map.json"), "utf8")), cands = JSON.parse(fs.readFileSync(P("assets/candidates_all.json"), "utf8")), by = Object.fromEntries(cands.map(c => [c._gid, c]));
const ids = [...new Set(Object.values(map.painting).flatMap(m => (m.have && m.have.length) ? [] : (m.ids || [])))].filter(i => by[i]);
console.log(`${ids.length} images ${approve ? "downloading" : "awaiting approval"}:`);
for (const i of ids) { const c = by[i]; console.log(`${i}\t${c.license}\t${c.w}x${c.h}\t~${c.mb} MB\t${c.title.slice(0, 80)}\t${c.page}`); }
if (!approve) process.exit(0);
fs.mkdirSync(P("assets/original"), { recursive: true });
const credits = [];
for (const i of ids) { const c = by[i], out = P(`assets/original/${i}.jpg`); if (fs.existsSync(out)) continue; const url = width && c.thumb && c.w > width ? c.thumb.replace(/\/\d+px-/, `/${width}px-`) : c.original;
  let ok = false;
  for (let t = 0; t < 4 && !ok; t++) { const r = await fetch(url, { headers: { "User-Agent": "KathaayaStudio/1.0 (swapnilp576p@gmail.com)" } }); if (r.ok) { fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); ok = true; } else { await new Promise(s => setTimeout(s, 4000 * (t + 1))); if (t == 3) console.log("FAILED", i, r.status, url); } }
  if (ok) credits.push(`- ${i}: ${c.title} | ${c.license} | ${c.artist || ""} ${c.date || ""} | ${c.page}`); await new Promise(s => setTimeout(s, 1500)); }
if (credits.length) fs.appendFileSync(P("assets/CREDITS.md"), "\n" + credits.join("\n") + "\n"); console.log("done", credits.length);
