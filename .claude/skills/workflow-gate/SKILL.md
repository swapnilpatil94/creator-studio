---
name: workflow-gate
description: Mandatory stage checklist for every video (topic -> research -> story -> voice -> visuals -> render -> publish prep). Lists exactly which skills to READ at each stage and which evidence file must exist. Use at the start of every video task and before each stage; planner/gates.mjs enforces it.
---
# Workflow gate (strict)

Before each stage **Read the listed SKILL.md files in this session** (not from memory), then record them in `stories/<name>/gates.json` (`skills_read`). `node planner/gates.mjs stories/<name>` checks the record and the evidence files; the pipeline refuses to render when `story.json` has `"requireGates": true` and a gate fails.

| Stage | Read these skills | Evidence that must exist |
|---|---|---|
| 1 Topic | `outlier-topic-engine`, `content-planning-research`, `retention-psychology` | `planner/data/outliers-*.json` + `analysis-*.md` from the YouTube tool, and a decision doc (`docs/PLAN_*.md`) naming the topic and why; `story.json.topic_evidence` points to it |
| 2 Research | `mythology-research-verification` (or the AI facts rule in `content-planning-research`) | `claims.json` covering every beat; `SOURCES.md` states what was NOT opened |
| 3 Story | `storytelling`, `storytelling-hooks`, `viral-hooks`, `hook-formulas`, `narration-craft`, `anti-ai-writing` | `TREATMENT.md` (lens, last dab first, five hook options with the formula named, chosen hook); `beats.json`; `hook-lint` has no FAIL |
| 4 Voice | `chatterbox-voice-director`, `narration-craft` | `narration/voice/` (one narration: narration.wav, segments.json, meta.json with the emotion per phrase) |
| 5 Visuals | `film-direction-method`, `motion-continuity-doctrine`, `visual-direction-scene-generation`, `dot-cinema-visual-qa`, `seekable-libs-and-render-quality` | `TREATMENT.md` shot list + cue map + sound table; authored `sound.json` (>= 2 silences) |
| 6 Render | `dot-cinema-visual-qa` | pipeline gates (visual QA 0 violations, A/V QA) |
| 7 Publish prep | `titles-and-thumbnails`, `youtube-packaging`, `youtube-seo-description`, `youtube-thumbnail-design` (+ `retention-audit` after publishing) | `publish.json` from `planner/seo.mjs` (5 titles, description, <= 15 tags, query test, brand line, disclosure), thumbnails + `thumb-check.json` from `tools/thumbnail.mjs`, and a human-approved checklist in the dashboard (`publish.review.json`); the upload route refuses without it |

## After publishing
Import analytics (`planner/import-analytics.mjs`), run `planner/report.mjs`, re-run `planner/yt-outliers.mjs` weekly. Log what was learned in `docs/PLAN_*.md`.

## Honesty
Skills are guidance a model must actually read; the gate checks for the record and the files, it cannot check that the reading changed the work. Review the story against the skills' own checklists (`storytelling` audit mode, `film-direction-method` review loop) before rendering.
