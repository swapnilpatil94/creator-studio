// Plates: illustrative photographic images painted with the studio's local photoreal painter (Z-Image Turbo + LoRAs through Draw Things), then graded once
// (warm highlights, cool shadows, light vignette, slightly muted) so every plate shares one look. Cached by hash; always shown with an ILLUSTRATIVE label.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
import { hash } from "./lib/rng.mjs"; import { loadTheme } from "./compose.mjs"; import { freeGB } from "./assets.mjs";
const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), STUDIO = path.resolve(RF, "..");
export const plateDir = theme => path.join(RF, "assets/cache", theme, "cutouts");
const GRADE = "eq=saturation=0.9:contrast=1.06:brightness=-0.02,colorbalance=rs=-0.05:gs=0:bs=0.06:rm=0:bm=0.02:rh=0.06:gh=0.01:bh=-0.07,vignette=angle=PI/5:mode=backward";
/** plates: [{id, prompt, seed?}] -> files assets/cache/<theme>/cutouts/<id>.jpg */
export async function makePlates({ theme: themeName, plates, log = console.log }) {
  process.env.IMAGE_MODEL = "zimage"; const { generate } = await import(path.join(STUDIO, "tools/flux/klein.mjs")), theme = loadTheme(themeName), out = plateDir(themeName); fs.mkdirSync(out, { recursive: true }); const made = [], cached = [];
  for (const [i, pl] of plates.entries()) {
    const prompt = `${pl.prompt}, ${theme.flux_style_lock}`, seed = pl.seed ?? hash(`${themeName}:${pl.id}`) % 2147483647, key = crypto.createHash("sha1").update(JSON.stringify(["plate1", prompt, seed])).digest("hex").slice(0, 16), meta = path.join(out, pl.id + ".json"), dst = path.join(out, pl.id + ".jpg");
    if (fs.existsSync(dst) && fs.existsSync(meta) && JSON.parse(fs.readFileSync(meta, "utf8")).key === key) { cached.push(pl.id); continue; }
    if (freeGB() < 4) throw new Error(`only ${freeGB().toFixed(1)} GB free: stop other heavy jobs (voice, Ollama) and retry`);
    const raw = path.join(out, pl.id + ".raw.jpg"), t = Date.now(); await generate(prompt, raw, { ratio: "9:16", seed });
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-vf", GRADE, "-q:v", "2", dst]); if (r.status !== 0) throw new Error("grade failed"); fs.rmSync(raw);
    fs.writeFileSync(meta, JSON.stringify({ id: pl.id, key, prompt, seed, model: "z-image-turbo+LoRA (Draw Things)", graded: true, label: "illustrative reconstruction" }, null, 1)); made.push(pl.id); log(`  [${i + 1}/${plates.length}] plate ${pl.id} in ${((Date.now() - t) / 1000).toFixed(0)}s`);
  }
  return { made, cached };
}
