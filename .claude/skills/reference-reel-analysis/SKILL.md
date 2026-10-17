---
name: reference-reel-analysis
description: Analyze a reference Reel/Short to extract transferable visual technique (palette, typography, diagram grammar, pacing) without copying the source creator's script, branding, or footage. Use before building or updating a channel's identity.json, or whenever the user supplies a new reference video to match.
---

# Reference-Reel analysis

## Inputs
- A local video file (mp4/mov). Never claim an analysis happened without the file actually being
  read and processed with real tools (`ffprobe`, `ffmpeg`) — see the project rule in
  `ARCHITECTURE.md`: "Never claim reference analysis has occurred unless the actual video files
  were accessible and processed."

## Step 1 — Technical facts (always do this first)
```bash
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=width,height,r_frame_rate,codec_name \
  -of default=noprint_wrappers=0 "<video>"
```
Record resolution, fps, duration, codecs.

## Step 2 — Pacing: scene cuts and audio structure
```bash
# Hard cut timestamps
ffmpeg -i "<video>" -vf "select='gt(scene,0.25)',showinfo" -f null - 2>&1 | grep -oE "pts_time:[0-9.]+"
# Silence / narration-pause structure
ffmpeg -y -i "<video>" -vn -acodec pcm_s16le ref_audio.wav -loglevel error
ffmpeg -i ref_audio.wav -af silencedetect=noise=-30dB:d=0.3 -f null - 2>&1 | grep silence
```
Few/no hard cuts + a near-continuous camera move usually means: build this as **one scene with
phase transitions** (`renderAt(seconds)` branching on `t`), not a slideshow of separate HTML
files per beat. Many short hard cuts means the opposite.

## Step 3 — Frame sampling across the full duration
```bash
ffmpeg -y -i "<video>" -vf "fps=0.5" ref_frames/f_%03d.jpg -loglevel error   # one every 2s
```
Read every extracted frame (not just the first one). Look specifically for:
- **Platform/app chrome baked into the frame** (status bar, a native app's own UI, a
  screen-recording warning overlay). If present, **this is someone else's captured content, not
  a stock reference** — see "Copyright boundary" below before doing anything else with it.
- Palette: exact background treatment (flat vs. vignette/gradient), accent color count and rule
  for when each accent is used.
- Diagram convention: solid fill vs. solid wireframe vs. dashed/dotted outline; particle/point
  fields; connector-line style; label typography (monospace vs. sans, caps vs. lowercase).
- Typography layout: centered vs. left-aligned, how many lines, how accent color is applied to
  text (whole line vs. one word).
- Distinct **beat types**, not just a single visual style — e.g. a title card, a diagram beat, a
  big-number stat-reveal beat, and a chart beat are usually different enough to name separately
  (see `channels/agentic-ai/identity.json` → `beat_types` for the worked example from this
  project's own reference analysis).

## Step 4 — Copyright boundary (mandatory, not optional)
If the source shows platform UI chrome, a creator handle, a caption, or any sign it was captured
rather than supplied as a licensed/stock asset:
- Write the finding down explicitly in the reference profile (don't bury it).
- Extract **grammar only**: palette, type rules, diagram conventions, pacing. These are generic
  genre conventions, not the creator's copyrightable expression.
- Do **not** reproduce the specific script, headline copy, title, data points, narrative analogy,
  or sequence from the source anywhere in generated output.
- Recommend the raw video file be kept out of version control (`.gitignore`), not committed.
- Tell the user directly what was found — don't silently decide this on their behalf.

## Step 5 — Write the reference profile
One file per analyzed source: `reference-analysis/<slug>/REFERENCE_PROFILE.md` (see
`reference-analysis/REFERENCE_PROFILE.md` in this repo for the worked example) containing:
source facts (step 1), a "finding about the source file" section if step 4 applies, the
extracted visual grammar (step 3), and a gap analysis against whatever the engine currently
implements (read `engine/examples/*.html` to check what already exists before claiming something
is missing).

## Step 6 — Cache, don't re-run
Once written, a reference profile should only be re-generated when the source video or the
profile schema changes — don't re-analyze on every session.
