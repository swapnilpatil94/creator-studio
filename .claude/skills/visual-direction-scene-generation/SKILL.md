---
name: visual-direction-scene-generation
description: Build or extend a self-contained HTML/CSS/JS scene for the shared engine (deterministic renderAt/getDuration contract), choosing beat types and visual tokens from the right channel's identity.json. Use when generating a new scene, adding a new reusable primitive, or debugging a scene that fails the render pipeline's checks.
---

# Visual direction & scene generation

## The non-negotiable contract
Every scene is a single HTML file that defines:
```js
window.getDuration = () => <seconds>;      // fixed positive number
window.renderAt = (seconds) => { ... };     // pure function of `seconds`: draw the full frame
```
- **No `Math.random()`.** Use an index-seeded deterministic hash instead (see the `hash(i)`
  helper in `engine/examples/agentic-fanout-demo.html`) — the render pipeline's determinism check
  calls `renderAt(0)`, seeks elsewhere, seeks back to `renderAt(0)`, and hashes both screenshots;
  they must be pixel-identical.
- **No wall-clock timing** (`Date.now()`, `requestAnimationFrame` loops driving state). All visual
  state must be a function of the `seconds` argument alone.
- **No remote assets.** No CDN script/style/font/image URLs, no network calls. The render
  pipeline tracks outgoing requests and fails the render if any external URL is hit.
- **Real visual density.** The pipeline screenshots the largest `<canvas>` on the page at six
  points in the timeline and rejects a scene whose canvas content is too sparse (tiny labels on
  an empty frame). If you build with HTML/CSS text overlays only and no real canvas artwork, the
  density audit will likely fail — put the actual diagram/chart/particle work on a `<canvas>`
  element sized close to the full 540×960 (displayed) / 1080×1920 (rendered) frame.
- Hide `?render=1` from needing any manual interaction — scenes must render headless.

## Before writing a new scene: check what already exists
Read `engine/examples/*.html` first. As of this session:
- `visual-director-benchmark.html` — Three.js, particle-crowd stadium system, camera push/pan,
  phase-based color shift (ice→amber→red), node-graph with traveling "packet" points. Requires
  bundling via `scripts/build-visual-benchmark.mjs` (esbuild) before `render.mjs` can load it,
  because it has a bare `import * as THREE from "three"` specifier that a plain `file://` page
  can't resolve on its own.
- `agentic-fanout-demo.html` — pure Canvas2D (no bundling needed, no Three.js dependency), the
  reference implementation for the dashed/dotted node-diagram family: `dashedRoundRect`,
  `dottedRing`, `dashedCurve`, `pillLabel`, `label` (monospace letter-spaced), a falling
  particle field, a phone-mockup-with-labeled-endpoints beat, and a two-chart "shape tells the
  story" beat. **Prefer extending this file's helper functions over re-deriving them** — they are
  already tuned to pass the determinism and visual-density checks.
- `dotted-character-reveal.html` — the ink/parchment progressive-reveal technique used by
  Kathaaya content.

Reuse a helper rather than rewriting it. A new beat type is usually a new function plus a new
branch in `renderAt(seconds)`, not a new file.

## Picking the right visual language
Read the channel's `identity.json` (`channels/<channel>/identity.json`) before writing anything —
palette, typography rules, motion language, named `beat_types`, and an explicit `do_not` list are
there specifically so a scene doesn't drift between channels (e.g. Agentic AI's dashed dark
diagrams must never bleed into Kathaaya's ink/parchment look, and vice versa — see each
`identity.json`'s own `do_not`).

## A known failure mode to check for explicitly
Positioning a label at an **interpolated midpoint** between a source and several different
targets (e.g. `mix(source, target, 0.4)` for every target) tends to cluster unrelated labels at
nearly the same point when the targets fan out from a shared origin, producing illegible
overlapping text. Prefer positioning a label at **its own target's actual coordinates** (e.g. the
center of the specific card/node it describes), computed from the same formula the target shape
itself uses — not an arbitrary interpolation fraction. (This was a real bug found and fixed in
`agentic-fanout-demo.html`'s phone-mockup beat this session — check for the same pattern in any
new fan-out/connector beat.)

## Validating a new or edited scene
```bash
cd engine
node scripts/render.mjs --html examples/<your-scene>.html --out output/<name>.mp4 --fps 24
```
Then actually look at the output — extract a few frames with `ffmpeg -ss <t> -frames:v 1` at
representative timestamps per beat and read them. Passing the automated checks (determinism,
visual density, no frozen ending, no external requests) is necessary but not sufficient — a
scene can pass every check and still be visually wrong (labels overlapping, text off-canvas, a
diagram that doesn't read at a glance). Rendered evidence wins over "the script exited 0."
