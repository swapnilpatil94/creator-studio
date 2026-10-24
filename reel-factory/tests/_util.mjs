import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import crypto from "node:crypto"; import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
import { compose } from "../src/compose.mjs";
export const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const sha = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
export const tmp = n => fs.mkdtempSync(path.join(os.tmpdir(), "rf-" + n + "-"));
export const plan = f => JSON.parse(fs.readFileSync(path.join(RF, "tests/golden", f), "utf8"));
export const comp = (p, dir) => compose({ plan: p, outDir: dir, assetsDir: path.join(RF, "placeholder-cutouts") });
/** hyperframes snapshot at the given seconds -> { "<t>": pngPath } */
export function snap(dir, times) {
  const r = spawnSync("npx", ["--yes", "hyperframes@0.8.191", "snapshot", "--at", times.join(",")], { cwd: dir, encoding: "utf8", maxBuffer: 1e8 }), out = {};
  for (const m of (r.stdout || "").matchAll(/(\S+frame-\d+-at-([\d.]+)s\.png)/g)) out[String(Number(m[2]))] = path.isAbsolute(m[1]) ? m[1] : path.join(dir, m[1]);
  if (!Object.keys(out).length) throw new Error("snapshot produced nothing: " + (r.stderr || r.stdout).slice(-300));
  return out;
}
/** largest per-pixel luma difference between two PNGs (0 = identical): the loop frame may differ from frame 0 by sub-pixel 3D rasterisation only */
export function maxDiff(a, b) {
  if (sha(a) === sha(b)) return 0;
  const r = spawnSync("ffmpeg", ["-loglevel", "info", "-i", a, "-i", b, "-filter_complex", "[0][1]blend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YMAX", "-f", "null", "-"], { encoding: "utf8" });
  const m = [...(r.stderr || "").matchAll(/YMAX=(\d+)/g)].map(x => +x[1]); return m.length ? Math.max(...m) : 255;
}
