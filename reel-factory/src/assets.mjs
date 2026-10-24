// Assets stage: theme style lock + fixed seed per asset id -> Klein candidates -> BiRefNet cut-out -> deterministic pick -> cache by hash.
// Recurring characters (and anything with reuse:true) are never regenerated once cached, so they stay the same across beats and episodes.
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import crypto from "node:crypto"; import { spawn, spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
import { hash } from "./lib/rng.mjs"; import { loadTheme } from "./compose.mjs";
const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), CACHE = path.join(RF, "assets/cache"), PY = path.join(RF, ".venv/bin/python");
const DT_DIR = process.env.DRAWTHINGS_MODELS_DIR || path.join(os.homedir(), "DrawThingsModels"), MODEL = "flux_2_klein_4b_q6p.ckpt", SIZE = 640, STEPS = 4, VERSION = 1;
export const assetPrompt = (theme, subject) => `${subject}, ${theme.flux_style_lock}`;
export const assetSeed = (themeName, id) => hash(`${themeName}:${id}`) % 2147483647;
export const assetKey = (theme, a, n) => crypto.createHash("sha1").update(JSON.stringify([VERSION, MODEL, SIZE, STEPS, assetPrompt(theme, a.subject), assetSeed(theme.name, a.id), n])).digest("hex").slice(0, 16);
export const dirFor = (themeName, id) => path.join(CACHE, themeName, id), cutoutsDir = themeName => path.join(CACHE, themeName, "cutouts");
const J = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
/** free memory in GB (free + inactive + speculative pages) */
export function freeGB() { const o = spawnSync("vm_stat", { encoding: "utf8" }).stdout || "", pg = +(/page size of (\d+)/.exec(o) || [0, 16384])[1], n = k => +((new RegExp(k + ":\\s+(\\d+)").exec(o) || [0, 0])[1]); return (n("Pages free") + n("Pages inactive") + n("Pages speculative")) * pg / 1073741824; }
/** wait (up to `secs`) for memory to be released by the previous stage (Ollama unloads asynchronously) */
export async function waitForMemory(gb, secs = 120) { for (let i = 0; i < secs / 3; i++) { if (freeGB() >= gb) return; await new Promise(r => setTimeout(r, 3000)); } throw new Error(`only ${freeGB().toFixed(1)} GB of memory free after ${secs}s: close other heavy apps (Ollama models, ComfyUI) and retry`); }
const klein = (prompt, out, seed) => new Promise((ok, no) => { const c = spawn("draw-things-cli", ["generate", "--local", "--model", MODEL, "--prompt", prompt, "--width", String(SIZE), "--height", String(SIZE), "--steps", String(STEPS), "--seed", String(seed), "--output", out], { env: { ...process.env, DRAWTHINGS_MODELS_DIR: DT_DIR }, stdio: ["ignore", "pipe", "pipe"] }); let err = ""; c.stderr.on("data", d => err += d); c.stdout.on("data", d => err += d); c.on("close", code => code === 0 && fs.existsSync(out) ? ok() : no(new Error("draw-things-cli failed: " + err.slice(-200)))); });
const cut = jobs => new Promise((ok, no) => { const jf = path.join(os.tmpdir(), "rf-cut-" + process.pid + ".json"); fs.writeFileSync(jf, JSON.stringify(jobs)); const c = spawn(PY, [path.join(RF, "src/cutout.py"), jf], { stdio: ["ignore", "pipe", "pipe"] }); let o = "", e = ""; c.stdout.on("data", d => o += d); c.stderr.on("data", d => e += d); c.on("close", code => { const m = /@@METRICS(.*)/.exec(o); code === 0 && m ? ok(JSON.parse(m[1])) : no(new Error("cutout failed: " + e.slice(-300))); }); });
/** deterministic pick: subject should fill 18-75% of the frame, centred, not cropped by the frame edge */
export const score = m => !m.ok ? -9 : 1 - Math.abs(m.coverage - 0.42) * 2 - (m.touches_edge ? 0.6 : 0) - m.center_offset * 0.8;
/** ensure every asset exists for a theme. assets: [{id, subject, reuse?, character?}]. Returns { made, cached, picked } */
export async function ensureAssets({ theme: themeName, assets, candidates = 2, log = console.log, force = false }) {
  const theme = loadTheme(themeName), made = [], cached = [], todo = [];
  fs.mkdirSync(cutoutsDir(themeName), { recursive: true });
  for (const a of assets) {
    const d = dirFor(themeName, a.id), meta = J(path.join(d, "meta.json")), have = fs.existsSync(path.join(cutoutsDir(themeName), a.id + ".png")), key = assetKey(theme, a, candidates);
    if (have && !force && (meta?.key === key || a.reuse || a.character || meta?.character)) { if (meta && meta.key !== key) log(`  ${a.id}: kept the cached version (recurring asset; the subject text changed)`); cached.push(a.id); continue; }
    todo.push({ ...a, key });
  }
  if (!todo.length) return { made, cached, picked: {} };
  await waitForMemory(4);
  // stage 1: all candidates (Draw Things loads the model once per image; nothing else is resident)
  for (const [i, a] of todo.entries()) { const d = dirFor(themeName, a.id); fs.mkdirSync(d, { recursive: true });
    for (let n = 1; n <= candidates; n++) { const f = path.join(d, `cand${n}.jpg`), png = f + ".png", t = Date.now(); if (fs.existsSync(f) && fs.statSync(f).size > 5000 && J(path.join(d, `cand${n}.json`))?.key === a.key) continue;
      for (let tr = 0; tr < 2; tr++) { try { await klein(assetPrompt(theme, a.subject), png, assetSeed(themeName, a.id) + (n - 1) * 7919); break; } catch (e) { if (tr) throw e; log("  retry: " + e.message.slice(0, 80)); } }
      spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", png, "-q:v", "2", f]); fs.rmSync(png); fs.writeFileSync(path.join(d, `cand${n}.json`), JSON.stringify({ key: a.key })); log(`  [${i + 1}/${todo.length}] ${themeName}/${a.id} candidate ${n} in ${((Date.now() - t) / 1000).toFixed(0)}s`); } }
  // stage 2: cut-outs of every candidate in one BiRefNet session, then pick
  const jobs = todo.flatMap(a => Array.from({ length: candidates }, (_, k) => ({ id: a.id, n: k + 1, src: path.join(dirFor(themeName, a.id), `cand${k + 1}.jpg`), dst: path.join(dirFor(themeName, a.id), `cut${k + 1}.png`) })));
  log(`  cutting out ${jobs.length} candidates with BiRefNet`); const res = await cut(jobs), picked = {};
  for (const a of todo) { const rs = res.filter(r => r.id === a.id), best = rs.reduce((p, r) => !p || score(r) > score(p) ? r : p, null); if (!best?.ok) throw new Error("no usable cut-out for " + a.id);
    fs.copyFileSync(best.dst, path.join(cutoutsDir(themeName), a.id + ".png")); fs.writeFileSync(path.join(dirFor(themeName, a.id), "meta.json"), JSON.stringify({ id: a.id, theme: themeName, subject: a.subject, key: a.key, seed: assetSeed(themeName, a.id), model: MODEL, size: SIZE, prompt: assetPrompt(theme, a.subject), candidates: rs.map(r => ({ n: r.n, coverage: r.coverage, touches_edge: r.touches_edge, center_offset: r.center_offset, score: +score(r).toFixed(3) })), picked: best.n, character: !!a.character }, null, 1)); picked[a.id] = best.n; made.push(a.id); }
  return { made, cached, picked };
}
export const library = themeName => J(path.join(RF, "themes", themeName, "library.json"), { assets: [] }).assets;
/** assets a beat plan asks for (deduplicated by id) */
export const planAssets = plan => { const m = new Map(); for (const b of plan.beats) for (const a of b.assets || []) if (!m.has(a.id)) m.set(a.id, a); return [...m.values()]; };
