# Reel Factory: edit styles

The one-take camera is gone. A reel is now a stack of full-frame scenes (one per beat). A **theme** gives the palette, fonts and art; a **style** gives the edit grammar: background, transitions between scenes, overlays and which components suit it. Everything is HTML, CSS and JS, rendered by HyperFrames, and every frame is a pure function of timeline time (seeded randomness only). Each style has a demo plan in `reel-factory/tests/golden/styles/<style>.json` and a test that checks it composes, passes the HyperFrames check with zero errors, is byte-identical twice and loops (last frame equals frame 0).

| Style | What it looks like | Best for | How it is built locally | Status |
|---|---|---|---|---|
| **kinetic** (Kinetic captions) | Word-by-word Hindi captions with pops and colour on the keyword | Every video, on top of any style (captions are on in every style except minimal) | Word timestamps (forced alignment) drive the caption animation; until P5, timings are estimated from character counts | done; real timestamps in P5 |
| **parallax** (2.5D parallax) | A still comes alive: the camera pushes through foreground and background layers | Mystery, history, mythology | Layered cut-outs moved at different speeds (component `Parallax`); an image + depth map variant needs a depth model (not downloaded) | done (layers) |
| **zoomthrough** (Zoom-through transitions) | Zoom into an object and the next scene emerges from inside it | Mystery, science | `zoomThrough` transition: scale the scene into the focus point (`beat.focus`), cross-fade to the next scene | done |
| **matchcut** (Match cuts / shape morph) | A circle becomes the moon, then a bubble, then a coin | Any genre | `morphIris` transition: a polygon iris morphs between two shapes (`beat.shapes`) while it grows; `ShapeHero` component | done |
| **desktop** (Investigation desktop) | The story told through a fake screen: archive search, file folders, chat bubbles, redacted documents | Mystery / true crime (excellent for रहस्य) | Components `SearchWindow`, `ChatThread`, `FileFolders`, `RedactedDoc` (HTML UI mock-ups with typing and window pops) | done |
| **mapflight** (Map flights) | Globe, country, city, pin with coordinates, Google-Earth style | Mystery places, history, travel | `MapFlight`: d3-geo orthographic globe, Natural Earth 50m outlines, drawn per frame on canvas | done (world countries; Indian state outlines need a data download, not done) |
| **retro** (Retro film / VHS / Super 8) | Grain, gate weave, light leaks, film burns, timestamp overlay | Mystery, old cases, history | Film overlay: pre-baked grain tile moved on twos, deterministic gate weave, light leaks on cuts, looping REC timecode; `filmBurn` transition | done |
| **scrapbook** (Grunge scrapbook) | Torn paper, ink splashes, marker lines, tape-rip transitions, fast jump edits | Hooks, openers, mythology, folk | Torn clip-path pieces with hard-offset shadows, `tapeRip` / `cut` / `flash` transitions | done |
| **threed** (3D-lite) | Rotating 3D objects, card flips, 3D text | Science, tech, "top 5" lists | CSS 3D transforms: `CardFlip`, `Spin3D` (4-sided prism), `Text3D` (extruded text). Three.js is not needed for these | done (CSS 3D) |
| **split** (Split screen / grids) | Side by side, before and after, four-panel mosaics | Comparisons, versus, timelines | CSS layouts with staggered entrances: `VersusSplit`, `Grid4`, `BeforeAfter` | done |
| **minimal** (Minimal typographic) | Big words on black with strong sound design and almost no imagery | Spooky reveals, emotional twists | `BigWords` on a black scene; text and timing only; the cheapest to make | done |
| **whip** (Speed-ramp whip cuts) | Hard cuts with motion blur, speed ramps, impact shakes | High-energy facts, lists | `whip` transition (blur + stretch), shake on impacts, `Text3D` | done |
| **spotlight** (Spotlight / redaction reveals) | A flashlight beam or black bars wipe away to reveal text | Mystery re-hooks and verdicts | `Flashlight` (radial mask path), `RedactedDoc` bar wipes, `spotlight` transition | done |

## Transitions
`cut`, `flash`, `whip`, `zoomThrough`, `tapeRip`, `morphIris`, `filmBurn`, `spotlight` (see `src/transitions.mjs`). Each style rotates its own list; any beat may force one with `"transition": "..."`.

## Rotation (do not use one style forever)
`src/pick-style.mjs` picks the style per episode from the genre's candidate list (mystery: desktop, retro, parallax, zoomthrough, spotlight, mapflight, minimal ...), never one used in the last 5 episodes, recorded in `episodes/_history.json`. The Director also sees `schemas/catalog.json` (components with their styles, styles, transitions, genres) and must output `style` in the beat plan (`schemas/beatplan.schema.json`).

## Still to do (later phases)
- Real word timestamps for the captions (P5), SFX and music mix.
- Depth-map parallax (needs a depth model download) and Three.js scenes if CSS 3D proves limiting.
- Indian state outlines for MapFlight (a GeoJSON download).
- Generated cut-out art replaces the placeholder icons (P3).
