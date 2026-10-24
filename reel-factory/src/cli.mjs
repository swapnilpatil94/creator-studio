#!/usr/bin/env node
// reel CLI (P1: compose / render / preview of a beat-plan file). Usage: node src/cli.mjs compose <plan.json> <outDir> [--assets dir]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
import { compose } from "./compose.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), RF = path.resolve(here, ".."), a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const [cmd, planFile, outDir] = a;
if (cmd === "compose" || cmd === "render" || cmd === "preview") {
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8")), out = path.resolve(outDir || "episode"), assets = path.resolve(arg("--assets", path.join(RF, "placeholder-cutouts")));
  const m = await compose({ plan, outDir: out, assetsDir: assets }); console.log(`composed ${m.beats} beats, ${m.total_seconds}s, gaps: ${m.gaps.length}`);
  if (cmd !== "compose") { const args = ["--yes", "hyperframes@0.8.191", "render", "--output", cmd === "preview" ? "preview.mp4" : "video.mp4", ...(cmd === "preview" ? ["--quality", "draft"] : [])]; const r = spawnSync("npx", args, { cwd: out, stdio: "inherit" }); process.exit(r.status || 0); }
} else { console.log("usage: node src/cli.mjs compose|render|preview <plan.json> <outDir> [--assets dir]"); }
