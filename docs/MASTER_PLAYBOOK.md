# Master playbook (read this before choosing the next topic or the next piece of work)

One file that ties together every skill, tool, standard and finding so far. If something here conflicts with a skill file, the skill file wins for details; this file wins for *what to do next and in what order*. Update it whenever a decision or a measured fact changes.

## 1. The pipeline and where each thing lives
| Stage | Do this | Tools | Skills to load | Gate (must pass) |
|---|---|---|---|---|
| 1 Choose topic | score backlog with real analytics; one exploration slot | `planner/import-analytics`, `report`, `plan` | `content-planning-research`, `channel-formula`, `retention-audit`, `retention-psychology` | topic has a claims ledger >= 80% sourced |
| 2 Research | traditional vs variant vs interpretation (myth); verified-on-the-day facts (AI) | `planner/claims-check`, `stories/<n>/claims.json` | `content-planning-research` | every beat has a ledger entry; `needs_check` cleared before publishing |
| 3 Direct | benchmark, treatment, shot list, cue map, sound table | - | `film-direction-method`, `motion-continuity-doctrine`, `long-form-playbook` (>2 min) | TREATMENT.md exists; 4+ camera moves; 2 real silences |
| 4 Write | lens, last line first, but/therefore, rhythm, 3 hook layers | `planner/hook-lint` | `narration-craft`, `hook-formulas`, `storytelling-hooks`, `viral-hooks`, `storytelling`, `anti-ai-writing`, `titles-and-thumbnails` | hook >= 72, no and-then chain, rate <= 4.0 w/s |
| 5 Voice | Chatterbox narration + word timings; (voice director, see section 6) | `tools/tts_beats.py` via studio, `studio-ui` | `narration-craft`, `chatterbox-voice-director` | aligned timing, ASR round-trip, level/clipping checks |
| 6 Visuals | SDK scene (`stories/<n>/scene.js`) or pasted AI HTML | `engine/dot-cinema/*`, `studio-ui`, `docs/SCENE_PROMPT.md` | `visual-direction-scene-generation`, `dot-cinema-visual-qa`, `seekable-libs-and-render-quality`, `gsap-*` | validate + visual QA (auto-repair) |
| 7 Sound | procedural bed, cues, ducked mix | `engine/dot-cinema/sound.mjs`, `mix.mjs`, `autocues.mjs` | `film-direction-method` (sound table) | -16 LUFS (target -14 for social), peak <= -1.5, voice >= 12 dB over bed |
| 8 Render + QA | resumable render, contact sheet review | `engine/dot-cinema/pipeline.mjs`, `qa.mjs` | `dot-cinema-visual-qa`, `creator-studio-operator` | 13 A/V checks; you read the contact sheet |
| 9 Publish + learn | titles/thumbnails, metadata, import analytics, one-variable experiments | `planner/*` | `titles-and-thumbnails`, `retention-psychology` | next week's plan uses the data |

## 2. How to choose the next topic (decision rules)
1. Run `planner/report` first if there is data; otherwise pick by the channel's strongest lens (below) and plan an experiment.
2. A topic enters production only if: the story has a *turn* (decision, reversal, reveal), a visual that works in dots/light/formation (avoid long face close-ups and anatomy), and sources you can cite.
3. Prefer stories whose hero can be a formation, a point of light, a silhouette or an environment (Abhimanyu rings worked; Hanuman anatomy stayed the weakest part).
4. Each batch changes ONE variable (hook formula, length, opening image, sound, caption style) over 8-10 videos before concluding anything.
5. KATHAAYA: moral dilemmas and "why did X choose Y?"; awe via scale; label variants. Agentic AI: one verified outcome first, a real demo, one honest limitation; no invented numbers.

## 3. Measured facts (do not re-derive; update if they change)
- Our Chatterbox Hindi voice: **3.25-3.5 words/s (~200 wpm), ~13 chars/s**; > 4.0 w/s sounds rushed (Hanuman last beat 4.7). `…` = ~0.35-0.45 s hesitation; beat boundaries add 0.6-1.2 s.
- Render: ~4 fps on the M4 Pro with `--gpu` (a 36 s film ~6 min); SwiftShader is ~10x slower and only for WebGL.
- Film footprint: 1080x1920, 24 fps, masters ~85 MB, 720p shares ~18 MB.
- Mix: ~-16 LUFS, true peak -1.5 dBFS, voice >= 16 dB over the bed on both films.
- Hook lint on shipped scripts: Hanuman hook 44/100 (descriptive opener), Abhimanyu 57/100 (no viewer/hero address). Both films' citations are still `needs_check`.

