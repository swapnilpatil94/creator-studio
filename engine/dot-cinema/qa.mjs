#!/usr/bin/env node
// QA on the ACTUAL rendered mp4: dimensions, fps, duration, audio level/clipping/silence, a/v sync onset,
// blank / frozen / repeated frames, caption presence + margin clipping.
// usage: node qa.mjs <video.mp4> <segments.json> <leadSeconds> <report.json>
import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
const [video, segFile, leadS, out, cutsArg, silArg] = process.argv.slice(2); const DECLARED = silArg ? JSON.parse(silArg) : []; const CUTS = cutsArg ? JSON.parse(cutsArg) : []; const LEAD = Number(leadS || 0);
const [EW, EH] = (process.env.QA_SIZE || "1080x1920").split("x").map(Number);   // expected output size; long-form landscape sets QA_SIZE=1920x1080
const segs = JSON.parse(fs.readFileSync(segFile, "utf8")); segs.segments = segs.segments.filter(s => s.words && s.words.length);   // silent cards/breaths carry no words
const narrEnd = segs.duration_seconds, firstWord = segs.segments[0].words[0].start;
const run = (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: o.buffer ? "buffer" : "utf8", maxBuffer: 1 << 30 });
const checks = []; const add = (name, pass, detail) => { checks.push({ name, pass, detail }); console.log((pass ? "PASS " : "FAIL ") + name + " — " + detail); };

const pr = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", video]).stdout);
const v = pr.streams.find(s => s.codec_type === "video"), a = pr.streams.find(s => s.codec_type === "audio"), dur = Number(pr.format.duration);
const [fn, fd] = v.r_frame_rate.split("/").map(Number), fps = fn / fd;
add("dimensions " + EW + "x" + EH, v.width === EW && v.height === EH, v.width + "x" + v.height);
add("frame rate 24", Math.abs(fps - 24) < 0.01, fps.toFixed(2) + " fps");
add("audio stream present", !!a, a ? a.codec_name + " " + a.sample_rate + "Hz" : "missing");
add("duration covers narration + lead", dur >= narrEnd + LEAD - 0.05, dur.toFixed(2) + "s vs needed " + (narrEnd + LEAD).toFixed(2) + "s");

// audio levels / clipping / silence inside the narration window
const vd = run("ffmpeg", ["-i", video, "-vn", "-af", "volumedetect", "-f", "null", "-"]).stderr;
const mean = Number((vd.match(/mean_volume: (-?[\d.]+)/) || [])[1]), peak = Number((vd.match(/max_volume: (-?[\d.]+)/) || [])[1]);
add("audio loudness sane (-30..-12 dB mean)", mean > -30 && mean < -12, "mean " + mean + " dB");
add("no clipping (peak < -0.5 dB)", peak < -0.5, "peak " + peak + " dB");
const sd = run("ffmpeg", ["-i", video, "-vn", "-af", "silencedetect=noise=-38dB:d=0.9", "-f", "null", "-"]).stderr;
const sil = [...sd.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]).filter(([s, e]) => s > LEAD + 0.5 && e < LEAD + narrEnd - 0.2).filter(([s, e]) => !DECLARED.some(([a, b]) => s >= a - 0.35 && e <= b + 0.35));
add("no unintended silence >0.9s inside narration" + (DECLARED.length ? " (" + DECLARED.length + " declared silences exempt)" : ""), sil.length === 0, sil.length ? JSON.stringify(sil) : "none");

// sync: first audible onset vs expected first word
const pcm = run("ffmpeg", ["-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-af", "highpass=f=250,lowpass=f=2400", "-f", "f32le", "-"], { buffer: true }).stdout;
const f = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 4)); let onset = -1; const win = 800, rmsArr = []; for (let i = 0; i + win < f.length; i += win) { let e = 0; for (let k = 0; k < win; k++) e += f[i + k] * f[i + k]; rmsArr.push(Math.sqrt(e / win)); }
{ const sorted = [...rmsArr].sort((x, y) => x - y), p90 = sorted[Math.floor(sorted.length * 0.9)] || 0; const idx = rmsArr.findIndex(v => v > Math.max(0.01, 0.25 * p90)); onset = idx >= 0 ? idx * win / 16000 : -1; }
const expected = LEAD + firstWord;
add("audio onset matches scene timeline (±0.25s)", onset >= 0 && Math.abs(onset - expected) < 0.25, "onset " + onset.toFixed(2) + "s vs expected " + expected.toFixed(2) + "s");

