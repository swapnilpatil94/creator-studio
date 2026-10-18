#!/usr/bin/env node
// Gated, resumable production pipeline for a story folder (story.json).
//   sdk  scene (scene.js, captions drawn by the scene):  build -> visual QA (+repair) -> sound -> render -> A/V QA -> share
//   html scene (pasted scene.html, captions overlaid):    validate -> generic QA (+repair) -> sound -> render -> A/V QA -> share
// Stages whose inputs are unchanged are skipped. A failed gate stops the run and keeps logs. Emits "@@stage <name> <status> <detail>" lines.
// usage: node pipeline.mjs <storyDir> [--force] [--fix 8] [--no-sound]
import { spawnSync, spawn } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), engine = path.resolve(here, ".."), dir = path.resolve(process.argv[2]);
const force = process.argv.includes("--force"), fixN = process.argv.includes("--fix") ? process.argv[process.argv.indexOf("--fix") + 1] : "8";
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "story.json"), "utf8")), TYPE = cfg.type || "sdk", P = f => path.join(dir, f);
if (cfg.format) process.env.QA_SIZE = cfg.format;
const out = P("output"), build = P("build"); fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(build, { recursive: true });
const html = path.join(build, "index.html"), mp4 = path.join(out, cfg.name + ".mp4"), ovFile = P("overrides.json"), lead = Number(cfg.lead ?? 0.9);
if (!fs.existsSync(ovFile)) fs.writeFileSync(ovFile, "{}");
const stateFile = path.join(out, "pipeline-state.json"), state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {};
const sha = (...files) => crypto.createHash("sha256").update(files.map(f => fs.existsSync(f) ? fs.readFileSync(f) : "").join("|")).digest("hex").slice(0, 16);
const libFiles = fs.readdirSync(here).filter(f => f.endsWith(".js") || f.endsWith(".json") || f.endsWith(".mjs")).map(f => path.join(here, f));
const ev = (stage, status, detail = "") => console.log("@@stage " + stage + " " + status + " " + detail);
const segs = JSON.parse(fs.readFileSync(P(cfg.segments), "utf8")), narrDur = segs.duration_seconds, sceneDur = narrDur + lead + (cfg.tail ?? 1.9);
function run(stage, cmd, args, cwd) { ev(stage, "running"); const r = spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 1 << 28 }); fs.writeFileSync(path.join(out, stage + ".log"), (r.stdout || "") + (r.stderr || "")); return r; }
function fail(stage, r, extra) { ev(stage, "failed", "see " + path.join(out, stage + ".log")); console.error("[" + stage + "] FAILED (exit " + r.status + ")\n" + (extra || ((r.stdout || "") + (r.stderr || "")).split("\n").slice(-25).join("\n"))); fs.writeFileSync(stateFile, JSON.stringify(state, null, 1)); process.exit(r.status === 2 ? 2 : 1); }
let TS = 1; const t0 = Date.now(); const readOv = () => JSON.parse(fs.readFileSync(ovFile, "utf8"));

