// Merge tab backend: attach a visual (video), write or attach a narration, generate the voice with Veena or Chatterbox,
// tune word speed / offset so voice and picture line up, preview, and download the merged MP4.
// Mounted by server.mjs: `if (await merge.handle(req, res, p, ctx)) return;`  Files live in merge/<id>/ (git-ignored).
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { spawn, spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), P = (...x) => path.join(root, ...x), MERGE = P("merge");
fs.mkdirSync(MERGE, { recursive: true });
const PY = path.join(os.homedir(), ".pyenv/versions/3.12.0/bin/python"), TTS_REPO = path.join(root, "vendor/tts-repo");
const J = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } }, W = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
const okId = id => /^[a-z0-9][a-z0-9-]{0,40}$/.test(id || ""), dir = id => { if (!okId(id)) throw new Error("bad project id"); return path.join(MERGE, id); };
const FILES = { visual: "visual.mp4", voice: "voice.wav", upload: "voice-upload.wav", out: "out.mp4" };
const probe = f => { if (!fs.existsSync(f)) return null; const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,pix_fmt", "-of", "json", f], { encoding: "utf8" }); try { const j = JSON.parse(r.stdout), v = (j.streams || []).find(s => s.codec_type === "video"), a = (j.streams || []).find(s => s.codec_type === "audio"); return { duration: +(+j.format.duration).toFixed(2), video: v ? { codec: v.codec_name, w: v.width, h: v.height, pix: v.pix_fmt } : null, audio: !!a }; } catch { return null; } };
const run = (cmd, args, opt = {}) => new Promise((ok, no) => { const c = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opt }); let err = ""; c.stderr.on("data", d => { err += d; if (err.length > 8000) err = err.slice(-8000); }); c.on("close", code => code === 0 ? ok() : no(new Error(err.split("\n").filter(Boolean).slice(-3).join(" | ") || cmd + " exited " + code))); });

// ---------- voice job (one at a time) ----------
const JOBS = {}; let busy = null;
function lineBeats(script) {
  const beats = []; let n = 0;
  for (const raw of String(script).split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue; n++; const id = "v" + String(n).padStart(3, "0");
    const pz = /^\[pause\s+([0-9.]+)\s*\]$/i.exec(line); if (pz) { beats.push({ id, text: "", silent: Math.min(5, Math.max(0.1, +pz[1])) }); continue; }
    const m = /^\[([a-z]+)\]\s*(.+)$/i.exec(line); const b = { id, text: (m ? m[2] : line).trim() }; if (m) b.intent = m[1].toLowerCase(); beats.push(b);
  }
  return beats;
}
function startVoice(id, o) {
  if (busy) throw new Error("another voice job is running: " + busy); const d = dir(id), story = "merge-" + id, sd = P("stories", story);
  const beats = lineBeats(o.script); if (!beats.some(b => b.text)) throw new Error("write the narration script first"); fs.mkdirSync(sd, { recursive: true });
  fs.writeFileSync(path.join(sd, "beats.json"), JSON.stringify(beats, null, 1)); W(path.join(sd, "story.json"), { name: story, title: "merge " + id }); fs.writeFileSync(path.join(d, "script.txt"), o.script);
  const args = ["-W", "ignore", "-u", P("audio/synth.py"), story]; const ts = Math.min(1.1, Math.max(0.9, +o.tempoScale || 1)); args.push("--tempo-scale", String(ts)); if (o.align === false) args.push("--no-align");
  if (o.engine === "veena") { const sp = ["kavya", "agastya", "maitri", "vinaya"].includes(o.speaker) ? o.speaker : "maitri"; args.push("--engine", "veena", "--speaker", sp); }
  else { args.push("--engine", "chatterbox"); if (o.reference) { const rp = P("audio/reference-voices", path.basename(o.reference)); if (!fs.existsSync(rp)) throw new Error("unknown reference voice"); args.push("--reference", rp); } }
  const job = { id, status: "running", log: [], started: Date.now() }; JOBS[id] = job; busy = id;
  const c = spawn(PY, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONPATH: path.join(TTS_REPO, ".vendor_py") + ":" + P("audio"), CHATTERBOX_MODEL_VARIANT: "dedicated_hindi" } });
  const on = x => { for (const l of x.toString().replace(/\r/g, "\n").split("\n")) if (l.trim() && /^\[voice\]|Error|Traceback/.test(l) && !/Sampling/.test(l)) { job.log.push(l.slice(0, 200)); if (job.log.length > 120) job.log.shift(); } };
  c.stdout.on("data", on); c.stderr.on("data", on);
  c.on("close", code => { const v = path.join(sd, "narration/voice"); if (code === 0 && fs.existsSync(path.join(v, "narration.wav"))) { fs.copyFileSync(path.join(v, "narration.wav"), path.join(d, FILES.voice)); const sg = J(path.join(v, "segments.json")); if (sg) W(path.join(d, "segments.json"), sg); job.status = "done"; } else { job.status = "failed"; job.error = "voice synthesis exited " + code; } job.ended = Date.now(); busy = null; });
  return job;
}