// frames
const W = EW > EH ? 480 : 270, H = EW > EH ? 270 : 480, raw = run("ffmpeg", ["-v", "error", "-i", video, "-vf", "fps=4,scale=" + W + ":" + H + ",format=gray", "-f", "rawvideo", "-"], { buffer: true }).stdout;
const n = Math.floor(raw.length / (W * H)), fr = i => raw.subarray(i * W * H, (i + 1) * W * H);
const mean0 = i => { let s = 0; const b = fr(i); for (let k = 0; k < b.length; k += 7) s += b[k]; return s / (b.length / 7); };
let blank = [], diffs = [], longestStatic = 0, run0 = 0;
for (let i = 0; i < n; i++) {
  const t = i / 4; const m = mean0(i); if (m < 6 && t > 1.4 && t < dur - 0.8 && !CUTS.some(c => Math.abs(t - c) < 0.45)) blank.push(t);
  if (i > 0) { let d = 0; const A = fr(i), B = fr(i - 1); for (let k = 0; k < A.length; k += 5) d += Math.abs(A[k] - B[k]); d /= A.length / 5; diffs.push(d); if (d < 0.35) { run0++; longestStatic = Math.max(longestStatic, run0); } else run0 = 0; }
}
add("no blank frames mid-film (declared dip cuts exempt)", blank.length === 0, blank.length ? blank.join(",") : (CUTS.length ? "none; exempted cuts at " + CUTS.join(",") : "none"));
add("no frozen stretch >1.5s", longestStatic / 4 < 1.5, "longest static run " + (longestStatic / 4).toFixed(2) + "s");
const dup = diffs.filter(d => d < 0.35).length / diffs.length; add("repeated-frame share < 12%", dup < 0.12, (dup * 100).toFixed(1) + "% near-identical samples");
const mo = diffs.reduce((x, y) => x + y, 0) / diffs.length; add("motion present (mean diff > 1.0)", mo > 1.0, "mean frame delta " + mo.toFixed(2));

// captions: bright text in band during speech; nothing bright hugging the side margins
let capMiss = [], clip = [];
let CAPTHR = 215; try { const lk = JSON.parse(fs.readFileSync(path.join(path.dirname(segFile), "../../look.json"), "utf8")); if (lk.captions === "chroma") CAPTHR = 150; } catch {}   // chroma captions (one colour per word) are not all near-white: coral, violet and teal sit at a mid luma, still bright against their dark outline
let TEXTLED = new Set(); try { const pf = path.join(path.dirname(segFile), "../../plan.final.json"), pl = JSON.parse(fs.readFileSync(pf, "utf8")); TEXTLED = new Set((pl.plan || pl).filter(b => ["kinetic", "quote", "dotword", "chapter"].includes(b.comp)).map(b => b.id)); } catch {}   // text-led beats animate the words themselves, the subtitle is hidden there
for (const s of segs.segments.filter(s => !TEXTLED.has(s.beat_id))) { let best = 0, sideMax = 0;   // words pop in one by one, so a single sample can land on one short word: a beat passes when ANY of three samples (35%, 50%, 65% of the beat) shows a caption
  for (const k of [0.35, 0.5, 0.65]) { const tt = s.start_seconds + (s.end_seconds - s.start_seconds) * k, i = Math.round((tt + LEAD) * 4); if (i >= n) continue; const b = fr(i); let band = 0, side = 0;
    for (let y = Math.floor(H * 0.7); y < Math.floor(H * 0.9); y++) for (let x = 0; x < W; x++) { const val = b[y * W + x]; if (val > CAPTHR) { band++; if (x < W * 0.04 || x > W * 0.96) side++; } }
    best = Math.max(best, band); sideMax = Math.max(sideMax, side); }
  if (best < 120) capMiss.push(s.beat_id); if (sideMax > 6) clip.push(s.beat_id);
}
add("captions visible for every beat", capMiss.length === 0, capMiss.length ? "missing " + capMiss.join(",") : "all beats");
// side-margin safety is checked on the scene's measured caption geometry by visual-qa (caption_in_margins), not by pixels

const failed = checks.filter(c => !c.pass).length;
fs.writeFileSync(out, JSON.stringify({ video, duration: dur, fps, checks, failed }, null, 2)); console.log(failed ? failed + " FAILED" : "ALL " + checks.length + " PASSED");
process.exit(failed ? 1 : 0);
