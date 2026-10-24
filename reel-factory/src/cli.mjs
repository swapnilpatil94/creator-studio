#!/usr/bin/env node
// reel CLI (P1: compose / render / preview of a beat-plan file). Usage: node src/cli.mjs compose <plan.json> <outDir> [--assets dir]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
import { compose } from "./compose.mjs"; import { ensureAssets, library, planAssets } from "./assets.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), RF = path.resolve(here, ".."), a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const [cmd, planFile, outDir] = a;
if (cmd === "compose" || cmd === "render" || cmd === "preview") {
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8")), out = path.resolve(outDir || "episode"), assets = arg("--assets") ? path.resolve(arg("--assets")) : undefined;
  const m = await compose({ plan, outDir: out, assetsDir: assets }); console.log(`composed ${m.beats} beats, ${m.total_seconds}s, gaps: ${m.gaps.length}`);
  if (cmd !== "compose") { const args = ["--yes", "hyperframes@0.8.191", "render", "--output", cmd === "preview" ? "preview.mp4" : "video.mp4", ...(cmd === "preview" ? ["--quality", "draft"] : [])]; const r = spawnSync("npx", args, { cwd: out, stdio: "inherit" }); process.exit(r.status || 0); }
} else if (cmd === "assets") {   // reel assets library <theme> | reel assets plan <plan.json>
  const [, what, target] = a, cands = +arg("--candidates", 2); const t0 = Date.now();
  if (what === "library") { const r = await ensureAssets({ theme: target, assets: library(target), candidates: cands }); console.log(`${target}: made ${r.made.length}, cached ${r.cached.length} in ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  else if (what === "plan") { const plan = JSON.parse(fs.readFileSync(target, "utf8")), r = await ensureAssets({ theme: plan.theme, assets: planAssets(plan), candidates: cands }); console.log(`made ${r.made.length}, cached ${r.cached.length}`); }
  else console.log("usage: reel assets library <theme> | reel assets plan <plan.json> [--candidates 2]");
} else { console.log("usage: node src/cli.mjs compose|render|preview <plan.json> <outDir> [--assets dir]"); }
