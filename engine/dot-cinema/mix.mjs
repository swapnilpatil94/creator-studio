#!/usr/bin/env node
// Mix narration + synthesized sound: sidechain-duck the sound under the voice, loudness-normalize, then verify.
// usage: node mix.mjs <sound.wav> <narration.wav> <lead> <duration> <segments.json> <out.wav> [report.json]
import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import os from "node:os";
const [sfx, narr, leadS, durS, segFile, out, rep] = process.argv.slice(2), lead = Number(leadS), dur = Number(durS);
const ff = args => spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { encoding: "utf8" });
const D = Math.round(lead * 1000), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mix-"));
// stems for verification: delayed voice, ducked sound. gainDb lowers the sound bed; the loop below repairs the voice margin automatically.
function mixOnce(gainDb) {
  const g = (0.9 * Math.pow(10, gainDb / 20)).toFixed(4);
  let r = ff(["-i", sfx, "-i", narr, "-filter_complex", `[1:a]adelay=${D}|${D},aresample=48000,apad[n];[n]asplit=2[nv][nc];[0:a][nc]sidechaincompress=threshold=0.008:ratio=12:attack=8:release=450:makeup=1[duck];[duck]volume=${g},atrim=0:${dur}[d2];[nv]atrim=0:${dur},asetpts=N/SR/TB[n2]`, "-map", "[d2]", path.join(tmp, "duck.wav"), "-map", "[n2]", path.join(tmp, "voice.wav")]);
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  r = ff(["-i", path.join(tmp, "duck.wav"), "-i", path.join(tmp, "voice.wav"), "-filter_complex", `[0:a][1:a]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5:LRA=9,atrim=0:${dur}[o]`, "-map", "[o]", "-ar", "48000", out]);
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
}
// verification
const stat = (file, a, b) => { const x = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", `atrim=${a}:${b},astats=metadata=1:reset=0`, "-f", "null", "-"], { encoding: "utf8" }).stderr; const m = [...x.matchAll(/RMS level dB: (-?[\d.inf]+)/g)]; return m.length ? Number(m[m.length - 1][1]) : -120; };
const segs = JSON.parse(fs.readFileSync(segFile, "utf8")).segments;
function measureRatios() { const ratios = [];
for (const s of segs) { const a = s.start_seconds + lead + 0.1, b = s.end_seconds + lead - 0.1; if (b - a < 0.4) continue; ratios.push({ beat: s.beat_id, voice: stat(path.join(tmp, "voice.wav"), a, b), bed: stat(path.join(tmp, "duck.wav"), a, b) }); }
return ratios; }
let gainDb = 0, ratios, worst, tries = 0;
for (;;) { mixOnce(gainDb); ratios = measureRatios(); worst = Math.min(...ratios.map(x => x.voice - x.bed)); if (worst >= 12.5 || tries >= 4) break; gainDb -= (13 - worst); tries++; console.log("auto-gain: voice margin " + worst.toFixed(1) + " dB too low, lowering sound by " + (13 - worst).toFixed(1) + " dB (total " + gainDb.toFixed(1) + " dB)"); }
const ebu = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr; const lastOf = re => { const m = [...ebu.matchAll(re)]; return m.length ? Number(m[m.length - 1][1]) : NaN; }; const I = lastOf(/I:\s+(-?[\d.]+) LUFS/g), TP = lastOf(/Peak:\s+(-?[\d.]+) dBFS/g);
const checks = [
  ...(gainDb ? [["sound auto-lowered " + (-gainDb).toFixed(1) + " dB to protect the voice", true, tries + " pass(es)"]] : []),
  ["integrated loudness -18..-13 LUFS", I >= -18 && I <= -13, I + " LUFS"],
  ["true peak <= -1 dBFS", TP <= -1, TP + " dBFS"],
  ["voice stays >= 12 dB above the sound bed in every beat", worst >= 12, "worst margin " + worst.toFixed(1) + " dB (" + ratios.map(x => x.beat + ":" + (x.voice - x.bed).toFixed(0)).join(" ") + ")"]
];
checks.forEach(c => console.log((c[1] ? "PASS " : "FAIL ") + c[0] + " — " + c[2]));
if (rep) fs.writeFileSync(rep, JSON.stringify({ I, TP, ratios, checks: checks.map(c => ({ name: c[0], pass: c[1], detail: c[2] })) }, null, 1));
fs.rmSync(tmp, { recursive: true, force: true }); process.exit(checks.every(c => c[1]) ? 0 : 1);
