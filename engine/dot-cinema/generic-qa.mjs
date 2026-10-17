#!/usr/bin/env node
// Standards check for ANY pasted scene (no cooperation needed): exposure, dark/blown frames, caption legibility + margins.
// usage: node generic-qa.mjs <scene.html> <overrides.json> <segments.json> <lead> [--fix 6] [--report out.json]
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs";
import { pathToFileURL, fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
import { std, runQA } from "./qa-core.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), html = path.resolve(args[0]), ovPath = path.resolve(args[1]), segFile = args[2], lead = Number(args[3]);
const fixN = args.includes("--fix") ? Number(args[args.indexOf("--fix") + 1]) : 0, repIdx = args.indexOf("--report"), reportPath = repIdx >= 0 ? args[repIdx + 1] : null;
const segs = JSON.parse(fs.readFileSync(segFile, "utf8")).segments; const TS = args.includes("--ts") ? Number(args[args.indexOf("--ts") + 1]) : 1, VDUR = args.includes("--vdur") ? Number(args[args.indexOf("--vdur") + 1]) : null, NOCAP = args.includes("--no-captions");
const raw = (png, vf) => spawnSync("ffmpeg", ["-v", "error", "-i", "pipe:0", "-vf", vf, "-f", "rawvideo", "-"], { input: png, maxBuffer: 1 << 26 }).stdout;
export async function measure(ov, opts = {}) {
  const b = await chromium.launch({ headless: true }), p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const cfg = { compat: true, fit: true, captions: NOCAP ? null : { segments: segs, lead, dim: ov.capDim?.scene ?? 0.6, timeScale: TS }, exposure: ov.exposure?.scene ?? 1 };
  await p.addInitScript(c => { window.__STUDIO = c; }, cfg); await p.addInitScript({ path: path.join(here, "studio-shim.js") });
  const errs = []; p.on("pageerror", e => errs.push(e.message)); const u = pathToFileURL(html); u.searchParams.set("render", "1"); await p.goto(u.href); await p.waitForTimeout(100);
  const sdur = await p.evaluate(() => window.getDuration()), dur = VDUR || sdur, out = [];
  for (let t = 0.4; t < dur - 0.4; t += opts.step || 0.5) { const ts = t * TS;
    await p.evaluate(t => { window.__capHide(false); window.renderAt(t); }, ts); const geom = await p.evaluate(() => window.__capGeom());
    await p.evaluate(t => { window.__capHide(true); window.renderAt(t); }, ts); const png = await p.screenshot({ type: "png", animations: "disabled" });
    const g = raw(png, "scale=108:192,format=gray"); let sum = 0, blown = 0; for (const v of g) { sum += v; if (v > 230) blown++; }
    const s = { t, n: t - lead, dur, shot: "scene", generic: true, cam: { x: 0, y: 0, zoom: 1 }, frame: { mean: sum / g.length / 255, blown: blown / g.length }, caption: geom, capBgLum: null, headCap: 0, hero: null };
    const seg = segs.find(q => s.n >= q.start_seconds + 0.15 && s.n <= q.end_seconds - 0.05);
    if (geom && seg) { const x = Math.max(0, geom.x0 | 0), y = Math.max(0, geom.y0 | 0), w = Math.min(1080 - x, (geom.x1 - geom.x0) | 0), h = Math.min(1920 - y, (geom.y1 - geom.y0) | 0); const crop = raw(png, `crop=${w}:${h}:${x}:${y},scale=${Math.max(8, w >> 3)}:${Math.max(8, h >> 3)},format=gray`); const dim = ov.capDim?.scene ?? 0.6; let br = 0; for (const v of crop) if (v / 255 * (1 - dim * 0.95) > 0.45) br++; s.capBgLum = br / crop.length; }
    out.push(s);
  }
  await b.close(); if (errs.length) throw new Error("page errors: " + errs.join("; ")); return out;
}
if (process.argv[1] && process.argv[1].endsWith("generic-qa.mjs")) { const r = await runQA({ measure, ovPath, fixN, reportPath }); process.exit(r.violations.length ? 1 : 0); }
