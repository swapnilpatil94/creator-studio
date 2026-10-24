// Builds the chai documentary end to end from an existing narration: plan (timing from alignment) -> compose -> check -> render -> mix -> inspect.
// Usage: node examples/chai/build.mjs   (needs stories/rf-chai narration and the plates; see plates.json)
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
import { compose } from "../../src/compose.mjs"; import { planFromNarration } from "../../src/plan-from-narration.mjs"; import { mix, inspectAudio } from "../../src/mix.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RF = path.resolve(HERE, "../.."), OUT = path.join(RF, "episodes/chai-documentary"), narr = path.resolve(RF, "../stories/rf-chai/narration/voice");
const T = {}; const stage = async (n, f) => { const t = Date.now(); const r = await f(); T[n] = +((Date.now() - t) / 1000).toFixed(1); console.log(`⏱ ${n}: ${T[n]}s`); return r; };
fs.rmSync(path.join(OUT, "composition"), { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, "composition"), { recursive: true });
const plan = planFromNarration({ base: JSON.parse(fs.readFileSync(path.join(HERE, "plan.base.json"), "utf8")), segments: path.join(narr, "segments.json"), offset: 0.5 }); fs.writeFileSync(path.join(OUT, "plan.json"), JSON.stringify(plan, null, 1));
const m = await stage("compose", () => compose({ plan, outDir: path.join(OUT, "composition") })); console.log(`composed ${m.beats} beats, ${m.total_seconds}s, gaps ${m.gaps.length}, captions ${m.captions.groups} groups (estimated: ${m.captions.estimated})`);
const dir = path.join(OUT, "composition"), chk = JSON.parse(spawnSync("npx", ["--yes", "hyperframes@0.8.191", "check", "--json"], { cwd: dir, encoding: "utf8" }).stdout || "{}");
const errs = ["lint", "runtime"].flatMap(k => (chk[k]?.findings || []).filter(f => f.severity === "error" && !/AudioContext/.test(f.message)).map(f => f.code + ": " + f.message.slice(0, 120))); console.log("check errors:", errs.length, errs.join(" | "));
await stage("render", () => { const r = spawnSync("npx", ["--yes", "hyperframes@0.8.191", "render", "--output", "video.mp4"], { cwd: dir, encoding: "utf8" }); if (!fs.existsSync(path.join(dir, "video.mp4"))) throw new Error("render failed " + (r.stderr || "").slice(-300)); });
fs.mkdirSync(path.join(OUT, "09_mix"), { recursive: true }); const final = path.join(OUT, "09_mix/final.mp4");
await stage("mix", async () => console.log(mix({ video: path.join(dir, "video.mp4"), voice: path.join(narr, "narration.wav"), plan, manifest: m, out: final })));
console.log("audio:", JSON.stringify(inspectAudio(final))); fs.writeFileSync(path.join(OUT, "timings.json"), JSON.stringify(T, null, 1));
