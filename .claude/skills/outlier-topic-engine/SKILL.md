---
name: outlier-topic-engine
description: Use when choosing the next KATHAAYA (mythology) or Agentic AI video topic from real competitor breakout videos — parses supplied transcripts/metadata for the core curiosity gap, scores candidate topics, and outputs titles, a production brief and visual directives for the HTML pipeline. Adapted from a user-supplied ideator prompt with verification gates added.
---
# Outlier topic engine

Adapted from the pasted "Outlier Topic Engine" prompt. Keeps its useful core (research parsing → scoring → multi-format output); fixes what would have produced bad or unverifiable output. See also `content-planning-research` (data sources), `hook-formulas`, `titles-and-thumbnails`, `narration-craft`.

## Phase 1 — Parse real inputs only
- Input must be what the user supplies or what you fetched this session: 3–5 competitor transcripts/metadata with **their real view counts and channel median** (outlier ratio = views ÷ channel median; compute it, never estimate or invent it). No inputs → say so and ask; do not make up competitors.
- Strip catchphrases, sponsor reads, intro/outro padding. State the **core curiosity gap** of each video in one sentence, quoting the transcript line it came from.
- Find the pattern shared across winners (question type, stakes, character, moral tension), not one video to copy. Never reuse another creator's script, structure beat-for-beat, or thumbnail.

## Phase 2 — Score (evidence-tagged)
Score each candidate 1–10 on: **audience pull** (will the Hindu-mythology/Agentic-AI audience click), **comment friction** (moral grey zone/debate), **visual canvas** (works in dot-cinema/HTML scenes), **source strength** (mythology: can you cite a primary text/edition for each claim; AI: official docs/papers), **hook-in-3-seconds**. Each score needs a one-line reason. The scores are your judgement, not data: label them so and do not present 8.5 as a measured threshold. Shortlist ≥8.5 average **and** source strength ≥7; if nothing passes, say so.

## Phase 3 — Output for the winner
1. 5 title variants (CTR + curiosity, no false promise; check `titles-and-thumbnails`).
2. Production brief: logline, hook line (first 3 s), beat list with intent per beat (`hook/tense/awe/punch/reflective…`, see `chatterbox-voice-director`), runtime target, claims to verify → write `claims.json` (mythology needs it before render).
3. Visual directives: per-beat scene ideas for the HTML contract (`docs/SCENE_CONTRACT.md`).
**Do not output subtitle timing arrays here:** timings only exist after narration is generated and aligned (`narration/*.segments.json`).

## Gates
Mythology: verify against cited sources and mark variant traditions ("in the Valmiki Ramayana…" vs regional retellings). Never present folk versions as canon. Nothing publishes without the user's go.
