#!/usr/bin/env node
// Creator Studio: paste a script + an HTML scene, click buttons, get a finished film.
// Local only (127.0.0.1). One heavy job at a time (24 GB friendly). No dependencies.
// usage: node studio-ui/server.mjs [--port 4180]
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { spawn, spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, ".."), dc = path.join(root, "engine/dot-cinema");
const cfg = { ttsRepo: path.join(process.env.HOME, "infographics animations"), port: 4180, lead: 0.9, ...(fs.existsSync(path.join(here, "config.json")) ? JSON.parse(fs.readFileSync(path.join(here, "config.json"), "utf8")) : {}) };
if (process.argv.includes("--port")) cfg.port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const PROJ = path.join(root, "projects"); fs.mkdirSync(PROJ, { recursive: true });
const pdir = id => { if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(id)) throw new Error("bad project id"); return path.join(PROJ, id); };
const rj = f => JSON.parse(fs.readFileSync(f, "utf8")), wj = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = (req, max = 40e6) => new Promise((ok, no) => { const c = []; let n = 0; req.on("data", d => { n += d.length; if (n > max) { no(new Error("body too large")); req.destroy(); } else c.push(d); }); req.on("end", () => ok(Buffer.concat(c))); });
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "film";

// ---------- jobs: one at a time, log lines streamed over SSE ----------
let job = null;
function startJob(kind, id, cmd, args, opts = {}) {
  if (job && job.status === "running") throw new Error("another job is running (" + job.kind + " on " + job.id + "); wait or cancel it");
  job = { kind, id, status: "running", lines: [], started: Date.now(), child: null, listeners: new Set() };
  const push = l => { job.lines.push(l); for (const r of job.listeners) r.write("data: " + JSON.stringify({ line: l }) + "\n\n"); };
  push("$ " + kind + " started");
  const child = spawn(cmd, args, { cwd: opts.cwd || root, env: { ...process.env, ...(opts.env || {}) } }); job.child = child; let buf = "";
  const onData = d => { buf += d.toString().replace(/\r/g, "\n"); const parts = buf.split("\n"); buf = parts.pop(); parts.filter(Boolean).forEach(push); };
  child.stdout.on("data", onData); child.stderr.on("data", onData);
  child.on("close", code => { if (buf.trim()) push(buf.trim()); job.status = job.cancelled ? "cancelled" : code === 0 ? "done" : "failed"; job.code = code; push("@@job " + job.status + " " + code); for (const r of job.listeners) { r.write("data: " + JSON.stringify({ end: job.status }) + "\n\n"); } if (opts.after) try { opts.after(code); } catch (e) { push("after-hook error: " + e.message); } });
  return job;
}

