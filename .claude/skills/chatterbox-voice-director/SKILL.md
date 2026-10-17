---
name: chatterbox-voice-director
description: Use when generating, tuning, or A/B-testing Hindi/Hinglish narration with Chatterbox for a story — assigns per-beat delivery intents, preps spoken text, assembles takes with designed pauses, post-processes, and measures before/after. Never overwrites the original raw.wav.
---
# Chatterbox voice director

Code: `audio/` (textprep, director, synth, postprocess, analyze, ab, model, sweep). UI: Studio → `/voice`. Data: `audio/intents.json`, `audio/experiments/sweep/results.json`.

## What the model really supports
`exaggeration, cfg_weight, temperature, repetition_penalty, min_p, top_p`. No speed, pitch, or emotion tokens. ~40 s cap per call. Sweep (n=1/setting, 4-seed noise floor): only **exaggeration** moved delivery beyond noise (0.8+ doubles pitch range but lengthens speech ~25% and was unstable). cfg_weight/temperature/min_p were inside noise. `repetition_penalty` 1.2 truncated to 1.6 s: keep ≥ 2.0. Director therefore varies exaggeration (cap 0.75) and does tempo (ffmpeg atempo, 0.92–1.10), pauses, loudness in post. Don't claim more.

## Workflow
1. `python audio/director.py stories/<s>/beats.json` — review intents. Override per beat with `"intent"`, `"exaggeration"`, `"tempo"`, `"pause_after"` in beats.json.
2. `python audio/textprep.py`-style review: `textprep.review(text)` lists unmapped Latin words; add them (Devanagari) to `_EXTRA` in textprep.py. Digits become Hindi words; display text is never changed.
3. `python audio/synth.py <story> <name> --tempo 1.08 --post light` (env: `PYTHONPATH="<tts_repo>/.vendor_py:audio"`, `CHATTERBOX_MODEL_VARIANT=dedicated_hindi`, py 3.12). Takes are cached; re-running with a new tempo/pause/post is cheap. One heavy job at a time.
4. `python audio/ab.py <story> <variant…>` → table + `narration/variants/ab_report.json`. Then **listen** in `/voice`. Metrics: LUFS, true peak, LRA, per-beat loudness deviation, pace, pauses, clicks, pitch spread. They do not measure emotion.
5. Use in a film: `/voice` → "Use B" (changes story.json pointers only; "Restore original" reverts).

## Measured (this repo)
- Hanuman: original −25.5 LUFS / worst beat 1.5 dB off median / 3.53 w/s; directed_v3 −18.7 LUFS / 0.9 dB / 2.8 w/s (≈20% slower, longer pauses). Pitch spread per beat ≈ equal (2.7 vs 2.9 st): no proven expressive gain; the clear wins are loudness, consistency, and designed pauses.
- Hinglish test: Whisper transcripts show Devanagari spoken forms (रीट्राई, एरर रेट, रेट लिमिट) recognised where the baseline gave garbled forms. Text-similarity score was unreliable for mixed-script, so not used.
- Candidates: `synth.py --candidates 3` makes N seeds per beat (candidates/<beat>_<k>.wav); pick in /voice, then Assemble (uses picks.json, cached takes, no regeneration).
- Pace trade-off is open: directed output is slower than the legacy pipeline; raise `--tempo` (max 1.10) or shorten `pause_after`.
