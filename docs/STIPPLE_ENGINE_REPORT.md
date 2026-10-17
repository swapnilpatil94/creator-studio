# Stipple animation engine: research, build and results (2026-10-17, branch `feature/stipple-engine`)

## 1. What we found (primary sources)
- **Stippling = weighted centroidal Voronoi:** Secord, "Weighted Voronoi Stippling" ([paper](https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/secord.2002b.pdf)); the practical JS recipe is Bostock's Observable notebook ([voronoi stippling](https://observablehq.com/@csee/voronoi-stippling), rejection-sampled start, 80 weighted Lloyd passes with d3-delaunay) and the Coding Train version ([challenge 181](https://thecodingtrain.com/challenges/181-image-stippling)).
- **Blue-noise start:** Bridson's [fast Poisson-disk sampling](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf); variable density (radius from image darkness) is the extension described in [this arXiv paper](https://arxiv.org/pdf/2004.06789).
- **Flow:** [Curl-noise for procedural fluid flow](https://www.dneg.com/wp-content/uploads/2022/11/2007.pdf): taking the curl of a noise potential gives a divergence-free field, so dots do not pile up in "gutters". No credible ready-made Three.js implementation was found in the search; we wrote the shader ourselves.
- **Skills:** `genart-ops` ([claude-mods](https://github.com/0xDarkMatter/claude-mods), MIT file verified) and `threejs-shaders` ([CloudAI-X/threejs-skills](https://github.com/cloudai-x/threejs-skills), MIT per README) exist; I read their contents and licences but did not install them (they overlap with our code). The new project skill is `.claude/skills/stipple-animation-engine`.

## 2. Algorithm / package comparison (what each would implement)
| Candidate | Fits? | Decision |
|---|---|---|
| Luminance-only sampling | loses faces, jewellery, linework | density = tone + contour strength + saturation |
| Variable-radius Poisson-disk (Bridson) | blue-noise start, O(n), deterministic | **used** (start) |
| Weighted Lloyd relaxation (Secord) | even, image-faithful dots | **used** (own grid-based version, 6-10 iterations; no d3-delaunay dependency) |
| Error diffusion / halftone | grid-like artefacts, hard to animate per dot | not used |
| Three.js `Points` + `ShaderMaterial` | one draw call per cloud, GPU animation as analytic functions | **used** (three r180 already in the repo) |
| GPUComputationRenderer ping-pong simulation | stateful: breaks order-independent export | rejected |
| p5.js | good for experiments; no advantage inside our Three/Node pipeline | not used |
| MediaPipe pose | optional landmarks only; cannot invent hidden limbs | not used |

## 3. What is and is not possible without generative models
**Possible:** faithful stipple from any image; dots forming, revealing, scattering, flowing, orbiting, morphing and following paths; depth parallax from authored layers; a rigged character built from authored bones. **Not possible automatically:** animating an arbitrary flat portrait as a walking person. Occluded limbs and depth do not exist in the image; articulated motion needs authored masks/bones (shown with `figure.mjs`). Pose landmarks could place joints on a photo but cannot reconstruct what is hidden.

## 4. Our actual project (what existed)
`engine/dot-cinema/lib.js` `dotify()` reads a 2D canvas layer every frame and draws a hex dot grid: the dots are a **screen-space filter** of a luminance layer, not particles, so they cannot move independently. The pipeline contract (`window.renderAt(t)`, `getDuration()`, esbuild bundle -> single HTML -> Playwright screenshots -> ffmpeg) is deterministic and was kept. Smallest change: an additive `engine/stipple/` (offline sampler + GPU particle engine) that plugs into the same build and renderer. Existing scenes are untouched (regression: Hanuman film still builds and passes visual QA, 0 violations).

## 5. Architecture
Offline Node: image -> `.stip` (positions, colour, size, reveal order, region, seed, edge, optional z/bones/morph target). Browser: `StippleScene` (Three.js) draws one `Points` per cloud; **every mode is evaluated in the vertex shader as a pure function of attributes + uniforms**; the scene's timeline maps narration timestamps to uniforms. Details and the mode list: `engine/stipple/README.md`.

## 6. Files
New: `engine/stipple/{sample,pair,figure,format}.mjs`, `engine/stipple/engine.js`, `engine/stipple/README.md`, `engine/stipple/test/{determinism,bench,frames}.mjs`, `engine/stipple/test/preview.py`, `stories/stipple-proof/{scene.js, assets/*.stip, assets/layers04.json}`, `.claude/skills/stipple-animation-engine/SKILL.md`, this report. Changed (additive): `engine/dot-cinema/build.mjs` (`.stip` binary loader).

## 7. Proof (`stories/stipple-proof/output/stipple-proof.mp4`, 16 s, 1080x1920, 24 fps, 384 frames, exported with the existing `engine/scripts/render.mjs`)
0-2.2 s ink reveal (contours first) | 2.2-5.0 curl-noise flow then the same field run back (dots converge home) | 5.0-7.0 scatter and reform | 7.0-9.5 morph painting 1 -> painting 2 (paired clouds, arc through the field) | 9.4-12.4 three authored depth layers + camera yaw/dolly (parallax) | 12.4-16 rigged stippled walker (profile, repeatable 0.9 s walk cycle) with a path-following energy stream. Source art: public-domain paintings from `stories/mahishasura-mardini/assets` (see its CREDITS.md). No generated images.

## 8. Test results (all run in this session)
- **Sampler determinism:** two runs of `sample.mjs` on the same image give byte-identical `.stip` (checked with `cmp`). 39k dots in 2.4 s; 70k dots in about 4 s.
- **Render determinism:** `test/determinism.mjs` renders frames 20, 100, 150, 230, 300, 372 forward, reversed and shuffled with a repeat, in three fresh browser instances: **all pixel hashes identical (PASS)**.
- **Export checks:** ffprobe 1080x1920, 24 fps, 384 frames, 16.000 s; `freezedetect` and `blackdetect` report nothing (a first run had 0.42 s of near-empty opening frames; fixed by starting the reveal at 4%).
- **Performance (headless Chromium here exposes only SwiftShader software WebGL, so Metal-GPU numbers on the M4 Pro will be better and were not measured):** render+sync with the flow field on: 100k dots 16 ms, 200k 29 ms, 400k 49 ms, 800k 94 ms per frame (roughly linear). End-to-end for the proof (renderAt + 1080x1920 PNG screenshot) is ~300 ms/frame at 47k, 83k and 155k dots alike: **export is screenshot-bound, not particle-bound**. JS heap 31-40 MB. Full 16 s export ~3 minutes.
- **Regression:** Hanuman film builds and visual QA gives 0 violations after the engine changes.

## 9. Integrating into production
See `engine/stipple/README.md` "Use in a story". Gates: a stipple film still needs gates.json, claims, narration, sound and QA like any story; the A/V QA and pipeline stages are unchanged (the pipeline's visual-QA stage for SDK scenes needs `window.__debug`; add a minimal one before running the full pipeline on a stipple scene: not done in this proof, which used the renderer directly).

## 10. Roadmap (prioritised)
1. `window.__debug` + exposure/ink-density checks so stipple scenes run the full gated pipeline. 2. Ink/gold/crimson colour grading modes and a tuned ink-density curve for mid-tone paintings (the ink-only preview is heavy). 3. Authored mask tooling (draw regions/layers over an image, emit `mask.png`/`layers.json`). 4. Region-aware flow presets for divine-energy streams between two painted characters (gods -> goddess). 5. Contour-following particles (tangent flow along `edge` direction). 6. Rig library: standing, kneeling, raising arms; 2.5D cut-out characters from authored layered art. 7. Hardware-GPU export path to cut the screenshot bottleneck. 8. Optional MediaPipe landmark import for photo-based rigs, with human review.

## Remaining limitations
Ink mode on dark paintings can be heavy; the walker is a mannequin proof, not a portrait; gray-scale morph pairing uses Hilbert order (cheap, not optimal transport); the proof was not run through the narration/sound pipeline.
