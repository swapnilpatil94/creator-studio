#!/usr/bin/env node
// Validate a pasted/generated scene HTML against the Scene Contract (docs/SCENE_CONTRACT.md).
// usage: node validate-scene.mjs <scene.html> [--json out.json] [--no-shim]
// Exit 0 = usable (errors none). Warnings are things the studio shim repairs automatically.
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs";
import { pathToFileURL, fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const here = path.dirname(fileURLToPath(import.meta.url));
export async function validate(htmlPath, opts = {}) {
  const R = [], add = (level, code, message, fix) => R.push({ level, code, message, fix });
  const src = fs.readFileSync(htmlPath, "utf8"), stats = { bytes: src.length };
  // ---------- static ----------
  if (src.length > 3_000_000) add("error", "too_large", "File is " + (src.length / 1e6).toFixed(1) + " MB; limit is 3 MB.", "Remove embedded base64 images/fonts; draw with canvas/SVG instead.");
  const ext = [...src.matchAll(/(?:src|href)\s*=\s*["'](?:https?:)?\/\/[^"']+["']|url\(\s*["']?(?:https?:)?\/\/[^)"']+|@import\s+["']?(?:https?:)?\/\/[^;"']+/gi)].map(m => m[0].slice(0, 90));
  if (ext.length) add("error", "external_asset", "Scene loads remote assets (" + ext.slice(0, 3).join(" | ") + "). Exports must be offline and reproducible.", "Inline everything: use system fonts, canvas/SVG drawing, no CDN scripts. Paste library code inline if a library is essential.");
  if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon)\b/.test(src)) add("error", "network_api", "Scene uses a network API (fetch/XHR/WebSocket).", "Remove network calls; all data must be embedded in the file.");
  if (/<(video|audio|iframe|embed|object)\b/i.test(src)) add("error", "unseekable_media", "Scene uses <video>/<audio>/<iframe>, which cannot be seeked deterministically per frame.", "Replace with canvas/SVG animation; narration and sound are added by the studio.");
  if (/AudioContext|webkitAudioContext/.test(src)) add("warn", "web_audio", "Scene uses Web Audio. Sound is produced by the studio; scene audio is ignored.", "Remove it.");
  if (!/renderAt/.test(src)) add("error", "no_renderAt", "window.renderAt(seconds) is not defined.", "Define window.renderAt = t => { /* draw the full frame for time t */ } and window.getDuration = () => <seconds>.");
  if (!/getDuration/.test(src)) add("error", "no_getDuration", "window.getDuration() is not defined.", "Define window.getDuration = () => <total seconds>.");
  const flags = { random: /Math\.random\s*\(/.test(src), date: /Date\.now|new Date\b|performance\.now/.test(src), raf: /requestAnimationFrame/.test(src), timers: /set(Timeout|Interval)\s*\(/.test(src), cssAnim: /@keyframes|animation\s*:|transition\s*:/.test(src) };
  if (flags.random) add("warn", "math_random", "Uses Math.random(); the studio shim seeds it per frame time so exports are reproducible.", "Better: use a seeded hash of the element index (see SCENE_PROMPT).");
  if (flags.date) add("warn", "wall_clock", "Uses Date/performance.now; the shim replaces them with the scene time.", "Derive all animation from the t passed to renderAt.");
  if (flags.raf || flags.timers) add("warn", "async_loop", "Uses requestAnimationFrame/timers; they are disabled during export. Animation driven only by them will not move.", "Drive all motion from renderAt(t).");
  if (flags.cssAnim) add("warn", "css_animation", "Uses CSS animations/transitions; they are disabled during export.", "Compute styles inside renderAt(t).");
  // ---------- runtime ----------
  const cfg = { compat: opts.shim !== false, fit: true, captions: opts.captions || null };
  const b = await chromium.launch(opts.software ? { headless: true, args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } : { headless: true });
  const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errs = [], reqs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); p.on("request", r => { if (/^https?:/i.test(r.url())) reqs.push(r.url()); });
  await p.addInitScript(c => { window.__STUDIO = c; }, cfg); if (cfg.compat) await p.addInitScript({ path: path.join(here, "studio-shim.js") });
  const u = pathToFileURL(htmlPath); u.searchParams.set("render", "1");
  try { await p.goto(u.href, { waitUntil: "load", timeout: 20000 }); } catch (e) { add("error", "load_failed", "Page failed to load: " + e.message.slice(0, 160)); }
  await p.waitForTimeout(150);
  const contract = await p.evaluate(() => ({ ra: typeof window.renderAt, gd: typeof window.getDuration, dur: typeof window.getDuration === "function" ? window.getDuration() : null, info: window.__studioInfo || null, sw: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0), sh: document.documentElement.scrollHeight }));
  stats.info = contract.info; stats.duration = contract.dur;
  if (contract.ra !== "function" || contract.gd !== "function") add("error", "contract_missing", "After load, window.renderAt/getDuration are " + contract.ra + "/" + contract.gd + ".", "Assign them synchronously at load time, not inside a timer or promise.");
  else {
    if (!Number.isFinite(contract.dur) || contract.dur < 3 || contract.dur > 180) add("error", "bad_duration", "getDuration() returned " + contract.dur + "; must be a number between 3 and 180 seconds.", "Return the scene length in seconds, e.g. 36.");
    if (contract.info && contract.info.fitZoom !== 1) add("info", "auto_fit", "Design width was " + contract.info.designWidth + "px; the studio scaled it to fit the 540px frame (zoom " + contract.info.fitZoom.toFixed(3) + ").");
    const D = Number.isFinite(contract.dur) ? contract.dur : 10, times = [0.03, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.97].map(f => f * D);
    const frames = [], ms = [];
    for (const t of times) {
      const t0 = Date.now(); const err = await p.evaluate(t => { try { window.renderAt(t); return null; } catch (e) { return String(e && e.message || e); } }, t); ms.push(Date.now() - t0);
      if (err) { add("error", "renderAt_throws", "renderAt(" + t.toFixed(2) + ") threw: " + err.slice(0, 160), "Fix the exception; renderAt must succeed for every t in [0, duration]."); break; }
      const png = await p.screenshot({ type: "png", animations: "disabled" }); frames.push({ t, png, hash: crypto.createHash("sha256").update(png).digest("hex"), fs: frameStats(png) });
    }
    stats.msPerFrame = Math.round(ms.reduce((a, c) => a + c, 0) / Math.max(1, ms.length));
    if (stats.msPerFrame > 1500) add("warn", "slow_frames", "renderAt takes ~" + stats.msPerFrame + " ms/frame; a 40 s film will take a long time to export.", "Reduce per-frame work (fewer elements, batch canvas paths, avoid blur filters).");
    if (frames.length >= 6) {
      // determinism: same t after seeking elsewhere must give identical pixels
      const a = frames[2], c0 = Date.now(); await p.evaluate(t => window.renderAt(t), frames[5].t); await p.evaluate(t => window.renderAt(t), a.t);
      const again = crypto.createHash("sha256").update(await p.screenshot({ type: "png", animations: "disabled" })).digest("hex");
      if (again !== a.hash) add("error", "non_deterministic", "Rendering t=" + a.t.toFixed(2) + " twice (with a seek in between) gave different pixels.", "Something depends on state from previous frames (accumulating variables, un-seeded random, wall clock). Derive every value from t.");
      const lum = frames.map(f => f.fs.mean), std = frames.map(f => f.fs.std);
      if (frames.filter(f => f.fs.mean < 0.012 && f.fs.std < 0.012).length >= 3) add("error", "mostly_blank", "At least 3 of 8 sampled frames are blank/near-black.", "Make sure the scene draws something for every t, including the first and last second.");
      const diffs = []; for (let i = 1; i < frames.length; i++) diffs.push(frames[i].hash === frames[i - 1].hash ? 0 : frameDiff(frames[i].png, frames[i - 1].png)); stats.motion = diffs.map(x => +x.toFixed(3));
      if (diffs.every(d => d < 0.004)) add("error", "static", "The 8 sampled frames are (nearly) identical: nothing moves over time.", "Make positions/opacity/camera functions of t; check that renderAt uses its argument.");
      if (Math.min(...lum) > 0.55) add("warn", "very_bright", "Frames are very bright; the studio's dot-cinema look and caption overlay expect dark backgrounds.", "Use a near-black background.");
      stats.lum = lum.map(x => +x.toFixed(3));
    }
  }
  if (contract.sw > 560 && !(contract.info && contract.info.fitZoom !== 1)) add("warn", "overflow_x", "Content is " + contract.sw + "px wide in a 540px frame.", "Size the stage to 540x960 CSS px (or 1080x1920 and the studio will scale it).");
  if (errs.length) add("error", "page_errors", "Page errors: " + [...new Set(errs)].slice(0, 3).join(" | ").slice(0, 300), "Open the console messages above and fix them; scenes must load without errors.");
  if (reqs.length) add("error", "network_requests", "Scene tried to fetch: " + [...new Set(reqs)].slice(0, 3).join(", "), "Remove remote requests (offline policy).");
  await b.close();
  const errors = R.filter(r => r.level === "error").length;
  return { ok: errors === 0, errors, warnings: R.filter(r => r.level === "warn").length, issues: R, stats, flags };
}
function frameStats(png) { const r = spawnSync("ffmpeg", ["-v", "error", "-i", "pipe:0", "-vf", "scale=54:96,format=gray", "-f", "rawvideo", "-"], { input: png, maxBuffer: 1 << 24 }); const d = r.stdout; let s = 0, q = 0, br = 0; for (const v of d) { s += v; q += v * v; if (v > 230) br++; } const n = d.length || 1, m = s / n / 255, sd = Math.sqrt(Math.max(0, q / n / 65025 - m * m)); return { mean: m, std: sd, bright: br / n }; }
function frameDiff(a, b) { const f = x => spawnSync("ffmpeg", ["-v", "error", "-i", "pipe:0", "-vf", "scale=54:96,format=gray", "-f", "rawvideo", "-"], { input: x, maxBuffer: 1 << 24 }).stdout; const A = f(a), B = f(b); let d = 0; for (let i = 0; i < A.length; i++) d += Math.abs(A[i] - B[i]); return d / A.length / 255; }
if (process.argv[1] && process.argv[1].endsWith("validate-scene.mjs")) {
  const html = path.resolve(process.argv[2]); const out = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
  const rep = await validate(html, { shim: !process.argv.includes("--no-shim") });
  for (const i of rep.issues) console.log(i.level.toUpperCase().padEnd(5) + " [" + i.code + "] " + i.message + (i.fix ? "\n        fix: " + i.fix : ""));
  console.log(rep.ok ? "\nUSABLE (" + rep.warnings + " warnings auto-handled or advisory)" : "\nNOT USABLE: " + rep.errors + " error(s)");
  if (out) fs.writeFileSync(out, JSON.stringify(rep, null, 1)); process.exit(rep.ok ? 0 : 1);
}