// ---------- mixing ----------
async function mix(id, o) {
  const d = dir(id), vis = path.join(d, FILES.visual), vp = probe(vis); if (!vp) throw new Error("attach the visual first");
  const src = o.source === "uploaded" ? path.join(d, FILES.upload) : path.join(d, FILES.voice), ap = probe(src); if (!ap) throw new Error(o.source === "uploaded" ? "attach your narration audio first" : "generate the voice first");
  let speed = +o.speed || 1; if (o.fit === "voice-to-video") speed = ap.duration / Math.max(0.5, vp.duration - Math.max(0, +o.offset || 0) - 0.05);
  speed = Math.min(1.6, Math.max(0.6, speed)); const off = Math.min(10, Math.max(-5, +o.offset || 0)), vol = Math.min(3, Math.max(0, o.voiceVol == null ? 1 : +o.voiceVol)), keep = Math.min(1, Math.max(0, +o.keepOriginal || 0));
  const vdur = ap.duration / speed + Math.max(0, off), total = Math.max(vp.duration, vdur), extend = vdur > vp.duration + 0.05 && o.extend !== false;
  const chain = `atempo=${speed.toFixed(4)}` + (off > 0 ? `,adelay=${Math.round(off * 1000)}:all=1` : "") + (off < 0 ? `,atrim=start=${(-off * speed).toFixed(3)},asetpts=PTS-STARTPTS` : "") + `,volume=${vol}`;
  let fc = `[1:a]${chain}[v]`, map = "[v]";
  if (keep > 0 && vp.audio) { fc += `;[0:a]volume=${keep}[o];[o][v]amix=inputs=2:duration=longest:normalize=0[a]`; map = "[a]"; }
  const out = path.join(d, FILES.out), args = ["-y", "-loglevel", "error", "-i", vis, "-i", src];
  if (extend) { fc = `[0:v]tpad=stop_mode=clone:stop_duration=${(vdur - vp.duration + 0.1).toFixed(2)}[vv];` + fc; args.push("-filter_complex", fc, "-map", "[vv]", "-map", map, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p"); }
  else args.push("-filter_complex", fc, "-map", "0:v", "-map", map, "-c:v", "copy");
  args.push("-c:a", "aac", "-b:a", "192k", "-t", String(total.toFixed(2)), "-movflags", "+faststart", out); await run("ffmpeg", args);
  const s = { source: o.source || "generated", speed: +speed.toFixed(3), offset: off, voiceVol: vol, keepOriginal: keep, fit: o.fit || "none", extend: !!extend }; W(path.join(d, "mix.json"), s);
  return { ...s, duration: probe(out)?.duration, voice_seconds: +vdur.toFixed(2), video_seconds: vp.duration };
}

// ---------- routes ----------
export async function handle(req, res, p, ctx) {
  const { send, serveFile } = ctx; if (!p.startsWith("/api/merge/") && !p.startsWith("/merge/file/")) return false;
  const url = new URL(req.url, "http://x"), body = async () => JSON.parse((await ctx.readBody(req, 5e6)).toString() || "{}");
  try {
    let m;
    if ((m = p.match(/^\/merge\/file\/([a-z0-9-]+)\/(visual|voice|upload|out)$/)) && req.method === "GET") { const f = path.join(dir(m[1]), FILES[m[2]]); serveFile(req, res, f); return true; }
    if (req.method === "GET" && p === "/api/merge/list") { send(res, 200, { projects: fs.readdirSync(MERGE).filter(x => okId(x) && fs.statSync(path.join(MERGE, x)).isDirectory()).map(id => ({ id, name: (J(path.join(MERGE, id, "meta.json")) || {}).name || id, updated: fs.statSync(path.join(MERGE, id)).mtimeMs })).sort((a, b) => b.updated - a.updated) }); return true; }
    if (req.method === "GET" && p === "/api/merge/voices") { const rd = P("audio/reference-voices"); send(res, 200, { speakers: ["maitri", "kavya", "agastya", "vinaya"], references: fs.existsSync(rd) ? fs.readdirSync(rd).filter(f => /\.(wav|mp3|m4a|flac)$/i.test(f)) : [] }); return true; }
    if (req.method === "POST" && p === "/api/merge/new") { const b = await body(), name = String(b.name || "untitled").slice(0, 60), id = (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "clip") + "-" + Date.now().toString(36).slice(-4); fs.mkdirSync(dir(id), { recursive: true }); W(path.join(dir(id), "meta.json"), { name }); send(res, 200, { id, name }); return true; }
    if (req.method === "GET" && p === "/api/merge/state") {
      const id = url.searchParams.get("id"), d = dir(id); if (!fs.existsSync(d)) { send(res, 404, { error: "no such project" }); return true; }
      const f = k => { const pr = probe(path.join(d, FILES[k])); return pr ? { ...pr, url: `/merge/file/${id}/${k}?v=${fs.statSync(path.join(d, FILES[k])).mtimeMs | 0}` } : null; };
      send(res, 200, { id, meta: J(path.join(d, "meta.json"), {}), script: fs.existsSync(path.join(d, "script.txt")) ? fs.readFileSync(path.join(d, "script.txt"), "utf8") : "", visual: f("visual"), voice: f("voice"), upload: f("upload"), out: f("out"), segments: J(path.join(d, "segments.json")), mix: J(path.join(d, "mix.json")), job: JOBS[id] || null, busy }); return true; }
    if (req.method === "POST" && p === "/api/merge/upload") {   // raw body stream: ?id=&kind=visual|audio&name=
      const id = url.searchParams.get("id"), kind = url.searchParams.get("kind"), d = dir(id); if (!fs.existsSync(d)) { send(res, 404, { error: "no such project" }); return true; } if (!["visual", "audio"].includes(kind)) { send(res, 400, { error: "kind must be visual or audio" }); return true; }
      const ext = (path.extname(url.searchParams.get("name") || "") || ".bin").toLowerCase().replace(/[^.a-z0-9]/g, ""), raw = path.join(d, (kind === "visual" ? "visual-src" : "upload-src") + ext);
      await new Promise((ok, no) => { const w = fs.createWriteStream(raw); req.pipe(w); w.on("finish", ok); w.on("error", no); req.on("error", no); });
      if (kind === "visual") { const pr = probe(raw); if (!pr || !pr.video) { send(res, 400, { error: "that file has no video stream" }); return true; } const copyOk = pr.video.codec === "h264" && pr.video.pix === "yuv420p"; await run("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, ...(copyOk ? ["-c", "copy"] : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k"]), "-movflags", "+faststart", path.join(d, FILES.visual)]); try { fs.unlinkSync(path.join(d, FILES.out)); } catch {} }
      else { if (!probe(raw)?.audio) { send(res, 400, { error: "that file has no audio stream" }); return true; } await run("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-vn", "-ac", "1", "-ar", "44100", path.join(d, FILES.upload)]); }
      send(res, 200, { ok: true }); return true; }
    if (req.method === "POST" && p === "/api/merge/voice") { const b = await body(); startVoice(b.id, b); send(res, 200, { started: true }); return true; }
    if (req.method === "POST" && p === "/api/merge/script") { const b = await body(); fs.writeFileSync(path.join(dir(b.id), "script.txt"), String(b.script || "")); send(res, 200, { ok: true }); return true; }
    if (req.method === "POST" && p === "/api/merge/mix") { const b = await body(); send(res, 200, await mix(b.id, b)); return true; }
    if (req.method === "POST" && p === "/api/merge/delete") { const b = await body(); if (JOBS[b.id]?.status === "running") throw new Error("a voice job is running for this project"); fs.rmSync(dir(b.id), { recursive: true, force: true }); fs.rmSync(P("stories", "merge-" + b.id), { recursive: true, force: true }); send(res, 200, { ok: true }); return true; }
    send(res, 404, { error: "unknown merge route" }); return true;
  } catch (e) { send(res, 400, { error: e.message }); return true; }
}
