// Audio mix: continuous narration + atmospheric bed ducked under the voice + room tone + sparing SFX; a deliberate music drop before the final line; loudnorm to -14 LUFS / -1.5 dBTP; mux with the silent render; SRT.
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), STUDIO = path.resolve(RF, ".."), SFX = path.join(STUDIO, "assets/sound/sfx"), MUSIC = path.join(STUDIO, "assets/sound/music");
const sfxFile = name => { const d = path.join(SFX, name); if (!fs.existsSync(d)) return null; const f = fs.readdirSync(d).sort().find(x => /\.(ogg|wav|mp3|m4a)$/.test(x)); return f ? path.join(d, f) : null; };
const fmt = t => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000, p2 = (n, w = 2) => String(n).padStart(w, "0"); return `${p2(h)}:${p2(m)}:${p2(s)},${p2(r, 3)}`; };
export function srt(plan) { let n = 1, o = ""; for (const b of plan.beats) { const ws = b.words || []; for (let i = 0; i < ws.length; i += 6) { const g = ws.slice(i, i + 6), a = b.start + g[0].s, e = b.start + g.at(-1).e + 0.15; o += `${n++}\n${fmt(a)} --> ${fmt(e)}\n${g.map(w => w.t).join(" ")}\n\n`; } } return o; }
/** opts: { video, voice, plan, compose (compose.json manifest), out, music, musicGain, offset, drop: {before,after} } */
/** a quiet heartbeat loop (two low thumps per second), synthesised once with ffmpeg: no licence, no network */
export function heartbeatFile() { const f = path.join(RF, "assets/sfx/heartbeat.wav"); if (fs.existsSync(f)) return f; fs.mkdirSync(path.dirname(f), { recursive: true });
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=58:sample_rate=44100:duration=1.0", "-f", "lavfi", "-i", "sine=frequency=48:sample_rate=44100:duration=1.0", "-filter_complex", "[0]afade=t=out:st=0.02:d=0.16,adelay=0|0,apad=whole_dur=1[a];[1]afade=t=out:st=0.02:d=0.2,adelay=300|300,apad=whole_dur=1,volume=0.8[b];[a][b]amix=inputs=2:normalize=0,lowpass=f=140,volume=2.2", "-t", "1", f], { encoding: "utf8" }); if (r.status !== 0) throw new Error("heartbeat failed: " + r.stderr.slice(-200)); return f; }
export function mix({ video, voice, plan, manifest, out, music = "neutral-quiet-credits.m4a", musicGain = 0.20, roomGain = 0.012, sfxGain = 0.5, log = console.log }) {
  const dur = manifest.total_seconds, off = plan.voice_offset ?? 0.5, last = plan.beats.at(-1), lastStart = last.start, lastEnd = last.start + last.seconds, a = lastStart - 1.5, b = lastStart - 0.55, c = lastEnd + 0.15, d = lastEnd + 2.2;
  const tens = plan.beats.filter(b => b.mood === "pressure" || b.mood === "reveal"), hb = tens.length ? { from: tens[0].start, to: Math.min(dur - 3, plan.beats.filter(b => b.mood === "reveal").map(b => b.start + b.seconds).at(-1) ?? lastStart - 1.6) } : null;
  const cues = manifest.cues.filter(q => q.name && sfxFile(q.name)), inputs = ["-i", video, "-i", voice, "-stream_loop", "-1", "-i", path.join(MUSIC, music)]; cues.forEach(q => inputs.push("-i", sfxFile(q.name))); if (hb && hb.to > hb.from + 1) inputs.push("-stream_loop", "-1", "-i", heartbeatFile());
  const env = `if(lt(t\\,${a.toFixed(2)})\\,${musicGain}\\,if(lt(t\\,${b.toFixed(2)})\\,${musicGain}*(1-(t-${a.toFixed(2)})/${(b - a).toFixed(2)})\\,if(lt(t\\,${c.toFixed(2)})\\,0\\,if(lt(t\\,${d.toFixed(2)})\\,${musicGain}*0.7*(t-${c.toFixed(2)})/${(d - c).toFixed(2)}\\,${musicGain}*0.7))))`;
  let fg = `[1:a]adelay=${Math.round(off * 1000)}:all=1,apad[vo0];[vo0]atrim=0:${dur},asplit=2[vo][sc];`
    + `[2:a]atrim=0:${dur},asetpts=PTS-STARTPTS,afade=t=in:d=2,volume='${env}':eval=frame[mus0];[mus0][sc]sidechaincompress=threshold=0.02:ratio=9:attack=15:release=600:makeup=1[mus];`
    + `anoisesrc=color=brown:amplitude=0.5:duration=${dur}:sample_rate=44100,lowpass=f=900,volume=${roomGain}[room];`;
  const mixIn = ["[vo]", "[mus]", "[room]"];
  cues.forEach((q, i) => { fg += `[${3 + i}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${sfxGain},adelay=${Math.max(0, Math.round(q.at * 1000))}:all=1[s${i}];`; mixIn.push(`[s${i}]`); });
  if (hb && hb.to > hb.from + 1) { const hi = 3 + cues.length; fg += `[${hi}:a]atrim=0:${(hb.to - hb.from).toFixed(2)},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, hb.to - hb.from - 1.5).toFixed(2)}:d=1.5,volume=0.22,adelay=${Math.round(hb.from * 1000)}:all=1[hb];`; mixIn.push("[hb]"); }
  fg += `${mixIn.join("")}amix=inputs=${mixIn.length}:normalize=0:duration=longest,atrim=0:${dur},alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=9,afade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2[aout]`;
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", fg, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(dur), "-movflags", "+faststart", out], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("mix failed: " + (r.stderr || "").slice(-400)); fs.writeFileSync(out.replace(/\.mp4$/, ".srt"), srt(plan));
  return { cues: cues.length, heartbeat: hb && hb.to > hb.from + 1 ? { from: +hb.from.toFixed(1), to: +hb.to.toFixed(1) } : null, drop: { from: +a.toFixed(2), silent_until: +c.toFixed(2) } };
}
/** loudness + silence report of a finished file */
export function inspectAudio(file) {
  const l = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr || "", num = re => { const m = re.exec(l.slice(l.lastIndexOf("Summary:"))); return m ? +m[1] : null; };
  const sil = [...((spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "silencedetect=n=-45dB:d=0.35", "-f", "null", "-"], { encoding: "utf8" }).stderr || "").matchAll(/silence_start: ([\d.]+)|silence_end: ([\d.]+)/g))].map(m => +(m[1] ?? m[2]));
  return { lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+([\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/), silences: sil };
}
