#!/usr/bin/env node
// Procedural sound design for a reel story from its beats and narration timings (re-times itself when the voice changes). usage: node tools/reel/sound-reel.mjs stories/reel-<slug>
import fs from "node:fs"; import path from "node:path";
const dir = path.resolve(process.argv[2]), J = f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), cfg = J("story.json"), SEG = J(cfg.segments).segments, B = J("beats.json"), by = Object.fromEntries(SEG.map(s => [s.beat_id, s])), r = x => +x.toFixed(2);
const cues = [], moods = [{ t: -1, mood: "wonder" }], silences = []; const N = B.length, rev = B.findIndex(b => b.intent === "reveal" || b.intent === "punch"), mid = B.findIndex(b => b.intent === "tense");
cues.push({ t: -0.6, type: "heartbeat", dur: r(by[B[0].id].end_seconds + 0.8), bpm0: 58, bpm1: 86, level: -27 });
B.forEach((b, i) => { const s = by[b.id], t0 = s.start_seconds; if (i > 0) cues.push({ t: r(t0 - 0.3), type: "whoosh", dur: 0.45, f0: 320, f1: 2000, level: -28 }); if (b.intent === "tense" && i === mid) moods.push({ t: r(t0 - 0.1), mood: "dread" }); if (b.intent === "reveal" && i === rev) { silences.push({ t: r(Math.max(0, t0 - 0.38)), dur: 0.34, fade: 0.12, why: "before the reveal" }); moods.push({ t: r(t0), mood: "release" }); cues.push({ t: r(t0 + 0.05), type: "impact", level: -17, tail: 2.2 }, { t: r(t0 + 0.1), type: "bell", freq: 587, level: -23, tail: 3 }); } if (b.intent === "reflective") cues.push({ t: r(t0 + 0.1), type: "bell", freq: 440, level: -25, tail: 3.2 }, { t: r(t0), type: "sparkle", dur: r(Math.min(3, s.end_seconds - t0)), rate: 10, ramp: true, level: -28 }); if (i === N - 1) { silences.push({ t: r(Math.max(0, t0 - 0.3)), dur: 0.26, fade: 0.1, why: "before the call to action" }); cues.push({ t: r(t0 + 0.1), type: "bell", freq: 528, level: -24, tail: 3.5 }); } if (b.intent === "tense" && i > 0 && B[i - 1].intent !== "tense") cues.push({ t: r(t0 - 0.2), type: "riser", dur: 1.2, level: -28 }); });
// coverage cuts inside a beat (tools/longform/coverage.mjs) get their own sound on the exact frame the renderer cuts: a low impact in fire/ember beats, a soft air whoosh elsewhere
{ const planF = path.join(dir, "plan.json"); if (fs.existsSync(planF)) { const { shotCuts } = await import("../../engine/longform/cuts.js"); const plan = J("plan.json"), lead = cfg.lead ?? 0.9, tail = cfg.tail ?? 1.9, dur = J(cfg.segments).duration_seconds, T0 = plan.map((p, i) => i === 0 ? -lead : (by[p.id]?.start_seconds ?? 0) - 0.2), T1 = T0.map((_, i) => i === plan.length - 1 ? dur + tail : T0[i + 1]);
  plan.forEach((p, i) => { const sh = p.params?.shots; if (!sh || !sh.length || !(p.comp === "cinema" || p.comp === "fx")) return; const hot = p.params.tone === "fire" || p.params.tone === "ember"; shotCuts(T0[i], T1[i], sh.length + 1, (by[p.id]?.words || []).map(w => w.start)).slice(1, -1).forEach(c => { if (hot) cues.push({ t: r(c - 0.02), type: "impact", tail: 1.1, level: -27 }); cues.push({ t: r(c - 0.18), type: "whoosh", dur: 0.22, f0: 500, f1: 2400, level: hot ? -30 : -33 }); }); }); } }
moods.sort((a, b) => a.t - b.t);
// optional background music bed: assets/music/<mood>-*.{wav,mp3} (see its README). Picked deterministically from the story's own look mood (or any track if no mood match), so a story always gets the same track.
const musicDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../assets/music");
let music = null;
try {
  const files = fs.readdirSync(musicDir).filter(f => /\.(wav|mp3|m4a|flac|ogg)$/i.test(f));
  if (files.length) { const lookF = path.join(dir, "look.json"), mood = (fs.existsSync(lookF) ? JSON.parse(fs.readFileSync(lookF, "utf8")).mood : null) || "";
    const pool = (mood && files.filter(f => f.toLowerCase().startsWith(mood.toLowerCase() + "-"))) || []; const pick = pool.length ? pool : files;
    const seed = [...path.basename(dir)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7), file = pick[seed % pick.length];
    music = { file: path.join(musicDir, file), gainDb: -16 }; }
} catch {}
fs.writeFileSync(path.join(dir, "sound.json"), JSON.stringify({ lead: cfg.lead ?? 0.6, root: 98, moods, silences, cues: cues.sort((a, b) => a.t - b.t), ...(music ? { music } : {}) }, null, 1)); console.log(`sound.json: ${cues.length} cues, ${silences.length} silences`);
