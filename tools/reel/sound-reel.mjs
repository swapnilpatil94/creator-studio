#!/usr/bin/env node
// Sound design for a story: reads the narration timing, the plan (transitions, tone, shots, text beats) and the look, and writes sound.json for engine/dot-cinema/sound.mjs.
// Think like a sound engineer: priority is voice > effects > music. Every sound has a reason on screen, lands on the frame it belongs to (whooshes start ~2 frames early), and uses RECORDED CC0 files
// (assets/sound, ledger in assets/sound/LEDGER.json) for the real world feel, with the synthesised drone/bells kept as the thin devotional layer underneath.
//   typing        every typed text (title, kinetic words, quotes, the 3D hero word, the end card) gets a real keystroke per letter at the exact time the engine reveals it
//   transitions   whip pan = fast whoosh, zoom-through = long whoosh + soft thud, light leak = air + glass shimmer, hard cut in fire = deep impact, dissolve = silence
//   shot cuts     inside a beat (coverage.mjs): deep impact in fire/ember beats, soft air elsewhere
//   moments       hook = low hit + riser that peaks as the title lands; reveal = silence, riser, big hit, bell; end card = pop on the save/share/comment pill
//   music         one CC0 bed per film chosen by the film's mood (never the same track as the last films), crossfade-looped, carved around the speech band
// usage: node tools/reel/sound-reel.mjs stories/<name>
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), dir = path.resolve(process.argv[2]), J = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { return d; } };
const cfg = J("story.json"), segF = J(cfg.segments), SEG = segF.segments, B = J("beats.json"), by = Object.fromEntries(SEG.map(s => [s.beat_id, s])), r = x => +x.toFixed(3);
const lead = cfg.lead ?? 0.9, tail = cfg.tail ?? 1.9, dur = segF.duration_seconds, look = J("look.json", {}), pack = J("pack.json", {}), plan = J("plan.final.json", null) || J("plan.json", []);
const G = new Intl.Segmenter("hi", { granularity: "grapheme" }), gl = t => [...G.segment(t)].map(x => x.segment);
const cues = [], moods = [{ t: -1, mood: "wonder" }], silences = [], N = B.length;
// a sound that belongs to something on screen is snapped to the FIRST FRAME where that thing is visible (the picture can only change every 1/fps s; a sound that arrives before its frame is the one people notice).
// film time = narration time + lead, frames sit on the 1/fps grid.
let LAG = 0;   // text that enters through a fading transition (zoom, light leak) is faint for its first letters: its keys wait a little (measured: 2 frames early otherwise)
const FPS = cfg.fps || 24, fq = t => Math.ceil((t + LAG + lead) * FPS - 1e-6) / FPS - lead;
// the engine's beat timeline (engine/longform/core.js): beat i starts 0.2 s before its first word, the first beat at -lead, the last ends with the film
const T0 = plan.map((p, i) => i === 0 ? -lead : (by[p.id]?.start_seconds ?? 0) - 0.2), T1 = T0.map((_, i) => i === plan.length - 1 ? dur + tail : T0[i + 1]);
// LEVELS (dB, effects-stem scale: the loudest hit is the reference, -17). Reads as a mix: big hit 0, mid -5, small -11, whooshes -13..-17, shimmer/pop -23..-27, keystrokes -25..-33
// (the narrator sits ~30 dB above a keystroke), so the typing is a texture you feel, not a sound you notice.
// calibrated by rendering each effect alone (peak and loudest 200 ms RMS) so soft things are really soft: ws -42 (it was the loudest whoosh at -34), risers up to -24 so they build into the hit
const LV = { big: -17, mid: -22, small: -28, wf: -26, wl: -32, ws: -42, air: -38, riser: -24, riserDark: -25, glitch: -33, shimmer: -44, pop: -40, kExtrude: -42, kTitle: -44, kKinetic: -46, kQuote: -48, kEnd: -50 };
const KEY = LV.kKinetic, S = (pool, t, level, extra = {}) => cues.push({ t: r(fq(t)), type: "sample", pool, level, ...extra }), TYPE = (times, level = KEY) => { const q = times.map(fq); if (q.length) cues.push({ t: r(q[0]), type: "typing", times: q.map(r), level }); };
const rev = B.findIndex(b => b.intent === "reveal" || b.intent === "punch"), mid = B.findIndex(b => b.intent === "tense");

