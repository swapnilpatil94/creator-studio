#!/usr/bin/env node
// Derive sound cues + mood automation from a scene's own motion and brightness (works for any pasted scene).
// usage: node autocues.mjs <scene.html> <lead> <out.json>
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs";
import { pathToFileURL, fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url)); const [htmlArg, leadS, out] = process.argv.slice(2), lead = Number(leadS);
const raw = png => spawnSync("ffmpeg", ["-v", "error", "-i", "pipe:0", "-vf", "scale=54:96,format=gray", "-f", "rawvideo", "-"], { input: png, maxBuffer: 1 << 24 }).stdout;
const b = await chromium.launch({ headless: true }), p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
await p.addInitScript(c => { window.__STUDIO = c; }, { compat: true, fit: true, captions: null }); await p.addInitScript({ path: path.join(here, "studio-shim.js") });
const u = pathToFileURL(path.resolve(htmlArg)); u.searchParams.set("render", "1"); await p.goto(u.href); await p.waitForTimeout(100);
const dur = await p.evaluate(() => window.getDuration()), STEP = 0.125, E = [], Lm = []; let prev = null;
for (let t = 0; t < dur; t += STEP) { await p.evaluate(t => window.renderAt(t), t); const g = raw(await p.screenshot({ type: "png", animations: "disabled" })); let s = 0; for (const v of g) s += v; Lm.push(s / g.length / 255); let d = 0; if (prev) { for (let i = 0; i < g.length; i++) d += Math.abs(g[i] - prev[i]); d = d / g.length / 255; } E.push(d); prev = g; }
await b.close();
const smooth = (a, k) => a.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - k); j <= Math.min(a.length - 1, i + k); j++) { s += a[j]; c++; } return s / c; });
const Es = smooth(E, 4), sorted = [...Es].sort((a, b) => a - b), q33 = sorted[Math.floor(sorted.length * 0.33)], q66 = sorted[Math.floor(sorted.length * 0.66)];
const moods = []; let last = null; for (let i = 0; i < Es.length; i += 16) { const m = Es[i] < q33 ? "calm" : Es[i] < q66 ? "dread" : "rush"; const t = i * STEP - lead; if (m !== last && (!moods.length || t - moods[moods.length - 1].t >= 4)) { moods.push({ t: +t.toFixed(2), mood: m }); last = m; } }
if (moods.length) moods[0].t = -1; moods.push({ t: +(dur - 4.5 - lead).toFixed(2), mood: "release" });
const mean = E.reduce((a, c) => a + c, 0) / E.length, sd = Math.sqrt(E.reduce((a, c) => a + (c - mean) ** 2, 0) / E.length), cues = []; let lastCue = -9;
for (let i = 2; i < E.length - 1; i++) { const t = i * STEP; if (E[i] > mean + 2.2 * sd && E[i] > 1.6 * E[i - 1] && t - lastCue > 0.8) { const dl = Lm[i] - Lm[i - 2]; const lv = Math.max(-24, Math.min(-12, -26 + 40 * (E[i] - mean))); cues.push(dl > 0.05 ? { t: +(t - lead).toFixed(2), type: "impact", level: +lv.toFixed(1), tail: 2.2 } : { t: +(t - lead).toFixed(2), type: "whoosh", dur: 0.9, level: +(lv - 6).toFixed(1), f0: 250, f1: 2400 }); lastCue = t; } }
cues.push({ t: +(-0.5).toFixed(2), type: "sparkle", dur: 3, rate: 14, ramp: true, level: -28 }); cues.push({ t: +(dur - 3.2 - lead).toFixed(2), type: "bell", freq: 659, level: -22, tail: 4 });
fs.writeFileSync(out, JSON.stringify({ lead, root: 82.4, moods, cues, auto: true, stats: { duration: dur, motionMean: +mean.toFixed(4), transients: cues.length - 2 } }, null, 1)); console.log("autocues: " + (cues.length - 2) + " transient cues, " + moods.length + " mood changes -> " + out);
