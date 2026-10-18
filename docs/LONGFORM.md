# Long-form engine v2 (started 2026-10-18)

**Why.** The first 8-minute film (Durga's birth) rendered correctly but was visually thin: 65 of 131 beats were scroll-painting crops baked to dots, the rest a gold symbol on black; no infographic, no characters, no variety. It also failed one QA check (captions missing on three short "atmosphere" beats). The cure is not more polish on that scene: the film should be *planned by the system* from the narration, with a rich component library.

**Pipeline (everything is done by the studio's own tools, not typed by hand):**
1. script + voice (existing): narration beats (`beats.json`, `narration/voice/segments.json`).
2. `tools/longform/director.mjs`: the writer model picks one visual component per beat from a catalog and fills its parameters from the beat's own words; a validator enforces pacing rules and replaces invalid answers with rule-based picks; writes `plan.json` + `plan.report.json` (what was fixed, warnings).
3. `tools/longform/art.mjs`: each "scene" used by cinema beats gets a 16:9 FLUX.2 Klein painting (shot spec by the writer model, linted by `tools/flux/prompt-director.mjs`). Resumable. Takes about 90 s per image.
4. `tools/longform/make-scene.mjs`: writes `scene.js` + `story.json` (cinema beats without art fall back to kinetic text).
5. `engine/dot-cinema/pipeline.mjs` (existing): build, sound, render, QA, share.

**Component catalog** (`engine/longform/core.js`, 2D canvas, deterministic `renderAt(t)`): `cinema` (painting with camera move, blurred-fill for narrow art), `kinetic` (slam/wave words with accent), `stat` (counter + progress ring), `bars` (animated comparison), `timeline`, `graph` (relationship graph: who is whose), `versus` (text says X / tradition says Y), `quote`, `chapter` card, `mandala` (generative). All carry captions, ember atmosphere, grade, vignette, progress bar.

**Pacing rules** (heuristics from creator practice, not measured on this channel; confirm with insights): a new visual every beat (about 4 s); no component twice in a row except cinema; at most 2 text-only beats in a row; 5+ different visual types per minute; open on a picture or hook; a re-hook (question or turn) near 25/50/75%; beats over 9 s keep one visual, so split long narration lines; the ending lands on the emotional peak (peak-end rule). The validator reports all of these.

**Not built yet (honest list):** Three.js 3D components (rotating symbols, particle fields), p5-style generative scenes beyond the mandala, 2D characters (a rigged character needs layered art per character; plan: FLUX character sheets cut into parts + a small bone rig), a map component (needs licensed map geometry), Hub one-click button, writer model for the long script itself (today the script comes from the item/paste flow), and a retention comparison against the old film.
