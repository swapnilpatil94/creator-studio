---
name: retention-psychology
description: Evidence-graded attention, retention and sharing principles (psychology / neuromarketing) turned into a concrete checklist for hooks, pacing, visuals, sound and endings, plus an experiment protocol. Use when writing a script or hook, planning pacing for a Short or long video, or when someone claims a "brain hack" for views.
---

# Retention psychology (honest version)

Craft skills that apply these principles: `narration-craft` (start there), `storytelling-hooks`, `viral-hooks`, `storytelling`, `hook-formulas`.

**No technique guarantees millions of views.** Reach is heavy-tailed: a few videos get most views, and you cannot predict which. What you can control is *retention, shares, topic-audience fit and packaging*, and you improve them by shipping many videos and measuring. Everything below is a hypothesis to test with `planner/` data, not a promise.

## Principles, graded by evidence
| Principle | Support | How we use it |
|---|---|---|
| **Orienting response / habituation**: sudden onset, motion and contrast capture attention; repeated stimuli stop working | Strong (basic attention research) | A visual *event* in the first 0.5 s; something new every 2-4 s; vary the kind of change, not just the amount |
| **Isolation (von Restorff)**: the distinctive item is noticed and remembered | Strong | One accent colour/element per beat (the point of light, the gold crown, the one amber word in the caption) |
| **Faces and eyes** attract gaze | Strong | Where a character appears, put the eye/gaze at the focal point; our eye-glow ignition is deliberate |
| **Information gap / curiosity** (Loewenstein 1994) | Moderate-strong | Ask a specific question or state a surprising claim in line 1; give partial answers; pay off later. Never bait without payoff - mismatch kills retention and trust |
| **Peak-end rule** (Kahneman et al.): memory/judgement dominated by the peak and the end | Strong for retrospective evaluation | Engineer ONE peak at ~70-85% and an ending that pays off and echoes the opening |
| **Narrative transportation** (Green & Brock 2000): immersion drives engagement; jarring errors break it | Moderate-strong | One continuous camera feel (see `motion-continuity-doctrine`), no factual slips, no tonal breaks |
| **High-arousal emotion drives sharing** (Berger & Milkman 2012): awe, anger, anxiety share more than sadness | Moderate (one corpus) | Mythology = awe (scale, power, sacrifice); AI = surprise and usefulness. Practical value also shares ("save this") |
| **Multimedia learning** (Mayer): remove decoration that carries no meaning, signal what matters, segment, avoid redundant text | Strong in education research | Explainers: one idea per beat, captions mirror speech (needed for muted viewers) but no extra paragraphs on screen |
| **Expectation violation + silence**: a gap before an impact raises its impact | Moderate | Two real silences before the turn and the peak (`film-direction-method`) |
| **Reading load**: ~17 characters/second is a standard subtitle ceiling | Standard practice | Caption pacing in `seekable-libs-and-render-quality` |
| Zeigarnik "unfinished tasks stick" | **Weak / replication problems** | Do not cite it; use plain suspense instead |
| "A dopamine hit every N seconds" | **Not demonstrated** | Ignore; variety is justified by habituation, not dopamine folklore |
| Colour psychology ("red = urgency") | Small, context dependent | Use contrast and salience, not colour meaning |
| EEG/fMRI "predicts virality" | Small studies, modest effects, impractical | Use your own retention graphs instead |
| Platform ranking | Platforms say they weigh watch time/viewed-vs-swiped, shares/sends and likes per reach - **verify current statements** | Optimise retention and shares, not vanity metrics |

## Script and film checklist (`planner/hook-lint.mjs` automates the measurable parts)
1. **0-3 s hook**: event in first 0.5 s (motion/contrast + sound hit); line 1 <= 12 words; states a specific question, conflict or surprising fact; no greeting, no "in this video".
2. **3-10 s**: stakes + promise; first mini-payoff by ~8 s.
3. **Middle**: new visual information every 2-4 s; a re-hook line near 40-60% ("But the real problem was...").
4. **Peak** at ~70-85%, preceded by silence; the visual payoff the audience has been waiting for.
5. **Ending**: payoff + echo of the opening image/line so it loops cleanly; ask for a share only if it is natural ("send this to someone who...").
6. **Packaging**: specific nouns, a curiosity the video truly answers, no deception. Title/caption and first frame must promise the same thing the film delivers.
7. **Length**: let the story set it. Shorts ~20-45 s is a common sweet spot, not a rule; long-form see `long-form-playbook`.

## Channel angles
- **Kathaaya**: moral dilemmas and "why did X choose Y?" hooks, scale/awe visuals, restraint with variants (label traditional vs regional). Respect religious sensitivities; never invent scripture.
- **Agentic AI**: a concrete verified outcome up front, a real demo, an honest limitation (trust is what earns follows). No fabricated benchmarks.

## Experiment protocol
Change one variable per batch (hook type, length, opening image, sound design, caption style). >= 8-10 videos per arm before concluding anything. Track: 3-second hold, average % viewed, shares per reach, follows per reach. Report differences with uncertainty; correlation is not causation (topic and posting time confound everything). Log decisions in `planner/` so the next plan uses the evidence.

## Do not
Fake countdowns, bait-and-switch titles, rage-bait, misleading thumbnails, or repost others' content - platforms demote them and they burn trust.
