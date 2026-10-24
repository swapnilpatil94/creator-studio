// Previews every template with the same 5-beat story (engraved cut-outs reused, so only the template changes). Usage: node tests/templates-demo.mjs [name ...]
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { RF, comp } from "./_util.mjs"; import { TEMPLATES } from "../templates/index.mjs"; import { loadTheme, timing, compose } from "../src/compose.mjs";
const only = process.argv.slice(2), names = Object.keys(TEMPLATES).filter(n => !only.length || only.includes(n)), cut = path.join(RF, "assets/cache/darkpsych/cutouts");
const B = (i, c, on, mood, extra = {}) => ({ id: i, line_ids: [i], seconds: 3.4, archetype: "hook", component: c, variant: "", on_screen: on, accent_line: on.length || 1, mood, assets: [], motion: [], emphasis_word: "", sfx: [], loop_to_start: false, narration: on.join(" "), ...extra });
const A = (...ids) => ids.map(id => ({ id, subject: id, reuse: true }));
for (const n of names) {
  const t = TEMPLATES[n], th = loadTheme(t.theme), mood = m => th.moods[m];
  const plan = { title: n + " preview", theme: t.theme, genre: "psychology", style: t.style, sources: [], warnings: [], gaps: [], loop: false, tail: 1.2, beats: [
    B(1, "Specimen", ["मुफ़्त ट्रायल", "एक बटन"], "calm", { tag: "EXHIBIT A", assets: A("trial_button") }), B(2, "StringBoard", ["बटन", "फ़ीस", "भूल"], "pressure", { assets: A("trial_button", "subscription_fee", "forgotten_user") }),
    B(3, "Checklist", ["+ साइन अप", "- रद्द करना"], "pressure", { title: "OPTIONS" }), B(4, "Stamp", ["तय किसी और ने"], "reveal"), B(5, "Specimen", ["आपकी आदत", "बाद में देखूँगा"], "clarity", { tag: "EXHIBIT B", assets: A("habit") })].map(b => ({ ...b, sheet: mood(b.mood) })) };
  const dir = path.join(RF, ".cache/templates", n); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const m = await compose({ plan, outDir: dir, assetsDir: cut }); const r = spawnSync("npx", ["--yes", "hyperframes@0.8.191", "check", "--json"], { cwd: dir, encoding: "utf8", env: { ...process.env, npm_config_offline: "true" } }); let errs = []; try { const j = JSON.parse(r.stdout); errs = ["lint", "runtime"].flatMap(k => (j[k]?.findings || []).filter(f => f.severity === "error" && !/AudioContext/.test(f.message)).map(f => f.code)); } catch {}
  const { rows } = timing(plan, undefined), ts = rows.map((r2, i) => +(r2.start + 1.9).toFixed(1)); spawnSync("npx", ["--yes", "hyperframes@0.8.191", "snapshot", "--at", ts.join(",")], { cwd: dir, encoding: "utf8", env: { ...process.env, npm_config_offline: "true" } });
  const snaps = path.join(dir, ".hyperframes/artifacts/snapshots"), last = fs.readdirSync(snaps).sort((a, b) => fs.statSync(path.join(snaps, b)).mtimeMs - fs.statSync(path.join(snaps, a)).mtimeMs)[0], files = fs.readdirSync(path.join(snaps, last)).filter(f => /^frame-\d+/.test(f)).sort().map(f => path.join(snaps, last, f)).slice(0, 5);
  spawnSync("ffmpeg", ["-loglevel", "error", "-y", ...files.flatMap(f => ["-i", f]), "-filter_complex", files.map((_, i) => `[${i}]scale=300:-1[a${i}]`).join(";") + ";" + files.map((_, i) => `[a${i}]`).join("") + `hstack=${files.length}`, path.join(dir, "sheet.jpg")]);
  console.log(n, "check errors:", errs.length, errs.join(","));
}
