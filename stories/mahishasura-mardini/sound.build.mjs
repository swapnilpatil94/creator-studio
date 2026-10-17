#!/usr/bin/env node
// Builds sound.json from the narration timings so the sound design re-times itself when takes change.
// usage: node sound.build.mjs   (reads story.json -> segments file; writes sound.json). Silences are honoured by engine/dot-cinema/sound.mjs.
import fs from "node:fs";
const cfg = JSON.parse(fs.readFileSync("story.json", "utf8")), SEG = JSON.parse(fs.readFileSync(cfg.segments, "utf8")).segments;
const B = id => SEG.find(s => s.beat_id === id), clean = w => w.replace(/[।…—,.?!]/g, "");
const wt = (id, pre, fb) => { const w = B(id).words.find(q => clean(q.word).startsWith(pre)); return w ? w.start : fb; };
const r = x => +x.toFixed(2), ids = ["m01", "m02", "m03", "m04", "m05", "m06", "m07", "m08a", "m09"], S = id => B(id).start_seconds;
const nextStart = id => { const i = SEG.findIndex(s => s.beat_id === id); return i + 1 < SEG.length ? SEG[i + 1].start_seconds : B(id).end_seconds + 2.5; };
const shot = id => ({ t0: S(id) - 0.3, len: nextStart(id) - S(id) });
const cues = [], moods = [{ t: -1, mood: "dread" }];
cues.push({ t: -0.9, type: "heartbeat", dur: B("m01").end_seconds + 0.6, bpm0: 56, bpm1: 84, level: -26 }, { t: -0.5, type: "rumble", dur: 4, level: -27 });
for (const id of ids.slice(1)) cues.push({ t: r(S(id) - 0.4), type: "whoosh", dur: 0.5, f0: 300, f1: 2000, level: -27 });
cues.push({ t: r(S("m02") + 0.8), type: "riser", dur: 1.4, level: -28 });
{ const s = shot("m03"); cues.push({ t: r(s.t0 + 0.3 * s.len), type: "crack", level: -20 }, { t: r(s.t0 + 0.3 * s.len), type: "rumble", dur: 3, level: -24 }); }
const silences = [{ t: r(B("m03").end_seconds + 0.05), dur: r(S("m04") - B("m03").end_seconds - 0.1), fade: 0.2, why: "before the turn: the gods' defeat sinks in" }];
moods.push({ t: r(S("m04") - 0.1), mood: "wonder" });
{ const s = shot("m04"), tf = s.t0 + 0.5 * s.len; cues.push({ t: r(S("m04") - 0.2), type: "riser", dur: 0.7, level: -26 }, { t: r(S("m04")), type: "sparkle", dur: r(tf - S("m04")), rate: 16, ramp: true, level: -26 }, { t: r(tf), type: "impact", level: -17, tail: 2.6 }, { t: r(tf + 0.1), type: "bell", freq: 660, level: -22, tail: 3.5 }); }
{ const s = shot("m05"); for (const [u, f] of [[0.28, 520], [0.45, 700], [0.7, 440]]) cues.push({ t: r(s.t0 + u * s.len), type: "bell", freq: f, level: -24, tail: 2.5 }); }
moods.push({ t: r(S("m06") - 0.2), mood: "siege" });
{ const s = shot("m06"); cues.push({ t: r(s.t0), type: "whoosh", dur: r(s.len), f0: 240, f1: 1400, panFrom: -0.8, panTo: 0.8, level: -27 }, { t: r(s.t0), type: "wind", dur: r(s.len + 1), level: -29, cf: 800 }); }
{ const s = shot("m07"); for (const u of [0.2, 0.45, 0.7]) cues.push({ t: r(s.t0 + u * s.len), type: "crack", level: -23 }); }
const tA = S("m08a"), tB = S("m08b"), tCut = wt("m08b", "कटा", tB + 1), tDie = wt("m08b", "ख", tB + 4);
cues.push({ t: r(tA + 0.1), type: "riser", dur: r(Math.max(0.6, tB - tA - 0.3)), level: -27 });
silences.push({ t: r(B("m08a").end_seconds + 0.05), dur: r(tB - B("m08a").end_seconds - 0.1), fade: 0.15, why: "before the strike" });
cues.push({ t: r(tB - 0.2), type: "whoosh", dur: 0.25, f0: 600, f1: 3500, level: -19 }, { t: r(tB + 0.04), type: "impact", level: -12, tail: 3 }, { t: r(tB + 0.04), type: "crack", level: -17 }, { t: r(tCut), type: "crack", level: -20 }, { t: r(tDie), type: "sparkle", dur: 1.4, rate: 18, ramp: true, level: -24 });
moods.push({ t: r(tDie), mood: "release" });
cues.push({ t: r(S("m09")), type: "bell", freq: 528, level: -22, tail: 4.5 }, { t: r(S("m09") - 0.4), type: "wind", dur: 6, level: -30, cf: 650 });
moods.push({ t: r(S("m09")), mood: "wonder" });
fs.writeFileSync("sound.json", JSON.stringify({ lead: cfg.lead ?? 0.9, root: 98, moods, silences, cues }, null, 1)); console.log("sound.json: " + cues.length + " cues, " + silences.length + " silences");
