#!/usr/bin/env node
// Gated, resumable production pipeline:  build -> visual QA (+auto-repair) -> render -> audio/video QA -> share copy.
// Stages whose inputs are unchanged are skipped (fingerprint cache). A failed gate stops the run and keeps logs.
// usage: node pipeline.mjs <storyDir> [--force] [--fix 8]
import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), engine = path.resolve(here, ".."), dir = path.resolve(process.argv[2]);
const force = process.argv.includes("--force"), fixN = process.argv.includes("--fix") ? process.argv[process.argv.indexOf("--fix") + 1] : "8";
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "story.json"), "utf8")), P = f => path.join(dir, f);
const out = P("output"), build = P("build"); fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(build, { recursive: true });
const html = path.join(build, "index.html"), mp4 = path.join(out, cfg.name + ".mp4"), ovFile = P("overrides.json");
if (!fs.existsSync(ovFile)) fs.writeFileSync(ovFile, "{}");
const stateFile = path.join(out, "pipeline-state.json"), state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {};
const sha = (...files) => crypto.createHash("sha256").update(files.map(f => fs.existsSync(f) ? fs.readFileSync(f) : "").join("|")).digest("hex").slice(0, 16);
const libFiles = fs.readdirSync(here).filter(f => f.endsWith(".js") || f.endsWith(".json")).map(f => path.join(here, f));
const log = (stage, m) => console.log("[" + stage + "] " + m);
function run(stage, cmd, args, cwd) { log(stage, "running"); const r = spawnSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 1 << 28 }); fs.writeFileSync(path.join(out, stage + ".log"), (r.stdout || "") + (r.stderr || "")); return r; }
function gate(stage, r) { if (r.status !== 0) { console.error("[" + stage + "] FAILED (exit " + r.status + "). See " + path.join(out, stage + ".log") + "\n" + ((r.stdout || "") + (r.stderr || "")).split("\n").slice(-25).join("\n")); process.exit(1); } }

const t0 = Date.now();
// 1 build
const fpBuild = sha(P(cfg.scene), P(cfg.segments), ...libFiles);
if (force || state.build !== fpBuild || !fs.existsSync(html)) { gate("build", run("build", "node", [path.join(here, "build.mjs"), P(cfg.scene), html, P(cfg.segments)], here)); state.build = fpBuild; log("build", "ok"); } else log("build", "cached");
// 2 visual QA with automatic repair (cheap: ~12s per pass, sample frames only)
const vr = run("visual-qa", "node", [path.join(here, "visual-qa.mjs"), html, ovFile, "--fix", fixN, "--report", path.join(out, "visual-qa.json")], here);
log("visual-qa", vr.status === 0 ? "pass (0 violations)" : "VIOLATIONS REMAIN"); fs.writeFileSync(path.join(out, "visual-qa.log"), (vr.stdout || "") + (vr.stderr || ""));
if (vr.status !== 0) { console.error((vr.stdout || "").split("\n").slice(-14).join("\n") + "\nVisual standards not met after auto-repair; refusing to render. Fix the scene or relax standards.json deliberately."); fs.writeFileSync(stateFile, JSON.stringify(state, null, 1)); process.exit(2); }
// 3 render (only if scene/overrides/audio changed)
const fpRender = sha(html, ovFile, P(cfg.audio), path.join(engine, "scripts/render.mjs"));
if (force || state.render !== fpRender || !fs.existsSync(mp4)) {
  const html2 = path.join(build, "index.html"); fs.rmSync(path.join(out, "frames"), { recursive: true, force: true });
  const r = run("render", "node", [path.join(engine, "scripts/render.mjs"), "--gpu", "--html", html2, "--out", mp4, "--audio", P(cfg.audio), "--audio-offset", String(cfg.lead), "--fps", String(cfg.fps || 24)], engine);
  gate("render", r); state.render = fpRender; log("render", "ok (" + ((Date.now() - t0) / 1000).toFixed(0) + "s so far)");
} else log("render", "cached");
// 4 audio/video QA on the real file
const qr = run("qa", "node", [path.join(here, "qa.mjs"), mp4, P(cfg.segments), String(cfg.lead), path.join(out, "qa.json"), JSON.stringify((cfg.cuts || []).map(c => c + cfg.lead))], here);
console.log((qr.stdout || "").trim().split("\n").slice(-16).join("\n")); gate("qa", qr);
// 5 share copy
const share = path.join(out, cfg.name + "-share.mp4");
if (!fs.existsSync(share) || fs.statSync(share).mtimeMs < fs.statSync(mp4).mtimeMs) { gate("share", run("share", "ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-vf", "scale=720:-2", "-c:v", "libx264", "-crf", "24", "-preset", "medium", "-c:a", "aac", "-b:a", "128k", share], here)); }
fs.writeFileSync(stateFile, JSON.stringify(state, null, 1)); console.log("DONE in " + ((Date.now() - t0) / 1000).toFixed(0) + "s -> " + share);
