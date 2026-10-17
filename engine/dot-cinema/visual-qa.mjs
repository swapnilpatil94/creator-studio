#!/usr/bin/env node
// Measures a dot-cinema scene's own geometry (window.__debug) at every sample time, checks it against
// standards.json, and (with --fix N) repairs violations by editing overrides.json and re-measuring.
// usage: node visual-qa.mjs <scene.html> <overrides.json> [--fix 8] [--report out.json]
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs";
import { pathToFileURL, fileURLToPath } from "node:url"; import fs from "node:fs"; import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), html = path.resolve(args[0]), ovPath = path.resolve(args[1]);
const fixN = args.includes("--fix") ? Number(args[args.indexOf("--fix") + 1]) : 0;
const repIdx = args.indexOf("--report"), reportPath = repIdx >= 0 ? args[repIdx + 1] : null;
const std = JSON.parse(fs.readFileSync(path.join(here, "standards.json"), "utf8"));
const readOv = () => fs.existsSync(ovPath) ? JSON.parse(fs.readFileSync(ovPath, "utf8")) : {};

async function measure(ov) {
  const b = await chromium.launch({ headless: true }), p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  await p.addInitScript(o => { window.OVERRIDES = o; }, ov);
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(pathToFileURL(html).href);
  const dur = await p.evaluate(() => window.getDuration()), out = [];
  for (let t = 0.4; t < dur - 0.4; t += std.sampleStep) out.push(await p.evaluate(t => window.__debug(t), t));
  await b.close(); if (errs.length) throw new Error("page errors: " + errs.join("; "));
  return out;
}
const nearCut = n => std.cutWindows.some(c => Math.abs(n - c) < 0.6);
function evaluate(samples) {
  const V = [], R = std.rules;
  samples.forEach((s, i) => {
    const h = s.hero, add = (rule, value, detail, fix) => V.push({ rule, shot: s.shot, t: s.t, n: s.n, value, detail, fix });
    if (h && !nearCut(s.n)) {
      if (h.blown > R.hero_not_blown.max) add("hero_not_blown", h.blown, "blown " + (h.blown * 100).toFixed(0) + "%", { type: "heroGain" });
      if (h.moonOverlap > R.hero_moon_readable.maxOverlap && h.moonLum > R.hero_moon_readable.maxLumOverMoon) {
        const hx = (h.bbox[0] + h.bbox[2]) / 2; add("hero_moon_readable", h.moonOverlap, "overlap " + (h.moonOverlap * 100).toFixed(0) + "% over moon, hero lum " + h.moonLum.toFixed(2), { type: "moonShift", dir: hx < s.moon.x ? 1 : -1 });
      }
      if (R.hero_size.shots.includes(s.shot) && (h.area < R.hero_size.minArea || h.area > R.hero_size.maxArea)) add("hero_size", h.area, "area " + (h.area * 100).toFixed(1) + "%", { type: "zoom", factor: h.area < R.hero_size.minArea ? 1.12 : 0.88 });
      if (!R.hero_not_cropped.exemptShots.includes(s.shot) && h.border > R.hero_not_cropped.maxBorder) add("hero_not_cropped", h.border, "touching edge " + (h.border * 100).toFixed(1) + "%", { type: "zoom", factor: 0.9 });
      if (h.capOverlap > R.caption_clear_of_hero.maxOverlap) add("caption_clear_of_hero", h.capOverlap, "caption covers " + (h.capOverlap * 100).toFixed(0) + "% of hero", { type: "camDy", delta: 90 });
    }
    if (s.headCap > R.caption_clear_of_face.maxOverlap && !nearCut(s.n)) add("caption_clear_of_face", s.headCap, "caption covers " + (s.headCap * 100).toFixed(0) + "% of the face", { type: "camDy", delta: 90 });
    if (s.head && R.head_in_frame.shots.includes(s.shot) && !nearCut(s.n)) {
      const m = R.head_in_frame.minMargin, hb = s.head, W = 1080, H = 1920;
      const margins = { left: hb[0] / W, right: 1 - hb[2] / W, top: hb[1] / H, bottom: 1 - hb[3] / H }, worst = Object.entries(margins).sort((a, b) => a[1] - b[1])[0];
      if (worst[1] < m) add("head_in_frame", worst[1], "head " + worst[0] + " margin " + (worst[1] * 100).toFixed(1) + "%", { type: "headFrame", side: worst[0], over: Math.abs(Math.min(0, worst[1])) });
    }
    if (i > 0 && !nearCut(s.n)) {
      const p = samples[i - 1], dt = s.t - p.t, zr = Math.abs(Math.log(s.cam.zoom / p.cam.zoom)) / dt, pr = Math.hypot(s.cam.x - p.cam.x, s.cam.y - p.cam.y) * s.cam.zoom / dt;
      if (p.shot === s.shot) {
        if (zr > R.camera_zoom_rate.maxLogPerSec) V.push({ rule: "camera_zoom_rate", shot: s.shot, t: s.t, n: s.n, value: zr, detail: "zoom rate " + zr.toFixed(2) + "/s", fix: null });
        if (pr > R.camera_pan_rate.maxPxPerSec) V.push({ rule: "camera_pan_rate", shot: s.shot, t: s.t, n: s.n, value: pr, detail: "pan " + pr.toFixed(0) + "px/s", fix: null });
      }
    }
  });
  return V;
}
function applyFixes(ov, V) {
  ov.zoom = ov.zoom || {}; ov.camDx = ov.camDx || {}; ov.camDy = ov.camDy || {}; ov.moonShift = ov.moonShift || {}; ov.heroGain = ov.heroGain || { all: 1 };
  const done = [], seen = new Set(), touchedY = new Set();
  const order = { head_in_frame: 0, hero_not_cropped: 1, hero_moon_readable: 2, hero_not_blown: 3, hero_size: 4, caption_clear_of_face: 5, caption_clear_of_hero: 6 };
  for (const v of [...V].sort((a, b) => (order[a.rule] ?? 9) - (order[b.rule] ?? 9))) {
    if (!v.fix) continue; const key = v.rule + "|" + v.shot; if (seen.has(key)) continue; seen.add(key);
    const f = v.fix, sh = v.shot;
    if (f.type === "heroGain") { ov.heroGain.all = +(ov.heroGain.all * 0.86).toFixed(3); done.push("heroGain -> " + ov.heroGain.all); }
    else if (f.type === "moonShift") { const m = ov.moonShift[sh] = ov.moonShift[sh] || { dx: 0, dy: 0 }; m.dx += f.dir * 140; m.dy -= 40; done.push("moonShift[" + sh + "] -> " + m.dx + "," + m.dy); }
    else if (f.type === "zoom") { ov.zoom[sh] = +((ov.zoom[sh] || 1) * f.factor).toFixed(3); done.push("zoom[" + sh + "] -> " + ov.zoom[sh]); }
    else if (f.type === "camDy") { if (touchedY.has(sh)) continue; touchedY.add(sh); ov.camDy[sh] = (ov.camDy[sh] || 0) + f.delta; done.push("camDy[" + sh + "] -> " + ov.camDy[sh]); }
    else if (f.type === "headFrame") {
      // head cropped: pull the camera so the head moves toward the cropped side, and zoom out a little
      if (f.side === "top" || f.side === "bottom") touchedY.add(sh); const step = 140; if (f.side === "left") ov.camDx[sh] = (ov.camDx[sh] || 0) - step; if (f.side === "right") ov.camDx[sh] = (ov.camDx[sh] || 0) + step;
      if (f.side === "top") ov.camDy[sh] = (ov.camDy[sh] || 0) - step; if (f.side === "bottom") ov.camDy[sh] = (ov.camDy[sh] || 0) + step;
      ov.zoom[sh] = +((ov.zoom[sh] || 1) * 0.94).toFixed(3); done.push("headFrame[" + sh + "] " + f.side + " -> camDx " + (ov.camDx[sh] || 0) + ", camDy " + (ov.camDy[sh] || 0) + ", zoom " + ov.zoom[sh]);
    }
  }
  return done;
}
function summarize(V) { const g = {}; for (const v of V) { const k = v.rule + " @" + v.shot; (g[k] = g[k] || []).push(v); } return Object.entries(g).map(([k, a]) => k + "  x" + a.length + "  worst: " + a.sort((x, y) => Math.abs(y.value) - Math.abs(x.value))[0].detail); }

let ov = readOv(), history = [], V;
for (let it = 0; ; it++) {
  const samples = await measure(ov); V = evaluate(samples);
  const fixable = V.filter(v => v.fix);
  console.log("\n== pass " + it + ": " + V.length + " violations (" + fixable.length + " auto-fixable) over " + samples.length + " samples ==");
  summarize(V).forEach(l => console.log("  " + l));
  history.push({ pass: it, violations: V.length, fixable: fixable.length });
  if (!fixN || it >= fixN || !fixable.length) break;
  const done = applyFixes(ov, V); fs.writeFileSync(ovPath, JSON.stringify(ov, null, 1)); console.log("  applied:", done.join(" | "));
}
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify({ history, remaining: summarize(V), overrides: ov }, null, 1));
process.exit(V.length ? 1 : 0);