## 4. Evidence discipline (from `retention-psychology`)
Strong: orienting response/habituation, isolation effect, peak-end rule, faces/eyes. Moderate: curiosity gap, narrative transportation, high-arousal sharing, multimedia principles. Weak/myth: Zeigarnik as a hack, "dopamine every N seconds", colour meaning, EEG virality. No technique guarantees views; distribution is heavy-tailed. Never publish bait without payoff.

## 5. Decisions already made (and why)
- **Engine**: our own HTML/canvas deterministic renderer (`renderAt(t)`) on Playwright + FFmpeg, extracted from `infographics-motion/technical-data-cinema`; the Blender engine is left untouched; Remotion/HyperFrames are references only (see `docs/THIRD_PARTY.md`).
- **Look**: white/ice dots on black + one warm accent; characters via silhouette + rim light, not anatomy.
- **Any-model HTML**: strict prompt + runtime shim (seeded random, scene-time clock, disabled rAF/timers/CSS animation, auto-fit, caption overlay) + validator + generic QA. Proven on adversarial samples we wrote; **not yet tested on real GPT/Gemini output**.
- **QA philosophy**: gates measure (geometry, exposure, legibility, loudness, sync) and auto-repair what is parametric; they never replace reading the frames. A failing QA rule gets fixed (the check or the scene), never silenced.
- **Third-party skills**: install only after reading and scanning; distill instead of copying when the source carries someone else's brand rules or promotion.

## 6. Roadmap in priority order
1. **Voice director** (in progress): Chatterbox delivery intents, text prep, post-processing, analysis, A/B in the Studio. Skill: `chatterbox-voice-director`.
2. Verify mythology citations against the texts; rewrite/regenerate Hanuman hook + last beat per the lint.
3. Test the paste-any-HTML flow with real GPT/Gemini/Claude outputs; tune `docs/SCENE_PROMPT.md` from failures.
4. Long-form (16:9, chapters): `--size` through render/shim/validate/QA; chapter projects. Resumable render already exists.
5. Motion blur (adaptive sub-frames), loudness to -14 LUFS for social.
6. Official analytics APIs (OAuth), publishing metadata prep.

## 7. Command cheat sheet
```bash
node studio-ui/server.mjs                                   # http://127.0.0.1:4180
node engine/dot-cinema/pipeline.mjs stories/<name>          # build -> QA -> sound -> render -> QA -> share
node planner/hook-lint.mjs stories/<name>                   # script checks
node planner/claims-check.mjs stories/<name>                # ledger check
node planner/report.mjs && node planner/plan.mjs            # data-driven plan
node tests/studio-e2e.mjs /tmp                              # UI test (real Chromium)
```

## 8. Honesty rules
Never claim a test, render, citation or quality improvement that was not verified. Measured proxies (F0 range, loudness, ASR accuracy) are not "emotional quality"; say what was measured. No guaranteed-views language. Credit third-party ideas; keep licences.


## Audio (voice director) — added
See `.claude/skills/chatterbox-voice-director/SKILL.md`. Code in `audio/`, UI at Studio `/voice`. Verified: only `exaggeration` is a reliable expressive control; director adds text prep, designed pauses, loudness consistency (-18 LUFS), A/B measurement. Not proven: emotional-quality gain. Open: directed pace is ~20% slower than legacy; tune `--tempo`/pauses by ear.

## Update 2026-10-17: strict workflow + real data
- Topic decisions come from the YouTube Data API (`planner/yt-outliers.mjs` + `yt-analyze.mjs`), recorded in `docs/PLAN_<date>.md`.
- Every video follows `.claude/skills/workflow-gate`; `planner/gates.mjs` + `"requireGates": true` make the pipeline refuse to build without topic evidence, claims, TREATMENT, authored sound with >= 2 silences, hook lint and recorded skill reads.
- A/V QA exempts silences declared in `sound.json` (they are measured, not hidden); `sound.mjs` honours `silences`.
- First film through the strict path: `stories/mahishasura-mardini` (Durga's birth).

## Update 2026-10-17 (later): one narration, emotional flow
Voice is now a single narration per film (`audio/synth.py`, phrase-level emotions in `beats.json`, auto-validated takes). Variants, candidate takes and the pick/assemble UI were removed.
