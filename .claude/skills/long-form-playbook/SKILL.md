---
name: long-form-playbook
description: Structure, pacing, packaging and production plan for 6-20 minute videos (YouTube long-form, mythology deep dives, AI system-design explainers) and for turning them into Shorts. Use when planning anything longer than ~2 minutes.
---

# Long-form playbook

## Reality check
Long-form wins on **packaging (title + thumbnail -> click-through) and retention curve**, not on production gloss. A 10-minute film at our current pipeline costs: narration (Chatterbox) ~ tens of minutes of generation, render ~ 0.4 s/frame at 24 fps (about 1.5-2 h for 10 min on the M4 Pro, sequential), plus QA. **Not yet supported by the engine**: landscape 1920x1080 output, chunked/resumable rendering, multi-chapter projects (current scenes are 1080x1920 Shorts; pasted HTML scenes are the path to 16:9 once `--size` and `--resume` land - see `docs/STUDIO_GUIDE.md` "Roadmap").

## Structure (works for stories and explainers)
1. **Cold open (0-30 s)**: the most gripping moment or the question, shown not told; promise what the viewer will understand/feel by the end.
2. **Stakes + context (30-90 s)**: just enough background; no lore dump.
3. **Chapters (3-6 of them)**: each is a mini-story - question, escalation, reveal - 1.5-3 min. End each on a pull into the next ("but one detail changes everything").
4. **Re-hook every 30-60 s**: a new question, a reversal, or a payoff. Retention graphs drop at lulls; fill them.
5. **Climax (75-90%)**: the biggest reveal/decision, preceded by silence.
6. **Resolution + echo (last 30-60 s)**: pay off the cold open, one clear takeaway, a natural next-video pull. No long outro.

## Pacing and visuals
Change something visually every 3-8 s (long-form tolerates more than Shorts); alternate dense and calm chapters; use a recurring visual motif per chapter (ring formation, ocean, golden city) so viewers feel progression. Reuse the continuity doctrine across chapters: the exit vector of chapter N is the entry of N+1.

## Packaging first
Write 10 title + thumbnail concepts *before* scripting. One idea per thumbnail, 3 elements max, high contrast, a face/eye or a single striking object. Title promises a specific payoff; the first 30 s must deliver on it. A/B test thumbnails when the platform allows.

## Mythology deep dives
Chapter by source layer: (1) traditional account, (2) key regional variants, (3) interpretations - labelled. Keep `claims.json` per chapter; no invented quotes; say "in the Valmiki Ramayana" only when verified.

## AI system-design explainers
Frame as a real question ("how does an agent decide which tool to call?"); show a real architecture built up piece by piece; one honest failure case per chapter; verified numbers only.

## Long -> Shorts
One idea per Short (split, don't compress); 3-5 Shorts per long video; each re-cut with a new hook line and fresh narration pieces; link back in caption/comment.

## Production plan for the engine
- Plan chapters as separate stories (`stories/<series>-chN/`) rendered and QA'd independently, then concatenated (resume-safe; a failed chapter never costs the others).
- Reuse narration cache per beat; regenerate only edited beats.
- Render chapters one at a time (24 GB machine); run QA after each.