// ---- the base layer (unchanged ideas): a slow heartbeat under the hook, mood changes, authored silences, bells on the reflective close ----
cues.push({ t: -0.6, type: "heartbeat", dur: r(by[B[0].id].end_seconds + 0.8), bpm0: 58, bpm1: 86, level: -29 });
B.forEach((b, i) => { const s = by[b.id], t0 = s.start_seconds;
  if (b.intent === "tense" && i === mid) moods.push({ t: r(t0 - 0.1), mood: "dread" });
  if (b.intent === "reveal" && i === rev) { silences.push({ t: r(Math.max(0, t0 - 0.38)), dur: 0.34, fade: 0.12, why: "before the reveal" }); moods.push({ t: r(t0), mood: "release" });
    S("riser", t0 + 0.05, LV.riser, { alignPeak: true, fit: 0.72, send: 0.3 }); S("impact_big", t0 + 0.05, LV.big); cues.push({ t: r(t0 + 0.1), type: "bell", freq: 587, level: -23, tail: 3 }); }
  if (b.intent === "reflective") cues.push({ t: r(t0 + 0.1), type: "bell", freq: 440, level: -25, tail: 3.2 }, { t: r(t0), type: "sparkle", dur: r(Math.min(3, s.end_seconds - t0)), rate: 10, ramp: true, level: -30 });
  if (i === N - 1) { silences.push({ t: r(Math.max(0, t0 - 0.3)), dur: 0.26, fade: 0.1, why: "before the call to action" }); cues.push({ t: r(t0 + 0.1), type: "bell", freq: 528, level: -24, tail: 3.5 }); }
  if (b.intent === "tense" && i > 0 && B[i - 1].intent !== "tense") S("riser_dark", t0 - 0.2, LV.riserDark, { alignPeak: true, fit: 1.3, send: 0.4 }); });

// ---- the hook: a low hit as the film opens, and a riser that peaks exactly as the typed title lands ----
const p0 = plan[0]?.params || {};
// nothing is audible before ~0.5 s (the pipeline's QA checks that the first sound matches the narration onset): the riser starts then, time-fitted so its peak lands as the title finishes typing
if (p0.fx === "title_behind" && p0.title) { const tg = gl(p0.title).length, landed = T0[0] + 0.05 + 0.9, riseStart = -lead + 0.5;
  S("riser", landed, LV.riser, { alignPeak: true, fit: Math.max(0.35, landed - riseStart), send: 0.3 }); S("impact_mid", landed + 0.01, LV.mid); S("impact_small", landed + 0.02, LV.small + 3);
  TYPE(Array.from({ length: tg }, (_, g) => T0[0] + 0.05 + 0.9 * (g + 1) / tg), LV.kTitle); }
else S("impact_mid", -lead + 0.62, LV.mid);   // lands with the first word

plan.forEach((p, i) => { const pr = p.params || {}, a = T0[i], z = T1[i], tone = pr.tone, hot = tone === "fire" || tone === "ember", shots = pr.shots || [];
  // ---- transitions (engine: params.transition, durations whip .30 zoom .42 leak .55 dissolve .35 cut 0) ----
  if (i > 0) { const tr = pr.transition || look.transition || "dissolve", side = i % 2 ? 0.5 : -0.5;
    if (tr === "whip") S("whoosh_fast", a - 0.1, LV.wf, { pan: side, send: 0.2 });
    else if (tr === "zoom") { S("whoosh_long", a + 0.26, LV.wl, { alignPeak: true, send: 0.3 }); S("impact_small", a + 0.3, LV.small); }
    else if (tr === "leak") { S("air", a - 0.05, LV.air, { send: 0.4 }); S("shimmer", a + 0.2, LV.shimmer, { send: 0.5 }); }
    else if (tr === "cut") S(tone === "fire" ? "impact_mid" : "impact_small", a - 0.02, tone === "fire" ? LV.mid : LV.small);
    else if (tr === "wipe" || tr === "iris") S("whoosh_soft", a - 0.1, LV.ws, { pan: side });
    /* dissolve: silence, the music carries it */ }
  // ---- cuts inside a beat (coverage shots) ----
  if (shots.length && (p.comp === "cinema" || p.comp === "fx")) { const k = shots.length + 1, cuts = [a]; for (let j = 1; j < k; j++) cuts.push(a + (z - a) * j / k);
    cuts.slice(1).forEach((c, j) => { if (hot) { S("impact_small", c - 0.02, LV.small); S("whoosh_fast", c - 0.12, LV.wf - 2, { pan: j % 2 ? 0.4 : -0.4 }); } else S("whoosh_soft", c - 0.1, LV.ws, { pan: j % 2 ? 0.3 : -0.3 }); }); }
  // ---- effects with a sound of their own ----
  if (pr.fx === "chromatic_glitch_wipe") S("glitch", a + 0.1, LV.glitch, { trim: 0.6, fade: 0.15 });
  if (pr.fx === "speed_ramp_punch") S("impact_mid", a + (pr.times?.[0] ?? 0.5) * (z - a), LV.mid);
  // ---- typed text: one real key per letter, at the moment the renderer reveals it ----
  LAG = i > 0 ? ({ zoom: 0.06, leak: 0.04 }[pr.transition || look.transition || "dissolve"] || 0) : 0;
  if (p.comp === "kinetic" && Array.isArray(pr.lines)) {
    const rows = pr.lines.map(l => l.split(/\s+/).map(w => w.replace(/\*/g, "")).filter(Boolean));
    if (pr.style === "extrude") { const txt = rows.map(w => w.join(" ")), totG = txt.reduce((q, l) => q + gl(l).length, 0), d = 0.2 * Math.min(4, txt.join("").length / 2);
      TYPE(Array.from({ length: totG }, (_, g) => a + 0.1 + d * (g + 1) / totG), LV.kExtrude); S("impact_mid", a + 0.1 + d + 0.02, LV.mid); S("shimmer", a + 0.9, LV.shimmer + 3, { send: 0.5 }); }
    else { let acc = 0; const times = []; for (const words of rows) for (const w of words) { const n = gl(w).length, tw = 0.12 + acc * 0.04; for (let j = 0; j < n; j++) times.push(a + tw + 0.04 * (j + 1)); acc += n + 1; } TYPE(times, LV.kKinetic);
      if (pr.style === "slam" || pr.style === "glitch") S("impact_small", a + 0.16, LV.small + 2); } }
  if (p.comp === "quote" && pr.text) { const totC = gl(pr.text).length, D = Math.max(1.6, (z - a) * 0.6), times = Array.from({ length: totC }, (_, c) => a + 0.2 + (D - 0.2) * (1 - Math.pow(1 - (c + 1) / totC, 1 / 3))); TYPE(times, LV.kQuote); }
  LAG = 0;
});

