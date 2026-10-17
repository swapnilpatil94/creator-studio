#!/usr/bin/env node
// Builds sound.json (procedural sound design) for the ~10-minute film from beats.json + the narration timings, so it re-times itself when takes change.
// usage: node sound.build.mjs  (run inside this folder; reads story.json -> segments; writes sound.json)
import fs from "node:fs";
const cfg = JSON.parse(fs.readFileSync("story.json", "utf8")), SEG = JSON.parse(fs.readFileSync(cfg.segments, "utf8")).segments, BEATS = JSON.parse(fs.readFileSync("beats.json", "utf8"));
const seg = Object.fromEntries(SEG.map(s => [s.beat_id, s])), r = x => +x.toFixed(2), start = id => seg[id].start_seconds, end = id => seg[id].end_seconds;
const nextStart = i => i + 1 < BEATS.length ? start(BEATS[i + 1].id) : end(BEATS[i].id) + 2.5;
const MOOD = { ch0: "dread", ch1: "calm", ch2: "dread", ch3: "wonder", ch4: "siege", ch5: "siege", ch6: "release", ch7: "wonder" };
const cues = [], moods = [], silences = []; let lastCh = null;
BEATS.forEach((b, i) => {
  const t0 = start(b.id), t1 = nextStart(i), len = t1 - t0, ref = b.visual.ref, sil = !!b.silent;
  if (b.chapter !== lastCh) { moods.push({ t: r(i === 0 ? -1 : t0 - 0.1), mood: MOOD[b.chapter] || "calm" }); lastCh = b.chapter; }
  if (b.card) { cues.push({ t: r(t0 + 0.05), type: "impact", level: -21, tail: 2.4 }, { t: r(t0 + 0.1), type: "bell", freq: 392, level: -25, tail: 3.2 }); return; }
  if (i > 0 && BEATS[i - 1].visual.ref === ref && b.visual.type !== "painting") return;   // consecutive beats of one shot: cue once
  if (i > 0 && !sil && BEATS[i - 1].visual.ref !== ref && b.visual.type === "painting") cues.push({ t: r(t0 - 0.3), type: "whoosh", dur: 0.45, f0: 300, f1: 1800, level: -29 });
  if (ref === "light-mountain") cues.push({ t: r(t0), type: "riser", dur: r(Math.max(0.8, len * 0.8)), level: -26 }, { t: r(t0 + len * 0.55), type: "sparkle", dur: r(len * 0.45), rate: 18, ramp: true, level: -25 }, { t: r(t0 + len - 0.3), type: "bell", freq: 660, level: -22, tail: 3.5 });
  else if (ref === "shockwave") { if (b.chapter === "ch5") silences.push({ t: r(t0 - 0.4), dur: 0.36, fade: 0.12, why: "before the kill" }); cues.push({ t: r(t0 + 0.02), type: "impact", level: -12, tail: 3 }, { t: r(t0 + 0.02), type: "crack", level: -17 }, { t: r(t0 + 0.9), type: "sparkle", dur: 1.6, rate: 14, ramp: true, level: -26 }); }
  else if (ref === "falling-lights") cues.push({ t: r(t0), type: "sparkle", dur: r(len), rate: 6, level: -29 }, { t: r(t0), type: "rumble", dur: r(Math.min(3, len)), level: -28 });
  else if (ref === "energy-stream" || ref === "light-burst" || ref === "rays") cues.push({ t: r(t0), type: "riser", dur: r(Math.max(0.7, len * 0.7)), level: -27 }, { t: r(t0 + len * 0.7), type: "bell", freq: 523, level: -24, tail: 3 });
  else if (ref === "chakra") cues.push({ t: r(t0), type: "whoosh", dur: r(len), f0: 400, f1: 2800, level: -26 });
  else if (ref === "trident" || ref === "weapons-ring" || ref === "bell" || ref === "cup") for (const u of [0.15, 0.5, 0.8]) cues.push({ t: r(t0 + u * len), type: "bell", freq: [440, 587, 392][Math.round(u * 5) % 3], level: -25, tail: 2.4 });
  else if (ref === "army-count" || ref === "dark-water") cues.push({ t: r(t0), type: "rumble", dur: r(len), level: -27 });
  else if (ref === "twist") cues.push({ t: r(t0), type: "riser", dur: r(len * 0.9), level: -26 });
  else if (ref === "last-dab") { silences.push({ t: r(end(BEATS[i - 1].id) + 0.05), dur: r(Math.max(0.3, t0 - end(BEATS[i - 1].id) - 0.1)), fade: 0.15, why: "before the thesis line" }); cues.push({ t: r(t0 + 0.05), type: "bell", freq: 528, level: -22, tail: 5 }, { t: r(t0 - 0.3), type: "wind", dur: 7, level: -30, cf: 650 }); }
  else if (ref === "next-part") cues.push({ t: r(t0), type: "riser", dur: r(Math.min(3, len)), level: -28 }, { t: r(t0 + Math.min(3, len)), type: "crack", level: -24 });
  else if (b.intent === "punch" && !sil) cues.push({ t: r(t0 + 0.05), type: "crack", level: -26 });
});
cues.unshift({ t: -0.9, type: "heartbeat", dur: r(end(BEATS[2].id) + 0.6), bpm0: 56, bpm1: 84, level: -26 });
cues.sort((a, b) => a.t - b.t);
fs.writeFileSync("sound.json", JSON.stringify({ lead: cfg.lead ?? 0.9, root: 98, moods, silences, cues }, null, 1)); console.log("sound.json: " + cues.length + " cues, " + silences.length + " silences, " + moods.length + " moods");
