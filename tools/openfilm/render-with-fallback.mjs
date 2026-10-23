// Optional render backend: tries OpenFilm first (compiles the project, runs its own `render` CLI, which
// downloads its headless Chromium on first use and self-validates with `look`'s determinism check), and
// falls back to the existing, unmodified engine/scripts/render.mjs pipeline on ANY failure -- missing
// ffmpeg, no network for the one-time browser download, a bad film.html, anything. The existing renderer
// is never touched or blocked by this file; it is simply invoked the same way it always has been.
// usage: node tools/openfilm/render-with-fallback.mjs stories/<name> [a-b] [--scale 2]
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileFilm } from "./compile-film.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OPENFILM_BIN = path.join(ROOT, "tools/openfilm/node_modules/openfilm/bin/openfilm.mjs");

function tryOpenfilm(storyDir, range, extraArgs, log) {
  const { projectDir } = compileFilm(storyDir);
  const args = ["render", ...(range ? [range] : []), ...extraArgs];
  log(`openfilm: ${args.join(" ")} (in ${projectDir})`);
  const r = spawnSync(process.execPath, [OPENFILM_BIN, ...args], {
    cwd: projectDir, env: { ...process.env, OPENFILM_NO_BROWSER: "1" }, encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`openfilm render exited ${r.status}: ${(r.stderr || r.stdout || "").slice(-400)}`);
  log(r.stdout.trim().split("\n").at(-1) || "openfilm render done");
  return projectDir;
}

function fallbackToExisting(storyDir, log) {
  log("falling back to the existing renderer (engine/scripts/render.mjs), unmodified");
  const html = path.join(storyDir, "build", "index.html");
  const out = path.join(storyDir, "openfilm", "fallback-render.mp4");
  const audio = path.join(storyDir, "narration", "voice", "narration.wav");
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audio], { encoding: "utf8" }).trim());
  const workers = String(Math.min(6, Math.max(2, Math.floor(os.cpus().length / 2))));
  const clipsDir = path.join(storyDir, "clips");
  // --fast (JPEG canvas capture, not full PNG screenshots), --workers (parallel shards) and --clips (serves the
  // story's own camera-move frames at https://clips.local/ instead of letting the page hit that host for real)
  // are what the real pipeline (engine/dot-cinema/pipeline.mjs) always passes. Found this the hard way: without
  // --clips, every camera-move beat threw net::ERR_NAME_NOT_RESOLVED and render.mjs aborted the whole render;
  // without --fast/--workers it fell back to one full-res PNG screenshot per frame (~9s/frame, impractical).
  const args = ["scripts/render.mjs", "--html", html, "--out", out, "--audio", audio, "--size", "540x960", "--fast", "--workers", workers, "--duration", String((audioDuration + 1).toFixed(2)), ...(fs.existsSync(clipsDir) ? ["--clips", clipsDir] : [])];
  const r = spawnSync(process.execPath, args, { cwd: path.join(ROOT, "engine"), encoding: "utf8" });
  if (r.status !== 0) throw new Error(`existing renderer also failed, exit ${r.status}: ${(r.stderr || r.stdout || "").slice(-400)}`);
  log(`existing renderer ok -> ${out}`);
  return out;
}

export function renderWithFallback(storyDir, { range = null, extraArgs = [], log = console.log } = {}) {
  try {
    return { backend: "openfilm", path: tryOpenfilm(storyDir, range, extraArgs, log) };
  } catch (e) {
    log(`openfilm backend failed: ${e.message}`);
    return { backend: "existing", path: fallbackToExisting(storyDir, log) };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [storyArg, rangeArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const scaleIdx = process.argv.indexOf("--scale");
  const extraArgs = scaleIdx >= 0 ? ["--scale", process.argv[scaleIdx + 1]] : [];
  if (!storyArg) { console.error("usage: node tools/openfilm/render-with-fallback.mjs stories/<name> [a-b] [--scale 2]"); process.exit(2); }
  const result = renderWithFallback(path.resolve(storyArg), { range: rangeArg, extraArgs });
  console.log(`done via ${result.backend}: ${result.path}`);
}
