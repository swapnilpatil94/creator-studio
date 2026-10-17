# Migration Inventory

Snapshot taken 2026-10-17 by direct inspection (directory listings, file reads, `ffprobe` on
actual output videos, and live execution of the lightweight test suites) of:

- `swapnilpatil94/infographics-motion`, local clone `~/infographics animations`,
  branch `feat/visual-engine-v1`
- `~/mythic-video-studio` (separate git repo, no remote verified in this pass)

Status legend: **REUSE** (move/vendor as-is or near-as-is) · **REUSE-ADAPT** (move, then
generalize for channel config) · **REFERENCE-ONLY** (inspected, informs design, not copied)
**LEAVE** (preserved in place, not migrated) · **NEW** (does not exist yet, to be built).

## Engine (from `infographics-motion/modes/technical-data-cinema/`)

| Component | Path | Status | Notes |
|---|---|---|---|
| Scene renderer | `scripts/render.mjs` | REUSE | Playwright/Chromium deterministic capture. |
| Scene generator | `scripts/generate.mjs`, `scripts/ollama-session.mjs` | REUSE-ADAPT | Add channel-aware prompt composition. |
| Visual planner | `scripts/visual-plan.mjs`, `prompts/visual-planner.md` | REUSE-ADAPT | Prompt becomes generic + channel overlay. |
| Visual director prompt | `prompts/visual-director.md` | REUSE-ADAPT | Same. |
| Export pipeline | `scripts/export.mjs`, `scripts/export-compat.mjs` | REUSE | 1080×1920 H.264/AAC, audio offset control already present. |
| Scene contract/compat | `scripts/scene-contract.mjs`, `scripts/scene-compat.mjs` | REUSE | Verified live: `npm run test:scene-contract`-equivalent (`test-export-compat.mjs`) and `test-scene-compat.mjs` both passed in this session. |
| Plan compiler | `scripts/visual-plan.mjs` + `scripts/test-plan-compiler.mjs` | REUSE | |
| Fallback scene system | `scripts/fallback-scene.mjs` | REUSE | Deterministic SVG fallback for repair failures; explicitly logged, not silent. |
| UI server | `scripts/ui-server.mjs`, `scripts/ui.html` | REUSE-ADAPT | Becomes `studio-ui/`; add channel selector + analytics panel. |
| Doctor/setup check | `scripts/doctor.mjs` | REUSE | |
| Narration text normalization | `scripts/narration-text.mjs` | REUSE | Verified live: `test-narration-text.mjs` passed. |
| Three.js benchmark scene | `scripts/build-visual-benchmark.mjs`, `output/visual-director-benchmark.mp4` | REFERENCE-ONLY | Confirmed by decoding a real frame — this is the closest existing match to the Agentic AI ("Yantralok") visual identity; used as the seed for `channels/agentic-ai/identity.json`, not copied verbatim. |
| Draupadi dotted-ink output | `output/draupadi-question11/` (`final.mp4`, `visual-plan.json`, `story.md`) | REFERENCE-ONLY | Confirmed by decoding a real frame — closest existing match to the KATHAAYA parchment/ink/gold identity; used to seed `channels/kathaaya/identity.json` and as a worked example of the scene-manifest shape. |
| `package.json` deps | playwright ^1.63, esbuild ^0.25, three ^0.180 | REUSE | Carried forward as-is; re-pin versions at actual migration time rather than assuming these stay current. |
| Reference pattern video | `reference-video-what-are-we-trying-to-build-the-same.mp4` | REUSE | Copied into `reference-analysis/`; confirmed via `ffprobe`: 512×1108, h264/aac, 30fps, 55.0s. No analysis has been run on it yet — do not claim otherwise. |

## Narration (cross-repo today)

| Component | Path | Status | Notes |
|---|---|---|---|
| Chatterbox TTS adapter | `infographics-motion/tools/chatterbox_tts.py` | REUSE-ADAPT | Vendor into `narration/chatterbox/`; update the hard-coded `~/mythic-video-studio` path to a local repo-relative path. |
| Forced alignment | `infographics-motion/tools/whisper_align.py` | REUSE | Not yet opened in detail this pass — read before vendoring. |
| Dedicated Hindi checkpoint | `infographics-motion/models/chatterbox-hindi/t3_hi.safetensors` (2.1GB) | REUSE | Large binary — vendor via git-lfs or a documented download step, not a raw commit. |
| Reference voice WAV | `mythic-video-studio/assets/reference-voices/hindi-male-narrator.wav` | REUSE | Currently the *only* copy found; must be copied in, not just referenced, to remove the cross-repo coupling. Attribution: `mythic-video-studio/CREDITS.md` credits "getByteRush" as the project; no separate third-party license file exists in either source repo. |
| Alternate TTS provider abstraction | `mythic-video-studio/src/pipeline/tts-provider.ts` (Chatterbox + VibeVoice Hindi 7B) | REFERENCE-ONLY | Not adopted now (engine choice is `technical-data-cinema`'s direct subprocess-job approach); worth revisiting if multi-backend narration becomes a requirement. |

## Left behind (not migrated)

| Component | Path | Status | Notes |
|---|---|---|---|
| Blender/Python Kathaaya engine | `infographics-motion/engine/`, `kathaya/`, `studio.py` | LEAVE | 286 pytest tests collected (3 expected collection errors: `gp_gaze_test.py`, `rigify_ik_test.py` import `bpy`, Blender's embedded interpreter — not failures, just not runnable outside Blender). Not JS/TS, not merged per the brief's explicit single-engine requirement. Repository and branches untouched. |
| mythic-video-studio Remotion engine | `~/mythic-video-studio/src/` | LEAVE | Earlier/parallel React+Remotion engine. Not selected as the base engine for this pass; its TTS-provider abstraction is noted above as reference-only. |
| `.venv` in infographics-motion | `infographics-motion/.venv` | — | Only 34MB on disk despite `requirements.txt` listing torch/numpy/opencv/etc. — likely not the environment actually used for Chatterbox (probably a lighter venv, with heavier deps resolved elsewhere, e.g. `.vendor_py/` mentioned in the README for a scipy wheel workaround). Flagged, not resolved — verify before assuming `.venv/bin/python` is sufficient to run narration. |

## New (nothing existed, to be built)

| Component | Status | Notes |
|---|---|---|
| `.claude/skills/*` | NEW | `infographics-motion/.claude/` has no `skills/` subdirectory today — confirmed by directory listing. |
| Reference-Reel analysis pipeline | NEW | The reference video exists; the analysis workflow (contact sheets, pacing/shot-boundary extraction, cached reference profile) does not. |
| Channel config system (`channels/*/identity.json`) | NEW | Seeded from the two reference-only outputs above, but the structured, documented config format itself is new. |
| Analytics / CSV import / dashboard | NEW | No analytics code found in either source repo. |
| Publishing-metadata prep | NEW | |

## Open questions for the next session (flagged, not decided here)

1. `whisper_align.py` has not been read in detail — needed before finalizing the narration
   vendoring step.
2. The `.venv` size mismatch above should be resolved before relying on it for any real Chatterbox
   run.
3. No live end-to-end reproduction has been run yet in this pass (deferred per the session-1 scope
   decision — see `ARCHITECTURE.md` §9). The "scene quality / Chatterbox sync not yet validated"
   warning in the source README should be treated as still open until that reproduction happens.
