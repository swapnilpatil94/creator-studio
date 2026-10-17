---
name: dot-cinema-visual-qa
description: Produce or revise a dot-cinema film (white/amber dots on black, HTML canvas, Chatterbox narration) through the gated pipeline, and apply the visual standards so bad frames are caught and repaired before the user sees them. Use for any new story film, or when a shot looks wrong.
---

# Dot-cinema production with visual QA

## Run it
```bash
node engine/dot-cinema/pipeline.mjs stories/<name>        # build -> visual QA (+auto-repair) -> render -> A/V QA -> share copy
node engine/dot-cinema/pipeline.mjs stories/<name> --force
```
Needs `stories/<name>/story.json`, `scene.js`, `narration/raw.wav(.segments.json)`. Stages are fingerprint-cached;
a failed gate stops the run and leaves `output/<stage>.log`. Visual QA failing after auto-repair **blocks the render**.

## Narration first, then visuals
`tools/tts_beats.py` in infographics-motion (storytelling preset, `hindi_mixed`, dedicated Hindi checkpoint, env
`CHATTERBOX_MODEL_VARIANT=dedicated_hindi`, `PYTHONPATH=.vendor_py`) gives audio + word timestamps. Shots, camera keys and
effect triggers use those timestamps (`word(beatId, "छलाँग")`), never fixed durations. Keep a 0.9 s lead-in and ~1.9 s tail.

## What the scene must expose
`window.__debug(t)` returns hero/head/moon/caption geometry so QA measures the real frame. Tunables live in
`window.OVERRIDES` (`zoom`, `camDx`, `camDy`, `moonShift`, `heroGain`, per shot key) — QA edits `overrides.json`, not code.

## Standards (engine/dot-cinema/standards.json) and why each exists
- head_in_frame: close-up heads keep a 3% margin — cropped crowns/snouts look like mistakes.
- hero_not_blown: <30% of hero dots at full brightness — otherwise the figure is a white cloud.
- hero_moon_readable: a bright figure over the bright moon merges; keep apart or make the figure a dark silhouette.
- hero_size / hero_not_cropped: readable on a phone, not clipped by the edge outside intentional close-ups.
- caption_clear_of_face: captions never cover the face (lower body is fine).
- camera_zoom_rate / camera_pan_rate: no jolts, no smeared dots.
Audio/video: 1080x1920, 24 fps, level −30..−12 dB mean, no clipping, no silence >0.9 s inside narration, audio onset within 0.25 s of plan, no blank/frozen/repeated frames, captions visible and inside margins.

## Craft rules learned the hard way
1. Character recognition comes from silhouette + attributes (crown, mace, tail), not anatomy. Light it as a **dark body with a bright rim** (low ambient/diffuse, high rim); bright interiors turn into clouds.
2. Pose head orientation separately from head position (a shared angle made the face look at the sky).
3. Pick stories where the hero can be a formation, an environment or a silhouette; avoid long close-ups of code-drawn faces.
4. Props that carry meaning get their own tint (golden crown outline, amber eyes) — do not scatter decorative arcs (a mala drew as a stray smile).
5. Big flat fills always read as mistakes; give mountains/cities structure (ridges, tiers, windows) and light them through the same emboss pass.
6. Direct-drawn elements (ocean, embers) must be batched (Path2D); per-dot fills made renders 10x slower.
7. Use `--gpu` for 2D-canvas scenes; SwiftShader is for WebGL scenes only.

## Known limits (QA does not catch these — look at the frames yourself)
Hero-vs-background contrast other than the moon, anatomical beauty, whether a cut feels earned, sound design (none yet).
After auto-repair always read a contact sheet (`ffmpeg -ss … -frames:v 1`) before sending a film.
