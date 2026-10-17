# KATHAAYA stipple engine (code-only: no generative models)

Every dot is a real GPU particle. Its position is an **analytic function of (home position, per-dot attributes, uniforms, t)**: no simulation history, so `renderAt(t)` is order-independent (verified: `test/determinism.mjs`).

## Files
| File | Role |
|---|---|
| `sample.mjs` | image -> stipple cloud. Variable-radius Poisson-disk start (Bridson 2007) + pixel-weighted Lloyd relaxation (Secord 2002 weighted centroidal Voronoi). Deterministic (same input + options = identical bytes). ffmpeg decodes images, no npm deps |
| `pair.mjs` | pairs two clouds for morphing (Hilbert-rank matching) |
| `figure.mjs` | procedural, hand-rigged stippled walker (capsule bones, per-bone stippling, 2-bone skin weights) |
| `format.mjs` | `.stip` binary format (typed arrays, JSON header) |
| `engine.js` | Three.js `Points` + custom `ShaderMaterial`; all modes in the vertex shader; `StippleScene`, `skeletonMatrices`, easing helpers |
| `test/` | `determinism.mjs`, `bench.mjs`, `frames.mjs` (frame dumps), `preview.py` (draw a .stip to PNG) |

## Modes (per-cloud uniforms, set from your timeline each frame)
reveal `uReveal` (contours first, then centre outward) | formation / scatter + reform `uForm`, `uFormSpread`, `uFormStagger` | flow `uFlow` (travel time through a curl-noise field, 12 RK-style steps; running `uFlow` back to 0 retraces the path so dots converge home), `uFlowAmp/Freq/Speed/T0`, `uRegionFlow[16]` per region | orbit `uOrbit*` | morph `uMorph`, `uMorphArc` (needs a paired cloud) | path-follow `uPathPts[8]` Catmull-Rom, `uPathPhase`, `uPathWidth`, `uPathGate` | layered parallax: `--layers layers.json` gives each dot a z; the perspective camera (`setCamera({x,y,dist,yaw,pitch,roll})`) does the rest | skeletal motion `uUseBones` + `uBone[12]` from `skeletonMatrices(skeleton, angles, root)` | story events: your scene maps narration timestamps to uniform values with `kf([[t,v],...], t)`.

## Use in a story
1. `node engine/stipple/sample.mjs art.jpg stories/<s>/assets/a.stip --n 70000 --mode ink|light [--layers l.json] [--mask m.png]`
2. optional morph: `node engine/stipple/pair.mjs a.stip b.stip a_to_b.stip`
3. scene.js: `import {StippleScene, unpack, kf, ...} from "../../engine/stipple/engine.js"; import a from "./assets/a.stip";` build a `StippleScene({canvas: document.getElementById("c")})`, `addCloud("a", unpack(a))`, and in `window.renderAt(t)` set uniforms from `t`, call `S.render()`. See `stories/stipple-proof/scene.js` (every mode in 16 s).
4. build: `node engine/dot-cinema/build.mjs stories/<s>/scene.js out.html` (the esbuild loader embeds `.stip`), export: `cd engine && node scripts/render.mjs --html out.html --out film.mp4 --fps 24` (add `--audio narration.wav` for sound). `?n=0.5` in the URL thins every cloud for previews.
5. Quality: preview with `?n=0.25`; final at 1.0. Fallback if WebGL is missing: the existing 2D `dot-cinema` renderer.

## Honest limits
- A flat image has no hidden body parts or depth: dots can flow, form, morph and parallax-shift, but a **portrait cannot be made to walk automatically**. Articulated motion needs authored bones/masks (`figure.mjs` shows the pattern); layers/regions for paintings are authored polygons/masks. MediaPipe pose could place landmarks on a photo but still cannot invent occluded limbs; not used.
- Software WebGL (SwiftShader) is what headless Chromium gives on this machine; the exported frames are screenshot-bound (~300 ms/frame at 1080x1920), not vertex-bound.
- Ink mode on mid-tone paintings is heavy; tune `--edge` and the density curve in `sample.mjs` per artwork.