// ---- the end card: four lines type in, then the save/share/comment pill pops ----
{ const start = dur + tail - 2.2, lines = ["KATHAAYA", "WhatsApp चैनल जुड़िए", "kathaaya.getbyterush.com/wa", "@kathaaya.stories  ·  Facebook"], times = [];
  lines.forEach((t, i) => { const n = gl(t).length; for (let c = 0; c < n; c++) times.push(start + 0.4 + i * 0.22 + 0.3 * (c + 1) / n); }); TYPE(times, LV.kEnd); S("pop", start + 1.4 + 0.12, LV.pop, { send: 0.2 }); }

// ---- music: one CC0 bed by the film's mood, never the track the last films used ----
const MOODMAP = { war: "war", cosmic: "cosmic", river: "river", sorrow: "sorrow", devotion: "devotion", neutral: "neutral" }, histF = path.join(root, "content/sound-history.json");
let music = null; const droneTrimDb = -6;
try { const led = JSON.parse(fs.readFileSync(path.join(root, "assets/sound/LEDGER.json"), "utf8")).files.filter(f => f.kind === "music"), mood = MOODMAP[look.mood] || "neutral", pool = led.filter(f => f.mood === mood), hist = (() => { try { return JSON.parse(fs.readFileSync(histF, "utf8")); } catch { return []; } })(), name = path.basename(dir);
  let pick = hist.find(h => h.story === name && fs.existsSync(path.join(root, "assets/sound/music", h.track)))?.track;
  if (!pick && pool.length) { const recent = hist.slice(-3).map(h => h.track), fresh = pool.filter(f => !recent.includes(path.basename(f.id))), use = fresh.length ? fresh : pool, seed = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7); pick = path.basename(use[seed % use.length].id); fs.writeFileSync(histF, JSON.stringify([...hist.filter(h => h.story !== name), { story: name, mood, track: pick }].slice(-40), null, 1)); }
  if (pick) music = { file: path.join(root, "assets/sound/music", pick), gainDb: mood === "war" ? -4 : -2, carveDb: -3 };   // tracks are -23 LUFS: -2 puts the bed ~18 dB under the narrator once ducked
} catch (e) { console.error("music pick skipped: " + e.message.slice(0, 120)); }
// fallback if the CC0 library is missing: the old optional music folder (our own synthesised tanpura drones), as before
if (!music) { try { const md = path.join(root, "assets/music"), files = fs.readdirSync(md).filter(f => /\.(wav|mp3|m4a|flac|ogg)$/i.test(f)); if (files.length) { const mood = look.mood || "", pool = files.filter(f => f.toLowerCase().startsWith(mood.toLowerCase() + "-")), pick = pool.length ? pool : files, seed = [...path.basename(dir)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7); music = { file: path.join(md, pick[seed % pick.length]), gainDb: -6, carveDb: -3 }; } } catch {} }
fs.writeFileSync(path.join(dir, "sound.json"), JSON.stringify({ lead, root: 98, moods, silences, cues: cues.sort((a, b) => a.t - b.t), ...(music ? { music, droneTrimDb } : {}) }, null, 1));
console.log(`sound.json: ${cues.length} cues (${cues.filter(c => c.type === "typing").reduce((q, c) => q + c.times.length, 0)} keystrokes), ${silences.length} silences${music ? ", music " + path.basename(music.file) : ""}`);
