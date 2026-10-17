---
name: film-direction-method
description: Direct a code-built film like a director before writing scene code - benchmark, treatment, shot list, cue map, sound table, review loop. Use at the start of every new story/film (Short or long-form), and again when a film "feels like a slideshow".
---

# Film direction method

Distilled from Lemo-Opuscar's DIRECTOR/TECHNIQUE notes (MIT, lemomo-ai/lemo-opuscar) and adapted to this studio. Judge a film in this order: **sound, rhythm, camera, directing**. Pretty frames are only the start.

## Before any code (write `stories/<name>/TREATMENT.md`)
1. **Benchmark**: pick 1-2 real works that set the bar for this topic. Write *what to learn* (composition, pacing, camera grammar, colour logic, score shape) and *what not to take* (characters, shots, melodies, logos). References teach grammar only.
2. **Three candidate structures** (single journey / before-after / countdown / list that turns), choose one and say why. The first idea is usually the cliche.
3. **Logline + arc**: one subject, one goal, one turn. Setup -> turn -> ending that echoes the opening.
4. **One native move**: something only this medium can do (rings that break around a point of light; dots that reform into the next scene). Put it at the emotional peak.
5. **Shot list**: per shot - framing (wide/medium/close/insert), angle, camera move (push/pull/pan/orbit/track), duration, and *why*.
6. **Cue map**: where every cut, key action and caption lands against narration word times (never fixed durations).
7. **Sound table**: per section - ambience bed, foley tied to actions, music state. Put it in `sound.json`.
8. **Facts**: every claim in `claims.json` (see `content-planning-research`). No ledger entry, no line in the film.

## Rules that separate film from slideshow
- Hook in the first 3 s with an *event*, not a logo or title card.
- At least **four different camera moves** and real changes of framing; one signature shot people remember.
- Vary pace: fast and slow, one acceleration, one breath (a held moment). One even speed = failed.
- **At least two real silences** (or near-silences) before the turn and the peak. The first sound after silence should matter.
- Every visible action has a sound. Use sound as transition twice (J-cut: next scene's sound arrives early; L-cut: last scene's sound runs over).
- Subject fills >= 1/3 of the frame height at key moments; readable silhouette; captions never cover the subject.
- Hold on-screen text >= (letters / 15 + 1.5) s; titles >= 4 s. Go fast with fewer words, not by cutting before people read.
- Anticipation -> action -> follow-through on every meaningful move. Never switch poses inside an `if`; blend keyframes.
- "Not the last film again": compare structure, opening, signature shot, camera path, score shape, ending with the previous film; at least four of six must differ.

## Review loop (run before sending anything)
Contact sheet (1 frame / 1-2 s), 0.2 s strips of each key action, one full-speed watch with sound. Score 1-10: hook in 2 s - readability at phone size - motion quality - variety every 2-4 s - composition - fact accuracy - sound sync. Fix everything below 8; re-render only the affected seconds. Ask a fresh reader to restate the film's message from frames alone; if they cannot, it fails.

## Red lines
No existing characters/brands/footage unless the user owns the rights; credit every third-party asset (`CREDITS`). Mythology: traditional account vs regional variant vs interpretation must be labelled; no invented scripture quotes.
