// Assets stage: pure, fast checks only (no image generation here). The pothi library is cached, so ensureAssets must make nothing.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path";
import { assetPrompt, assetSeed, assetKey, library, ensureAssets, score, cutoutsDir } from "../src/assets.mjs"; import { loadTheme } from "../src/compose.mjs"; import { themes } from "../src/catalog.mjs";
test("prompt = subject + the theme's style lock; seed is fixed per asset id", () => {
  const t = loadTheme("pothi"); assert.ok(assetPrompt(t, "a lotus").endsWith(t.flux_style_lock)); assert.equal(assetSeed("pothi", "lotus"), assetSeed("pothi", "lotus")); assert.notEqual(assetSeed("pothi", "lotus"), assetSeed("pothi", "cobra")); assert.notEqual(assetSeed("pothi", "lotus"), assetSeed("rahasya", "lotus"));
  assert.equal(assetKey(t, { id: "a", subject: "x" }, 2), assetKey(t, { id: "a", subject: "x" }, 2)); assert.notEqual(assetKey(t, { id: "a", subject: "x" }, 2), assetKey(t, { id: "a", subject: "y" }, 2));
});
test("every theme has 15 library assets: unique snake_case ids, subject-only (<=140 chars), 1+ recurring character", () => {
  for (const th of themes()) { const lib = library(th); assert.equal(lib.length, 15, th); assert.equal(new Set(lib.map(a => a.id)).size, 15, th); for (const a of lib) { assert.match(a.id, /^[a-z0-9_]+$/); assert.ok(a.subject.length <= 140); } assert.ok(lib.some(a => a.character), th + " has no character"); }
});
test("pothi: 15 generated cut-outs exist, are RGBA 640x640 with transparency, and a re-run is a pure cache hit", async () => {
  const lib = library("pothi"); for (const a of lib) { const f = path.join(cutoutsDir("pothi"), a.id + ".png"); assert.ok(fs.existsSync(f), a.id); const b = fs.readFileSync(f); assert.equal(b.readUInt32BE(16), 640); assert.equal(b[25], 6, "RGBA"); }
  const r = await ensureAssets({ theme: "pothi", assets: lib, log: () => {} }); assert.equal(r.made.length, 0); assert.equal(r.cached.length, 15);
});
test("a recurring character stays cached even if its subject text changes; an ordinary asset would be regenerated", async () => {
  const r = await ensureAssets({ theme: "pothi", assets: [{ id: "sage_figure", subject: "a different wording of the sage", character: true }], log: () => {} }); assert.deepEqual(r.cached, ["sage_figure"]); assert.equal(r.made.length, 0);
});
test("candidate score prefers a centred subject filling ~40% and penalises edge cropping", () => {
  const good = score({ ok: true, coverage: 0.42, touches_edge: false, center_offset: 0.02 }), cropped = score({ ok: true, coverage: 0.42, touches_edge: true, center_offset: 0.02 }), tiny = score({ ok: true, coverage: 0.05, touches_edge: false, center_offset: 0.02 });
  assert.ok(good > cropped && good > tiny); assert.ok(score({ ok: false }) < -5);
});
