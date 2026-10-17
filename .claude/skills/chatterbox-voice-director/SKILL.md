---
name: chatterbox-voice-director
description: Use when generating the Hindi/Hinglish narration of a story with Chatterbox. ONE narration per film (no variants, no candidates): energetic, punchy, reels-paced, emotion moving phrase by phrase, smooth. Assigns an emotion per phrase, preps spoken text, validates takes automatically, assembles with designed pauses, post-processes and measures. Never overwrites the original raw.wav.
---
# Chatterbox voice director (one narration, emotional flow)
Code: `audio/` (director, synth, textprep, postprocess, analyze, model). Config: `audio/intents.json`. UI: Studio `/voice` (one player, the emotion table, Regenerate).

## Rules from the owner (2026-10-17)
- **One narration per film.** No A/B variants, no 3-seed candidates, no picking takes. Quality control is automatic: a take that fails objective checks (raw pace outside 1.8-4.2 words/s, clipping, > 0.7 s dead air, too short) is regenerated with the next seed (max 3 tries).
- **Energetic, punchy, reels-paced:** target 3.1-3.6 words/s while speaking, short phrases, short pauses, one designed silence before the turn and the peak.
- **Emotion follows the story:** every phrase has an emotion (hook, curious, narrate, tense, awe, punch, reveal, reflective). Author it in `beats.json` per beat with `"emotions": ["tense","punch"]` (one per auto-split phrase; split points are sentence enders and … / —) or let the director infer it from the beat `intent`.
- **Smooth:** loudness-matched phrases (-23 dB RMS +/- emotion gain), 8/30 ms fades, silences > 0.22 s inside a take are tightened to 0.12 s (TTS drags commas), faint room tone (no digital silence), warm post chain, -18 LUFS, -2 dBTP.

## What the model really supports
`exaggeration, cfg_weight, temperature, repetition_penalty, min_p, top_p`. No speed, pitch or emotion tokens; ~40 s cap per call. Sweep (`audio/experiments/sweep/results.json`, n=1 per setting vs a 4-seed noise floor): only **exaggeration** moved delivery beyond noise (0.8+ is unstable and 25% slower); cfg_weight/temperature/min_p were inside noise; `repetition_penalty` < 2 truncates. So emotional flow = exaggeration (0.5-0.75) + post tempo (ffmpeg atempo 0.92-1.25, a post edit) + gain + pauses. Do not claim more.

## Workflow
1. Write beats with intents; author `emotions` per beat; check `python audio/director.py stories/<s>/beats.json` (one row per phrase).
2. Spoken forms: `textprep.review(text)` lists unmapped Latin words; add Devanagari forms to `_EXTRA`. Digits become Hindi words. Display text is never changed.
3. `python audio/synth.py <story>` (env: `PYTHONPATH="<tts_repo>/.vendor_py:audio"`, `CHATTERBOX_MODEL_VARIANT=dedicated_hindi`, python 3.12). Output `narration/voice/{narration.wav, segments.json, meta.json, analysis.json}`; takes are cached per phrase+controls+seed so a pace nudge (`--tempo-scale 0.9-1.1`) re-assembles quickly. One heavy job at a time.
4. Measurements in `analysis.json` (LUFS, true peak, pace, pauses, clicks, pitch spread) are not a judgement of emotion: the owner listens in `/voice`.

## Measured (this repo)
See the story's `meta.json`. History: legacy raw narration -25.5 LUFS, 3.5 w/s; first directed version 2.7 w/s (too slow), which is why tempos were raised, exaggeration lowered a little and dragged silences tightened.