// ---- 0. workflow gates (strict mode) ----
if (cfg.requireGates) { const r = spawnSync("node", [path.resolve(here, "../../planner/gates.mjs"), dir], { encoding: "utf8" }); fs.writeFileSync(path.join(out, "gates.log"), (r.stdout || "") + (r.stderr || "")); if (r.status !== 0) fail("gates", r, (r.stdout || "").split("\n").filter(l => l.startsWith("FAIL")).join("\n") + "\nWorkflow gates not met (see .claude/skills/workflow-gate); refusing to build."); ev("gates", "ok"); }
// ---- 1. build / validate ----
if (TYPE === "html") {
  const src = P(cfg.scene); const r = run("validate", "node", [path.join(here, "validate-scene.mjs"), src, "--json", path.join(out, "validate.json")], here);
  if (r.status !== 0) fail("validate", r, JSON.parse(fs.readFileSync(path.join(out, "validate.json"), "utf8")).issues.filter(i => i.level === "error").map(i => "- " + i.message + "\n    fix: " + i.fix).join("\n"));
  const vj = JSON.parse(fs.readFileSync(path.join(out, "validate.json"), "utf8")); fs.copyFileSync(src, html); TS = (vj.stats.duration || sceneDur) / sceneDur;
  ev("validate", "ok", vj.warnings + " warnings auto-handled; scene " + (vj.stats.duration || "?") + "s vs film " + sceneDur.toFixed(1) + "s" + (Math.abs(TS - 1) > 0.05 ? " (timeline time-scaled x" + TS.toFixed(2) + ")" : ""));
} else {
  const fp = sha(P(cfg.scene), P(cfg.segments), ...libFiles);
  if (force || state.build !== fp || !fs.existsSync(html)) { const r = run("build", "node", [path.join(here, "build.mjs"), P(cfg.scene), html, P(cfg.segments), cfg.format || "1080x1920", ...(cfg.overlay ? ["overlay"] : [])], here); if (r.status !== 0) fail("build", r); state.build = fp; ev("build", "ok"); } else ev("build", "cached");
}
// ---- 2. visual QA with automatic repair ----
if (cfg.visualQa !== false) {
  const qaArgs = TYPE === "html" ? [path.join(here, "generic-qa.mjs"), html, ovFile, P(cfg.segments), String(lead), "--ts", String(TS), "--vdur", String(sceneDur), ...(cfg.captionsInScene ? ["--no-captions"] : []), "--fix", fixN, "--report", path.join(out, "visual-qa.json")] : [path.join(here, "visual-qa.mjs"), html, ovFile, "--fix", fixN, "--report", path.join(out, "visual-qa.json")];
  const r = run("visual-qa", "node", qaArgs, here);
  if (r.status !== 0) fail("visual-qa", { ...r, status: 2 }, (r.stdout || "").split("\n").slice(-14).join("\n") + "\nVisual standards not met after auto-repair; refusing to render.");
  ev("visual-qa", "ok", "0 violations");
}
// ---- 3. sound (authored cue sheet > scene cues > auto-derived) + ducked mix ----
let audioForRender = P(cfg.audio), audioOffset = lead;
if (cfg.sound !== false && !process.argv.includes("--no-sound")) {
  const cueFile = fs.existsSync(P("sound.json")) ? P("sound.json") : path.join(out, "autocues.json");
  if (!fs.existsSync(P("sound.json"))) { const fpA = sha(html, ...libFiles.filter(f => /autocues|studio-shim/.test(f))); if (force || state.autocues !== fpA || !fs.existsSync(cueFile)) { const r = run("autocues", "node", [path.join(here, "autocues.mjs"), html, String(lead), cueFile], here); if (r.status !== 0) fail("autocues", r); state.autocues = fpA; } }
  const fpS = sha(cueFile, P(cfg.audio), P(cfg.segments), path.join(here, "sound.mjs"), path.join(here, "mix.mjs")), mix = path.join(out, "mix.wav");
  if (force || state.sound !== fpS || !fs.existsSync(mix)) {
    let r = run("sound", "node", [path.join(here, "sound.mjs"), cueFile, String(sceneDur), path.join(out, "sound.wav")], here); if (r.status !== 0) fail("sound", r);
    r = run("mix", "node", [path.join(here, "mix.mjs"), path.join(out, "sound.wav"), P(cfg.audio), String(lead), String(sceneDur), P(cfg.segments), mix, path.join(out, "mix-report.json")], here); if (r.status !== 0) fail("mix", r);
    state.sound = fpS; ev("sound", "ok", (r.stdout || "").split("\n")[0]);
  } else ev("sound", "cached");
  audioForRender = mix; audioOffset = 0;
}
// ---- 4. render ----
const injectArgs = [];
if (TYPE === "html") { const ov = readOv(); const cfgFile = path.join(out, "studio-config.json"); fs.writeFileSync(cfgFile, JSON.stringify({ compat: true, fit: true, captions: cfg.captionsInScene ? null : { segments: segs.segments, lead, dim: ov.capDim?.scene ?? 0.6, timeScale: TS }, exposure: ov.exposure?.scene ?? 1 })); injectArgs.push("--studio-config", cfgFile, "--inject", path.join(here, "studio-shim.js")); }
const fpR = sha(html, ovFile, audioForRender, path.join(engine, "scripts/render.mjs"), path.join(here, "studio-shim.js")) + TYPE + audioOffset + TS.toFixed(3) + (cfg.captionsInScene ? "c" : "");
if (force || state.render !== fpR || !fs.existsSync(mp4)) {
  const fdir = path.join(out, "frames"), fpFile = path.join(fdir, ".fingerprint"); const canResume = !force && fs.existsSync(fpFile) && fs.readFileSync(fpFile, "utf8") === fpR;
  if (!canResume) { fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir, { recursive: true }); fs.writeFileSync(fpFile, fpR); } ev("render", "running", canResume ? "resuming from existing frames" : "0");
  const child = spawn("node", [path.join(engine, "scripts/render.mjs"), "--gpu", "--html", html, "--out", mp4, "--audio", audioForRender, "--audio-offset", String(audioOffset), "--fps", String(cfg.fps || 24), "--duration", String(sceneDur.toFixed(3)), ...(cfg.format ? ["--size", cfg.format.split("x").map(v => v / 2).join("x")] : []), ...(canResume ? ["--resume"] : []), ...injectArgs], { cwd: engine });
  let log = ""; const onData = d => { const s = d.toString(); log += s; const m = [...s.matchAll(/Frames: (\d+)\/(\d+)/g)].pop(); if (m) ev("render", "progress", m[1] + "/" + m[2]); };
  child.stdout.on("data", onData); child.stderr.on("data", onData);
  const code = await new Promise(res => child.on("close", res)); fs.writeFileSync(path.join(out, "render.log"), log);
  if (code !== 0) fail("render", { status: code, stdout: log, stderr: "" }); state.render = fpR; ev("render", "ok", ((Date.now() - t0) / 1000).toFixed(0) + "s");
} else ev("render", "cached");
// ---- 5. audio/video QA on the real file ----
{ const r = run("qa", "node", [path.join(here, "qa.mjs"), mp4, P(cfg.segments), String(lead), path.join(out, "qa.json"), JSON.stringify((cfg.cuts || []).map(c => c + lead)), JSON.stringify(((fs.existsSync(P("sound.json")) ? JSON.parse(fs.readFileSync(P("sound.json"), "utf8")).silences : []) || []).map(x => [x.t + lead, x.t + lead + x.dur]))], here); console.log((r.stdout || "").trim().split("\n").slice(-16).join("\n")); if (r.status !== 0) fail("qa", r); ev("qa", "ok", "all checks passed"); }
// ---- storage: the render frames (resume data) are 1-19 GB; once the mp4 has passed QA they are dead weight. Set "keepFrames": true in story.json to keep them.
if (cfg.keepFrames !== true && fs.existsSync(path.join(out, "frames"))) { fs.rmSync(path.join(out, "frames"), { recursive: true, force: true }); ev("cleanup", "ok", "render frames removed after QA passed"); }
// ---- 6. share copy ----
const share = path.join(out, cfg.name + "-share.mp4");
if (!fs.existsSync(share) || fs.statSync(share).mtimeMs < fs.statSync(mp4).mtimeMs) { const r = run("share", "ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-vf", "scale=720:-2", "-c:v", "libx264", "-crf", "24", "-preset", "medium", "-c:a", "aac", "-b:a", "128k", share], here); if (r.status !== 0) fail("share", r); }
fs.writeFileSync(stateFile, JSON.stringify(state, null, 1)); ev("done", "ok", share); console.log("DONE in " + ((Date.now() - t0) / 1000).toFixed(0) + "s -> " + share);
