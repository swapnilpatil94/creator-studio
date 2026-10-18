// Wrapper around tools/layers/extract.py (depth + subject matte -> bg/mid/fg parallax layers). Layers are cached next to the picture and rebuilt only when the picture is newer.
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
const here = path.dirname(fileURLToPath(import.meta.url)), PY = path.join(os.homedir(), ".venvs/kathaaya-layers/bin/python");
export const layerFiles = dir => ["bg.jpg", "mid.webp", "fg.webp"].map(f => path.join(dir, f));
export function ensureLayers(img, outDir, { log = () => {}, max = 1600 } = {}) {
  const ok = layerFiles(outDir).every(f => fs.existsSync(f) && (fs.statSync(f).mtimeMs > fs.statSync(img).mtimeMs || !fs.existsSync(PY)));   // no layer tools here (CI): trust committed layers
  if (ok) { const mf = path.join(outDir, "layers.json"); let meta = {}; try { meta = JSON.parse(fs.readFileSync(mf, "utf8")); } catch {} if (!meta.free_side && fs.existsSync(PY)) spawnSync(PY, ["-W", "ignore", path.join(here, "extract.py"), outDir, "--meta-only"], { encoding: "utf8" }); return { cached: true }; }
  if (!fs.existsSync(PY)) throw new Error("layer tools are not installed (python venv ~/.venvs/kathaaya-layers missing)");
  const r = spawnSync(PY, ["-W", "ignore", path.join(here, "extract.py"), img, outDir, "--max", String(max)], { encoding: "utf8", env: { ...process.env, TOKENIZERS_PARALLELISM: "false" } });
  if (r.status !== 0) throw new Error("layer extraction failed: " + (r.stderr || r.stdout).slice(-300)); log(`layers ${path.basename(img)}: ${r.stdout.trim().split("\n").pop()}`); return { cached: false };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const [img, out] = process.argv.slice(2); console.log(JSON.stringify(ensureLayers(path.resolve(img), path.resolve(out), { log: console.log }))); }