// ---------- helpers ----------
function beatsFromScript(text) { return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.replace(/^\[[A-Z]+\]\s*/, "").replace(/\[PAUSE\]/g, "…").replace(/\[END\]/g, "").trim()).filter(Boolean).map((t, i) => ({ id: "n" + String(i + 1).padStart(2, "0"), text: t })); }
function projectInfo(id) {
  const d = pdir(id), s = rj(path.join(d, "story.json")), segF = path.join(d, "narration/raw.wav.segments.json"), out = path.join(d, "output");
  const info = { id, story: s, script: fs.existsSync(path.join(d, "script.txt")) ? fs.readFileSync(path.join(d, "script.txt"), "utf8") : "", sceneBytes: fs.existsSync(path.join(d, "scene.html")) ? fs.statSync(path.join(d, "scene.html")).size : 0, narration: null, outputs: {}, qa: null, validate: null, mix: null };
  if (fs.existsSync(segF)) { const g = rj(segF); info.narration = { duration: g.duration_seconds, estimated: !!g.estimated, beats: g.segments.map(b => ({ id: b.beat_id, text: b.text, start: b.start_seconds, end: b.end_seconds })), audio: fs.existsSync(path.join(d, "narration/raw.wav")) }; }
  for (const k of ["share", "master"]) { const f = path.join(out, s.name + (k === "share" ? "-share.mp4" : ".mp4")); if (fs.existsSync(f)) info.outputs[k] = { url: "/files/" + id + "/output/" + path.basename(f), bytes: fs.statSync(f).size, mtime: fs.statSync(f).mtimeMs }; }
  for (const [k, f] of [["qa", "qa.json"], ["validate", "validate.json"], ["mix", "mix-report.json"], ["visualQa", "visual-qa.json"]]) if (fs.existsSync(path.join(out, f))) info[k] = rj(path.join(out, f)); return info;
}
function fillPrompt(id) {
  const info = projectInfo(id), n = info.narration, lead = info.story.lead ?? cfg.lead, dur = n ? +(n.duration + lead + 1.9).toFixed(2) : 36;
  let tl = "(narration not generated yet — generate it first so the visuals can be timed to the real voice; until then assume ~3 s per beat)";
  if (n) { const d = fs.existsSync(path.join(pdir(id), "narration/raw.wav.segments.json")) ? rj(path.join(pdir(id), "narration/raw.wav.segments.json")) : null; tl = d.segments.map(b => `- ${b.beat_id}  ${b.start_seconds.toFixed(2)}–${b.end_seconds.toFixed(2)} s: "${b.text}"\n    words: ` + b.words.map(w => w.word + "@" + w.start.toFixed(2)).join("  ")).join("\n"); }
  const tpl = fs.readFileSync(path.join(root, "docs/SCENE_PROMPT.md"), "utf8");
  return tpl.replace(/{{DURATION}}/g, String(dur)).replace(/{{LEAD}}/g, String(lead)).replace("{{TIMELINE}}", tl).replace("{{SCRIPT}}", info.script || "(paste your script in step 1)");
}
function estimateSegments(id) {
  const d = pdir(id), beats = beatsFromScript(fs.readFileSync(path.join(d, "script.txt"), "utf8")), wav = path.join(d, "narration/raw.wav");
  const dur = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", wav], { encoding: "utf8" }).stdout); if (!(dur > 0)) throw new Error("could not read the WAV duration");
  const total = beats.reduce((a, b) => a + b.text.length, 0), pause = 0.35, speech = dur - 0.3 - pause * (beats.length - 1); let t = 0.15; const segs = [];
  for (const b of beats) { const bd = speech * b.text.length / total, ws = b.text.split(/\s+/).filter(Boolean), tl = ws.reduce((a, w) => a + w.length + 1, 0); let wt = t; const words = ws.map(w => { const wd = bd * (w.length + 1) / tl; const o = { word: w, start: +wt.toFixed(3), end: +(wt + wd * 0.92).toFixed(3) }; wt += wd; return o; }); segs.push({ beat_id: b.id, text: b.text, start_seconds: +t.toFixed(3), end_seconds: +(t + bd).toFixed(3), words }); t += bd + pause; }
  wj(path.join(d, "narration/raw.wav.segments.json"), { segments: segs, duration_seconds: +dur.toFixed(3), estimated: true });
}
function previewHtml(id, q) {
  const d = pdir(id), s = rj(path.join(d, "story.json")); let html = fs.readFileSync(path.join(d, "scene.html"), "utf8"), cfgObj = { compat: true, fit: true, captions: null };
  const segF = path.join(d, "narration/raw.wav.segments.json");
  if (q.get("captions") === "1" && fs.existsSync(segF) && !s.captionsInScene) { const g = rj(segF), vj = fs.existsSync(path.join(d, "output/validate.json")) ? rj(path.join(d, "output/validate.json")) : null, sceneDur = g.duration_seconds + (s.lead ?? cfg.lead) + 1.9; cfgObj.captions = { segments: g.segments, lead: s.lead ?? cfg.lead, dim: 0.6, timeScale: ((vj && vj.stats.duration) || sceneDur) / sceneDur }; }
  const bridge = `<script>window.__STUDIO=${JSON.stringify(cfgObj)};</script><script src="/shim.js"></script><script>addEventListener("message",e=>{const m=e.data;if(!m||!m.__studio)return;try{if(m.__studio==="render"){window.renderAt(m.t);parent.postMessage({__studio:"rendered",t:m.t},"*")}}catch(err){parent.postMessage({__studio:"error",message:String(err&&err.message||err)},"*")}});addEventListener("load",()=>{try{parent.postMessage({__studio:"ready",duration:window.getDuration(),hasRender:typeof window.renderAt==="function"},"*")}catch(e){parent.postMessage({__studio:"error",message:"getDuration/renderAt missing"},"*")}});</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + bridge) : bridge + html;
}
const MIME = { ".mp4": "video/mp4", ".wav": "audio/wav", ".json": "application/json", ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".log": "text/plain" };
function serveFile(req, res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: "not found" });
  const st = fs.statSync(file), type = MIME[path.extname(file)] || "application/octet-stream", range = req.headers.range;
  if (range) { const m = /bytes=(\d*)-(\d*)/.exec(range), a = m[1] ? Number(m[1]) : 0, b = m[2] ? Number(m[2]) : st.size - 1; res.writeHead(206, { "content-type": type, "content-range": `bytes ${a}-${b}/${st.size}`, "accept-ranges": "bytes", "content-length": b - a + 1 }); fs.createReadStream(file, { start: a, end: b }).pipe(res); }
  else { res.writeHead(200, { "content-type": type, "content-length": st.size, "accept-ranges": "bytes" }); fs.createReadStream(file).pipe(res); }
}


// ---------- dashboard helpers ----------
import * as yt from "./yt.mjs"; import * as meta from "./meta.mjs";
const storyDir = id => { if (!/^[a-z0-9-]+$/.test(id || "")) throw new Error("bad story id"); const d = path.join(root, "stories", id); if (!fs.existsSync(d)) throw new Error("no such story"); return d; };
const tryJ = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
function stageState(item) {
  const d = item.story ? path.join(root, "stories", item.story) : null, ex = f => !!d && fs.existsSync(path.join(d, f)), st = d ? tryJ(path.join(d, "story.json")) : null;
  const stages = [["topic", true], ["research", ex("claims.json")], ["story", ex("beats.json")], ["voice", !!st && !!st.audio && ex(st.audio)], ["visuals", ex("scene.js")], ["render", !!st && ex("output/" + st.name + ".mp4")], ["publish pack", ex("publish.json") && ex("output/thumb-9x16.png")], ["uploaded", ex("upload.json")]];
  const next = stages.find(x => !x[1]); const strict = !!st && !!st.requireGates;
  return { stages: stages.map(([n, ok]) => ({ n, ok })), status: next ? (next[0] === "uploaded" ? "ready to upload" : "next: " + next[0]) : "uploaded", strictGates: strict, upload: ex("upload.json") ? tryJ(path.join(d, "upload.json")) : null };
}
import crypto from "node:crypto";
const pubHash = d => { const f = path.join(d, "publish.json"); return fs.existsSync(f) ? crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 16) : ""; };
function dashData() {
  const D = path.join(root, "planner/data"), plan = tryJ(path.join(D, "week-plan.json")) || { items: [] }, nt = tryJ(path.join(D, "next-topics.json")) || { rows: [] };
  const rowFor = t => nt.rows.find(r => r.topic === t) || null;
  const items = plan.items.map(i => ({ ...i, ...stageState(i), data: rowFor(i.topic) }));
  const searches = fs.existsSync(D) ? fs.readdirSync(D).filter(f => /^outliers-.*\.json$/.test(f)).sort().map(f => { const j = tryJ(path.join(D, f)); return { file: f, label: j.label, channel: j.channel, date: j.date, days: j.days, lang: j.lang, queries: j.queries, quotaUnits: j.quotaUnits, videos: j.videos.length, topOutliers: j.videos.filter(v => v.outlierRatio !== null && v.ageDays >= 3 && v.views >= 50000).sort((a, b) => b.viewsPerSub - a.viewsPerSub).slice(0, 5).map(v => ({ title: v.title, channel: v.channel, views: v.views, subs: v.subs, url: v.url, format: v.durationS <= 180 ? "short" : "long" })) }; }) : [];
  const stories = fs.readdirSync(path.join(root, "stories")).filter(x => fs.existsSync(path.join(root, "stories", x, "story.json"))).map(x => { const pf = tryJ(path.join(root, "stories", x, "publish.json")); const sd = path.join(root, "stories", x), rv = tryJ(path.join(sd, "publish.review.json")), gj = tryJ(path.join(sd, "gates.json")); return { id: x, hasPublish: !!pf, publish: pf, upload: tryJ(path.join(sd, "upload.json")), social: tryJ(path.join(sd, "social.json")), seed: tryJ(path.join(sd, "publish.seed.json")), review: rv ? { ...rv, valid: rv.hash === pubHash(sd) } : null, publishSkills: (gj && gj.skills_read && gj.skills_read.publish) || [], videoFile: pf && pf.video, hasThumbCheck: fs.existsSync(path.join(sd, "output/thumb-check.json")), thumbCheck: tryJ(path.join(sd, "output/thumb-check.json")) }; });
  const yj = tryJ(path.join(root, "channels/kathaaya/youtube.json"));
  return { week: plan.week, basis: plan.basis, items, nextTopics: nt, searches, stories, calendar: tryJ(path.join(D, "calendar-2026.json")), kathaayaCandidates: yj && yj.candidates, channelId: yj && yj.channelId, brand: yj && yj.brand, handle: yj && yj.handle, keysPresent: { read: /YOUTUBE_API_KEY=/.test(fs.existsSync(path.join(root, ".env.local")) ? fs.readFileSync(path.join(root, ".env.local"), "utf8") : "") } };
}
// ---------- routes ----------
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x"), p = u.pathname; let m;
    if (req.method === "GET" && p === "/") return send(res, 200, fs.readFileSync(path.join(here, "index.html")), "text/html; charset=utf-8");
    if (req.method === "GET" && p === "/voice") return send(res, 200, fs.readFileSync(path.join(here, "voice.html")), "text/html; charset=utf-8");
    if (req.method === "GET" && p === "/api/voice/stories") { const sd = path.join(root, "stories"); return send(res, 200, fs.readdirSync(sd).filter(x => fs.existsSync(path.join(sd, x, "beats.json"))).map(x => { const n = path.join(sd, x, "narration"), v = path.join(n, "voice"); const st = fs.existsSync(path.join(sd, x, "story.json")) ? rj(path.join(sd, x, "story.json")) : {};
      return { id: x, original: fs.existsSync(path.join(n, "raw.wav")), hasVoice: fs.existsSync(path.join(v, "narration.wav")), active: st.audio || null, meta: fs.existsSync(path.join(v, "meta.json")) ? rj(path.join(v, "meta.json")) : null, analysis: fs.existsSync(path.join(v, "analysis.json")) ? rj(path.join(v, "analysis.json")) : null }; })); }
    if ((m = p.match(/^\/voice\/file\/([a-z0-9-]+)\/(.+)$/)) && req.method === "GET") { const base = path.join(root, "stories", m[1], "narration"), f = path.resolve(base, m[2]); if (!f.startsWith(base + path.sep)) return send(res, 403, { error: "forbidden" }); return serveFile(req, res, f); }
    if (req.method === "POST" && p === "/api/voice/synth") { const b = JSON.parse((await readBody(req)).toString()); if (!/^[a-z0-9-]+$/.test(b.story || "")) return send(res, 400, { error: "bad story" }); const ts = Number(b.tempoScale || 1); if (!(ts >= 0.9 && ts <= 1.1)) return send(res, 400, { error: "tempoScale must be 0.9-1.1" });
      const py = path.join(process.env.HOME, ".pyenv/versions/3.12.0/bin/python"); startJob("voice", b.story, py, ["-W", "ignore", path.join(root, "audio/synth.py"), b.story, "--tempo-scale", String(ts)], { env: { PYTHONPATH: path.join(cfg.ttsRepo, ".vendor_py") + ":" + path.join(root, "audio"), CHATTERBOX_MODEL_VARIANT: "dedicated_hindi" } }); return send(res, 200, { started: true }); }
    // ---------- dashboard / publish / YouTube ----------
    if (req.method === "GET" && p === "/dash") return send(res, 200, fs.readFileSync(path.join(here, "dash.html")), "text/html; charset=utf-8");
    if (req.method === "GET" && p === "/api/dash") return send(res, 200, dashData());
    if (req.method === "POST" && p === "/api/dash/next-topics") { const r = spawnSync("node", [path.join(root, "planner/next-topics.mjs")], { encoding: "utf8" }); return send(res, r.status === 0 ? 200 : 500, r.status === 0 ? dashData() : { error: r.stderr }); }
    if (req.method === "POST" && p === "/api/dash/research") { const b = JSON.parse((await readBody(req)).toString()); if (!b.confirm) return send(res, 400, { error: "confirm required: each query costs 100 YouTube API quota units (daily limit 10,000)" });
      const qs = (b.queries || []).map(q => String(q).replace(/[|]/g, " ").trim()).filter(Boolean).slice(0, 12); if (!qs.length || !/^[a-z0-9-]+$/.test(b.label || "") || !["kathaaya", "agentic-ai"].includes(b.channel)) return send(res, 400, { error: "need channel, label (a-z0-9-) and queries" });
      startJob("research", b.label, "node", [path.join(root, "planner/yt-outliers.mjs"), "--channel", b.channel, "--label", b.label, "--days", String(Math.min(365, Number(b.days) || 120)), "--per", "25", "--queries", qs.join("|")]); return send(res, 200, { started: true, estimatedQuota: qs.length * 100 + 40 }); }
    if (req.method === "POST" && p === "/api/dash/seo") { const b = JSON.parse((await readBody(req)).toString()); const d = storyDir(b.story); const r = spawnSync("node", [path.join(root, "planner/seo.mjs"), d], { encoding: "utf8" }); return send(res, r.status === 0 ? 200 : 500, r.status === 0 ? { ok: true, log: r.stdout } : { error: (r.stderr || r.stdout).slice(-400) }); }
    if (req.method === "POST" && p === "/api/dash/thumbnail") { const b = JSON.parse((await readBody(req)).toString()); const d = storyDir(b.story), a = [path.join(root, "tools/thumbnail.mjs"), d]; if (b.t) a.push("--t", String(Number(b.t))); if (b.line1 || b.line2) { const sf = path.join(d, "publish.seed.json"), sd2 = rj(sf); sd2.thumbnail = { ...(sd2.thumbnail || {}), t: Number(b.t) || (sd2.thumbnail || {}).t, line1: String(b.line1 || ""), line2: String(b.line2 || ""), note: String(b.note || ""), image: /^[0-9]{2}$/.test(b.image || "") ? b.image : undefined }; wj(sf, sd2); } const r = spawnSync("node", a, { encoding: "utf8" }); return send(res, r.status === 0 ? 200 : 500, r.status === 0 ? { ok: true } : { error: (r.stderr || r.stdout).slice(-300) }); }
    if (req.method === "POST" && p === "/api/dash/title") { const b = JSON.parse((await readBody(req)).toString()); const d = storyDir(b.story), f = path.join(d, "publish.seed.json"), sd = rj(f); if (!Number.isInteger(b.index) || !sd.titles[b.index]) return send(res, 400, { error: "bad index" }); sd.chosenTitle = b.index; wj(f, sd); const r = spawnSync("node", [path.join(root, "planner/seo.mjs"), d], { encoding: "utf8" }); return send(res, 200, { ok: r.status === 0 }); }
    if (req.method === "POST" && p === "/api/dash/review") { const b = JSON.parse((await readBody(req)).toString()); const d = storyDir(b.story), pf = path.join(d, "publish.json"); if (!fs.existsSync(pf)) return send(res, 400, { error: "no publish package" }); const pub = rj(pf), n = (pub.reviewItems || []).length;
      const ticks = (b.ticks || []).slice(0, n).map(Boolean); while (ticks.length < n) ticks.push(false); const approved = !!b.approved && ticks.every(Boolean); if (b.approved && !approved) return send(res, 400, { error: "tick every checklist item before approving" });
      wj(path.join(d, "publish.review.json"), { ticks, approved, hash: pubHash(d), at: new Date().toISOString() }); return send(res, 200, { ok: true, approved }); }
    if ((m = p.match(/^\/dash\/file\/([a-z0-9-]+)\/(.+)$/)) && req.method === "GET") { const base = path.join(root, "stories", m[1], "output"), f = path.resolve(base, m[2]); if (!f.startsWith(base + path.sep) || !/\.(png|jpg|mp4)$/.test(f)) return send(res, 403, { error: "forbidden" }); return serveFile(req, res, f); }
    if (req.method === "GET" && p === "/api/yt/status") { let ch = null, err = null; if (yt.connected()) { try { ch = await yt.me(); } catch (e) { err = e.message; } } return send(res, 200, { oauthConfigured: yt.configured(), connected: yt.connected(), channels: ch, error: err, redirect: "http://127.0.0.1:" + cfg.port + "/oauth2callback" }); }
    if (req.method === "POST" && p === "/api/yt/connect") { try { return send(res, 200, { url: yt.authUrl("http://127.0.0.1:" + cfg.port + "/oauth2callback") }); } catch (e) { return send(res, 400, { error: e.message }); } }
    if (req.method === "GET" && p === "/oauth2callback") { try { if (u.searchParams.get("error")) throw new Error(u.searchParams.get("error")); await yt.exchange(u.searchParams.get("code"), u.searchParams.get("state")); return send(res, 200, "<meta charset=utf-8><body style='font:16px system-ui;padding:24px'>Connected to YouTube. You can close this tab and return to the dashboard.</body>", "text/html; charset=utf-8"); } catch (e) { return send(res, 400, "<meta charset=utf-8><body style='font:16px system-ui;padding:24px'>OAuth failed: " + String(e.message).replace(/[<>&]/g, "") + "</body>", "text/html; charset=utf-8"); } }
    if (req.method === "POST" && p === "/api/yt/disconnect") { yt.disconnect(); return send(res, 200, { ok: true }); }
    if (req.method === "POST" && p === "/api/dash/social") { const b = JSON.parse((await readBody(req)).toString()), d = storyDir(b.story), r = spawnSync("node", [path.join(root, "planner/social.mjs"), d], { encoding: "utf8" }); if (r.status !== 0) return send(res, 500, { error: (r.stderr || r.stdout).slice(0, 300) }); return send(res, 200, { ok: true }); }
    if (req.method === "GET" && p === "/api/social/status") return send(res, 200, meta.status());
    if (req.method === "POST" && p === "/api/social/upload") { const b = JSON.parse((await readBody(req)).toString()), d = storyDir(b.story), sj = tryJ(path.join(d, "social.json")), pf = tryJ(path.join(d, "publish.json")); if (!sj || !pf) return send(res, 400, { error: "build the social package (and the SEO package) first" });
      const which = (b.platforms || []).filter(x => ["facebook", "instagram"].includes(x)); if (!which.length) return send(res, 400, { error: "pick a platform" }); const video = path.join(d, pf.video || ""); const pl = meta.plan({ ...sj, video: pf.video }, d, which); const st = meta.status();
      if (b.dryRun || !which.every(x => st[x])) return send(res, 200, { dryRun: true, connected: st, plan: pl, note: st.missing.length ? "Not connected: missing " + st.missing.join(", ") + " in .env.local. Nothing was sent." : "Dry run: nothing was sent." });
      if (!b.confirm) return send(res, 400, { error: "confirm required" }); const rv = tryJ(path.join(d, "publish.review.json")); if (!rv || !rv.approved || rv.hash !== pubHash(d)) return send(res, 400, { error: "approve the package in the dashboard first" });
      const out = {}; try { if (which.includes("facebook")) out.facebook = await meta.uploadFacebook(sj.facebook, video); if (which.includes("instagram")) out.instagram = await meta.uploadInstagram(sj.instagram, video); } catch (e) { return send(res, 502, { error: e.message, partial: out }); } wj(path.join(d, "social-upload.json"), { ...out, at: new Date().toISOString() }); return send(res, 200, { ok: true, result: out }); }
    if (req.method === "POST" && p === "/api/yt/upload") { const b = JSON.parse((await readBody(req)).toString()); const d = storyDir(b.story), pf = path.join(d, "publish.json"); if (!fs.existsSync(pf)) return send(res, 400, { error: "generate the SEO package first" }); const pub = rj(pf);
      const bad = pub.checks.filter(c => !c.ok && !/claims verified/.test(c.name)); if (bad.length) return send(res, 400, { error: "blocking checks failed: " + bad.map(c => c.name).join("; ") });
      const PUB_SKILLS = ["titles-and-thumbnails", "youtube-packaging", "youtube-seo-description", "youtube-thumbnail-design"], gj = tryJ(path.join(d, "gates.json")), rec = (gj && gj.skills_read && gj.skills_read.publish) || [], missSk = PUB_SKILLS.filter(x => !rec.includes(x)); if (missSk.length) return send(res, 400, { error: "publish skills not recorded as read in gates.json: " + missSk.join(", ") });
      const rv = tryJ(path.join(d, "publish.review.json")); if (!b.dryRun && (!rv || !rv.approved || rv.hash !== pubHash(d))) return send(res, 400, { error: "approve the package in the dashboard first (the approval is void if the package changed)" });
      const warn = pub.checks.filter(c => !c.ok); if (warn.length && !b.ackClaims) return send(res, 400, { error: "you must tick: I have checked the claims warnings (" + warn.map(c => c.detail).join("; ") + ")" });
      let pl; try { pl = yt.plan(pub, d, { privacy: b.privacy || "private" }); } catch (e) { return send(res, 400, { error: e.message }); }
      if (b.dryRun) return send(res, 200, { dryRun: true, bytes: pl.bytes, quotaUnits: pl.quotaUnits, endpoints: pl.endpoints, body: pl.body });
      if (!yt.connected()) return send(res, 400, { error: "connect YouTube first (OAuth)" }); if (!b.confirm) return send(res, 400, { error: "confirm required" });
      startJob("upload", b.story, "node", ["-e", `import("${path.join(here, "yt.mjs")}").then(async m=>{const fs=await import("node:fs");const pub=JSON.parse(fs.readFileSync(${JSON.stringify(pf)},"utf8"));const r=await m.upload(pub,${JSON.stringify(d)},{privacy:${JSON.stringify(b.privacy || "private")},log:l=>console.log(l)});fs.writeFileSync(${JSON.stringify(path.join(d, "upload.json"))},JSON.stringify(r,null,1));console.log("DONE "+r.url+" ("+r.privacy+")")}).catch(e=>{console.error("UPLOAD FAILED: "+e.message);process.exit(1)})`]); return send(res, 200, { started: true }); }
    if (req.method === "GET" && p === "/shim.js") return send(res, 200, fs.readFileSync(path.join(dc, "studio-shim.js")), "text/javascript");
    if (req.method === "GET" && p === "/api/health") { const tts = fs.existsSync(path.join(cfg.ttsRepo, "tools/tts_beats.py")), py = fs.existsSync(path.join(cfg.ttsRepo, ".venv/bin/python")); return send(res, 200, { ok: true, ttsRepo: cfg.ttsRepo, chatterbox: tts && py, ffmpeg: spawnSync("ffmpeg", ["-version"]).status === 0, job: job ? { kind: job.kind, id: job.id, status: job.status } : null }); }
    if (req.method === "GET" && p === "/api/projects") return send(res, 200, fs.readdirSync(PROJ).filter(x => fs.existsSync(path.join(PROJ, x, "story.json"))).map(x => ({ id: x, name: rj(path.join(PROJ, x, "story.json")).title || x, mtime: fs.statSync(path.join(PROJ, x, "story.json")).mtimeMs })).sort((a, b) => b.mtime - a.mtime));
    if (req.method === "POST" && p === "/api/projects") { const b = JSON.parse((await readBody(req)).toString() || "{}"), id = slug(b.name || "film") + "-" + Date.now().toString(36).slice(-4), d = pdir(id); fs.mkdirSync(path.join(d, "narration"), { recursive: true }); fs.mkdirSync(path.join(d, "output"), { recursive: true });
      wj(path.join(d, "story.json"), { name: id, title: b.name || id, type: "html", scene: "scene.html", segments: "narration/raw.wav.segments.json", audio: "narration/raw.wav", lead: cfg.lead, fps: 24, sound: true, captionsInScene: false, channel: b.channel || "kathaaya" }); wj(path.join(d, "overrides.json"), {}); return send(res, 200, projectInfo(id)); }
    if ((m = p.match(/^\/api\/projects\/([a-z0-9-]+)$/)) && req.method === "GET") return send(res, 200, projectInfo(m[1]));
    if ((m = p.match(/^\/api\/projects\/([a-z0-9-]+)\/(script|scene|settings)$/)) && req.method === "PUT") { const d = pdir(m[1]), body = JSON.parse((await readBody(req)).toString());
      if (m[2] === "script") { fs.writeFileSync(path.join(d, "script.txt"), body.text); wj(path.join(d, "beats.json"), beatsFromScript(body.text)); }
      if (m[2] === "scene") { fs.writeFileSync(path.join(d, "scene.html"), body.html); for (const f of ["validate.json", "visual-qa.json", "pipeline-state.json"]) fs.rmSync(path.join(d, "output", f), { force: true }); }
      if (m[2] === "settings") { const s = rj(path.join(d, "story.json")); for (const k of ["sound", "captionsInScene", "title", "channel"]) if (body[k] !== undefined) s[k] = body[k]; wj(path.join(d, "story.json"), s); }
      return send(res, 200, projectInfo(m[1])); }
    if ((m = p.match(/^\/api\/projects\/([a-z0-9-]+)\/example$/)) && req.method === "POST") { const d = pdir(m[1]), b = JSON.parse((await readBody(req)).toString()), ex = path.join(root, "stories", slug(b.name));
      for (const f of ["build/index.html", "narration/raw.wav", "narration/raw.wav.segments.json", "beats.json"]) if (!fs.existsSync(path.join(ex, f))) return send(res, 400, { error: "example not built yet: missing " + f + " (run: node engine/dot-cinema/pipeline.mjs stories/" + b.name + ")" });
      fs.mkdirSync(path.join(d, "narration"), { recursive: true }); fs.copyFileSync(path.join(ex, "build/index.html"), path.join(d, "scene.html")); fs.copyFileSync(path.join(ex, "narration/raw.wav"), path.join(d, "narration/raw.wav")); fs.copyFileSync(path.join(ex, "narration/raw.wav.segments.json"), path.join(d, "narration/raw.wav.segments.json"));
      const beats = rj(path.join(ex, "beats.json")); fs.writeFileSync(path.join(d, "script.txt"), beats.map(x => x.text).join("\n")); wj(path.join(d, "beats.json"), beats); const s = rj(path.join(d, "story.json")); s.captionsInScene = true; s.sound = true; wj(path.join(d, "story.json"), s);
      for (const f of ["validate.json", "visual-qa.json", "pipeline-state.json"]) fs.rmSync(path.join(d, "output", f), { force: true }); return send(res, 200, projectInfo(m[1])); }
    if ((m = p.match(/^\/api\/projects\/([a-z0-9-]+)\/prompt$/)) && req.method === "GET") return send(res, 200, { prompt: fillPrompt(m[1]) });
    if ((m = p.match(/^\/api\/projects\/([a-z0-9-]+)\/validate$/)) && req.method === "POST") { const d = pdir(m[1]); if (!fs.existsSync(path.join(d, "scene.html"))) return send(res, 400, { error: "paste a scene first" });
      const r = spawnSync("node", [path.join(dc, "validate-scene.mjs"), path.join(d, "scene.html"), "--json", path.join(d, "output/validate.json")], { encoding: "utf8", timeout: 120000 }); return send(res, 200, rj(path.join(d, "output/validate.json"))); }
    if ((m = p.match(/^\/api\/projects\/([a-z0-9-]+)\/narration$/)) && req.method === "POST") { const d = pdir(m[1]), b = JSON.parse((await readBody(req)).toString() || "{}");
      if (!fs.existsSync(path.join(d, "beats.json"))) return send(res, 400, { error: "save a script first" });
      if (b.mode === "estimate") { if (!fs.existsSync(path.join(d, "narration/raw.wav"))) return send(res, 400, { error: "upload a WAV first" }); estimateSegments(m[1]); return send(res, 200, projectInfo(m[1])); }
      const py = path.join(cfg.ttsRepo, ".venv/bin/python"); if (!fs.existsSync(py) || !fs.existsSync(path.join(cfg.ttsRepo, "tools/tts_beats.py"))) return send(res, 400, { error: "Chatterbox not found at " + cfg.ttsRepo + " (set ttsRepo in studio-ui/config.json)" });
      fs.rmSync(path.join(d, "narration/raw.wav"), { force: true }); fs.rmSync(path.join(d, "narration/raw.wav.segments.json"), { force: true });
      startJob("narration", m[1], py, ["-u", "tools/tts_beats.py", path.join(d, "beats.json"), path.join(d, "narration/raw")], { cwd: cfg.ttsRepo, env: { PYTHONPATH: path.join(cfg.ttsRepo, ".vendor_py"), CHATTERBOX_MODEL_VARIANT: "dedicated_hindi", NARRATION_STYLE: b.style || "storytelling", HINDI_PRONUNCIATION: b.pronunciation || "hindi_mixed" } }); return send(res, 200, { started: true }); }
    if ((m = p.match(/^\/api\/projects\/([a-z0-9-]+)\/narration\/upload$/)) && req.method === "POST") { const d = pdir(m[1]); fs.writeFileSync(path.join(d, "narration/raw.wav"), await readBody(req, 120e6)); fs.rmSync(path.join(d, "narration/raw.wav.segments.json"), { force: true }); return send(res, 200, projectInfo(m[1])); }
    if ((m = p.match(/^\/api\/projects\/([a-z0-9-]+)\/render$/)) && req.method === "POST") { const d = pdir(m[1]), b = JSON.parse((await readBody(req)).toString() || "{}");
      for (const f of ["scene.html", "narration/raw.wav", "narration/raw.wav.segments.json"]) if (!fs.existsSync(path.join(d, f))) return send(res, 400, { error: "missing " + f + " (" + (f.startsWith("narration") ? "generate narration" : "paste a scene") + " first)" });
      const s = rj(path.join(d, "story.json")); if (b.sound !== undefined) { s.sound = !!b.sound; wj(path.join(d, "story.json"), s); }
      startJob("render", m[1], "node", [path.join(dc, "pipeline.mjs"), d, ...(b.force ? ["--force"] : []), "--fix", String(b.fix ?? 8)]); return send(res, 200, { started: true }); }
    if (req.method === "POST" && p === "/api/cancel") { if (job && job.status === "running") { job.cancelled = true; job.child.kill("SIGTERM"); spawnSync("pkill", ["-f", "scripts/render.mjs"]); return send(res, 200, { cancelled: true }); } return send(res, 200, { cancelled: false }); }
    if (req.method === "GET" && p === "/api/job") return send(res, 200, job ? { kind: job.kind, id: job.id, status: job.status, lines: job.lines.slice(-400) } : null);
    if (req.method === "GET" && p === "/api/events") { res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" }); if (job) { for (const l of job.lines) res.write("data: " + JSON.stringify({ line: l }) + "\n\n"); if (job.status !== "running") res.write("data: " + JSON.stringify({ end: job.status }) + "\n\n"); else job.listeners.add(res); } req.on("close", () => job && job.listeners.delete(res)); return; }
    if ((m = p.match(/^\/preview\/([a-z0-9-]+)$/))) { const d = pdir(m[1]); if (!fs.existsSync(path.join(d, "scene.html"))) return send(res, 404, "no scene", "text/plain"); return send(res, 200, previewHtml(m[1], u.searchParams), "text/html; charset=utf-8"); }
    if ((m = p.match(/^\/files\/([a-z0-9-]+)\/(.+)$/)) && req.method === "GET") { const d = pdir(m[1]), f = path.resolve(d, m[2]); if (!f.startsWith(d + path.sep)) return send(res, 403, { error: "forbidden" }); return serveFile(req, res, f); }
    send(res, 404, { error: "not found" });
  } catch (e) { send(res, 500, { error: e.message }); }
});
server.listen(cfg.port, "127.0.0.1", () => console.log("Creator Studio  http://127.0.0.1:" + cfg.port + "   (projects in " + PROJ + ")"));
