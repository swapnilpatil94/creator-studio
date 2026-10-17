---
name: stipple-animation-engine
description: Use when animating the dots of an illustration (stipple formation, ink reveal, flow, scatter/reform, morph, parallax, path streams, rigged walkers) in KATHAAYA films with the code-only Three.js engine in engine/stipple. No generative models. Covers sampling, authoring layers/masks/rigs, timelines, export and limits.
---
# Stipple animation engine (engine/stipple)
Read `engine/stipple/README.md` first. Reference scene: `stories/stipple-proof/scene.js`. Report: `docs/STIPPLE_ENGINE_REPORT.md`.

## Rules
- **Determinism:** animation must be a pure function of t. Set uniforms from `t` in `renderAt(t)`; never integrate state across frames, never use `Math.random()` or wall-clock time. Check with `node engine/stipple/test/determinism.mjs <built.html> 24`.
- **Sample once, offline:** `sample.mjs` (deterministic) -> `.stip` files committed with the story; the browser only animates them. Pick `--mode ink` (dark = dense, parchment look) or `light` (bright = dense, black field); tune `--edge` so faces, jewellery and linework keep dots.
- **Authored structure:** layers (`--layers` polygons -> z for parallax), regions (`--mask` image -> region id, used by `uRegionFlow` and rigs) and rigs (`figure.mjs` pattern) are authored by hand; a flat image has no hidden limbs or depth. Do not promise a portrait that walks.
- **Motion serves the story:** do not stack every effect on every scene: reveal for introductions, flow/scatter for divine energy and loss, reform for emergence, morph for transformation, parallax for scale, path streams for energy between characters. Respect religious iconography (no distortion of faces/sacred attributes beyond a brief, deliberate dissolve).
- **Quality:** preview with `?n=0.25`, final at 1.0. Software WebGL export costs ~300 ms/frame at 1080x1920 (screenshot-bound); a 16 s, 24 fps film takes ~3 minutes. Check freezes/black frames (`ffmpeg freezedetect/blackdetect`) and the first frames (a blank opening is a failure).
- Existing dot-cinema (2D) scenes keep working; the engine is additive. Painting-dot films (`dotifyPalette`) and stipple films are different tools: use stipple when dots must move independently.

## Optional skills (not installed; verified MIT, read-only inspection 2026-10-17)
`0xDarkMatter/claude-mods` `genart-ops` (three.js/p5/GLSL/noise/Poisson/Voronoi reference) and `CloudAI-X/threejs-skills` `threejs-shaders` (ShaderMaterial/GLSL reference). Install only if the engine work needs a deeper shader reference; they overlap with this skill's code.
