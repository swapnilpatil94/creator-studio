// Compose, check and snapshot a demo episode for every style. Usage: node tests/styles-demo.mjs [style ...]
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { RF, tmp, comp, snap } from "./_util.mjs"; import { timing } from "../src/compose.mjs";
const only = process.argv.slice(2), files = fs.readdirSync(path.join(RF, "tests/golden/styles")).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)).filter(s => !only.length || only.includes(s));
fs.mkdirSync(path.join(RF, ".cache/styles"), { recursive: true });
for (const s of files) {
  const plan = JSON.parse(fs.readFileSync(path.join(RF, "tests/golden/styles", s + ".json"), "utf8")), dir = path.join(RF, ".cache/styles", s); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const m = await comp(plan, dir), chk = spawnSync("npx", ["--yes", "hyperframes@0.8.191", "check", "--json"], { cwd: dir, encoding: "utf8" }); let errs = [];
  try { const j = JSON.parse(chk.stdout); errs = ["lint", "runtime"].flatMap(k => (j[k]?.findings || []).filter(f => f.severity === "error" && !/AudioContext/.test(f.message)).map(f => f.code + ": " + f.message.slice(0, 140))); } catch { errs = ["check output unreadable"]; }
  const { rows } = timing(plan), times = rows.flatMap((r, i) => [r.start + Math.min(1.9, plan.beats[i].seconds * 0.55)]).map(t => +t.toFixed(1)), shots = snap(dir, times.map(String));
  console.log(`${s}: ${m.total_seconds}s, ${m.beats} beats, errors ${errs.length}${errs.length ? " " + errs.join(" | ") : ""}`); fs.writeFileSync(path.join(dir, "shots.json"), JSON.stringify(times.map(t => shots[String(t)])));
}
