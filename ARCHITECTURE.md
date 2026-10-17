# creator-studio — Architecture

Unified dual-channel AI video production studio for two Instagram Reels / YouTube
Shorts channels:

- **KATHAAYA** — cinematic Indian mythology storytelling (parchment, black ink, gold/red accents).
- **Agentic AI** — practical AI agents, tools, startups, experiments (dark field, dotted/particle
  motion graphics, editorial type — codenamed "Yantralok" in the source engine).

One shared rendering engine, two independent creative/content directions. This document reflects
what was actually found by inspecting the source projects on 2026-10-17, not an assumed clean-room
design. See [`MIGRATION_INVENTORY.md`](MIGRATION_INVENTORY.md) for the file-by-file reuse decision.

## 0. What already exists (source-of-truth inspection)

Three separate systems were found across two repositories on this machine. Nothing here is
inferred from documentation alone — commands were run, tests were executed, and output videos
were decoded to confirm actual behavior.

| # | System | Repo / path | Stack | Status found |
|---|---|---|---|---|
| A | **Kathaaya Studio (Blender engine)** | `swapnilpatil94/infographics-motion`, `engine/`, `kathaya/`, `studio.py` | Python 3.12, Blender 5.2.2 LTS (bpy), FFmpeg | Mature, 286 pytest tests collected (3 collection errors are expected — they `import bpy`, which only exists inside Blender's own interpreter, not the venv). Heavy (Blender required), not JS/TS. |
| B | **technical-data-cinema** | same repo, `modes/technical-data-cinema/` | Node.js 22+, Playwright/Chromium, esbuild, three.js, Ollama (local LLMs) | **Selected as the engine foundation.** Deterministic render contract (`window.renderAt(seconds)`, `window.getDuration()`), 1080×1920 H.264/AAC export, visual QA (frozen-ending detection, visual-density audit, deterministic-seek verification). Lightweight test suites (`test:export-compat`, `test:scene-compat`, `test:narration-text`) ran clean. Already has staged local UI (`npm run ui`, port 4177). Its own README flags that full scene-quality / Chatterbox-sync validation has **not** been freshly re-run on this machine — treat as unverified until a real end-to-end render is produced. |
| C | **mythic-video-studio** (sibling repo) | `~/mythic-video-studio` (separate git repo, not a subfolder of A/B) | React/TypeScript, **Remotion** | Earlier/parallel engine using Remotion for compositing, with a TTS-provider abstraction (`src/pipeline/tts-provider.ts`) supporting both Chatterbox and VibeVoice Hindi 7B. **Not selected as the primary engine** (decision below), but it is the actual physical home of `tools/chatterbox_tts.py`'s reference voice (`assets/reference-voices/hindi-male-narrator.wav`) that both A and B depend on at runtime via a relative path (`~/mythic-video-studio/...`). This cross-repo coupling must be resolved during migration (vendor the voice asset + narration tool into creator-studio, see inventory). |

**Engine decision:** the brief requires "one shared JavaScript/TypeScript animation and
video-rendering engine." System B (`technical-data-cinema`) is already JS/TS-first, already
produces working prototypes that closely match **both** target channel identities (verified by
decoding actual rendered frames, not just reading docs — see inventory), and already treats
Chatterbox as an external adapter rather than reinventing narration. System A (Blender/Python) is
left untouched as a legacy, independently-maintained project — not deleted, not force-merged in.
System C is noted for its TTS-provider abstraction (multi-backend narration) as a possible future
reference, but is not pulled in wholesale.

## 1. Repository layout

```
creator-studio/
  ARCHITECTURE.md                 this file
  MIGRATION_INVENTORY.md          what was reused / modified / left behind, and why
  engine/                         the shared JS/TS scene-rendering engine (extracted from
                                   infographics-motion/modes/technical-data-cinema)
    scripts/                      generate.mjs, render.mjs, export.mjs, ui-server.mjs, doctor.mjs
    lib/                          scene-contract, plan-compiler, determinism helpers
    prompts/                      visual-planner.md, visual-director.md (generic, channel-neutral)
  channels/
    kathaaya/
      identity.json                palette, type, motion-language tokens (parchment/ink/gold/red)
      prompts/                     mythology-specific planner/director prompt overlays
      research/                    traditional-vs-regional-variant verification workflow
      narration-presets.json       Chatterbox settings tuned for Hindi mythology narration
    agentic-ai/
      identity.json                palette, type, motion-language tokens (near-black/dotted/accent)
      prompts/                     tech-explainer planner/director prompt overlays
      research/                    product-capability / benchmark verification workflow
      narration-presets.json       Chatterbox settings tuned for conversational tech narration
  narration/
    chatterbox/                    vendored tools/chatterbox_tts.py + whisper_align.py (from
                                    infographics-motion), reference voice assets (from
                                    mythic-video-studio), license/attribution preserved
  reference-analysis/              Reference-Reel intelligence workflow (new — see §6)
    cache/                         per-reference analysis cache (contact sheets, profile JSON)
  studio-ui/                       extended version of technical-data-cinema's ui-server.mjs:
                                    channel selector, planner, timeline, render/QC, analytics
  analytics/                       CSV import + (where authorized) platform API pull, dashboards
  .claude/skills/                  project-level Claude Code skills (see §8)
  tests/                           scene-manifest validation, determinism, a/v sync, e2e
  docs/
    adr/                           architecture decision records for anything this doc defers
```

Nothing is copied yet beyond this scaffold. Each subsystem above is extracted in its own
reviewable step per the migration inventory, run through its existing tests after the move, and
only then wired into the channel configs.

## 2. The engine (shared, channel-neutral)

Reused from `technical-data-cinema` almost as-is, generalized to take a **channel config** instead
of hard-coded defaults:

- **Rendering**: Playwright drives headless Chromium against a self-contained HTML/CSS/JS scene;
  `window.renderAt(seconds)` + `window.getDuration()` is the contract a scene must implement for
  deterministic, seekable, frame-accurate export. No `Math.random()`, no wall-clock timing — this
  is already enforced by the existing `scene-contract` / `scene-compat` tests, which were run and
  pass.
- **Scene generation**: a local-LLM visual planner (beat-level `visual-plan.json`) followed by a
  local-LLM scene coder (HTML/CSS/JS), run sequentially so only one model is resident on the 24GB
  M4 Pro at a time. The planner/coder prompt pair becomes channel-aware: the generic prompt in
  `engine/prompts/` is composed with `channels/<channel>/prompts/*.md` before being sent to Ollama.
- **Export**: FFmpeg encodes 1080×1920 H.264/AAC at a configurable frame rate; visual QA already
  includes frozen-ending detection, a canvas visual-density audit, and deterministic-seek
  verification before a render is accepted.
- **Reusable primitives**: existing scene-compat/plan-compiler code is kept; channel-specific
  "look" (palette, dotted-reveal vs parchment-ink, camera language) is expressed as data
  (`identity.json`) consumed by the prompt composer and by shared CSS/JS primitives, not as
  per-channel forks of the renderer.

## 3. The scene manifest contract

The contract already implicit in `technical-data-cinema` (visual-plan.json + narration
segments.json + the render-only query flag) is made explicit and versioned:

```
ScriptDraft → NarrationTimeline (segments, word timestamps where available)
            → VisualPlan (beats: what, where, emotion, camera, duration per beat)
            → SceneSource (generated HTML/CSS/JS implementing window.renderAt/getDuration)
            → RenderManifest (channel id, fps, resolution, audio offset, QC thresholds)
            → final.mp4 + QC report
```

Each stage is independently regenerable and cacheable by content hash, matching the existing
"don't regenerate successful stages unnecessarily" behavior already present in the Studio
(`output/kathaya/llm_cache`, fingerprint-checked cached scenes). Narration duration and (where
produced by whisperx) word-level timestamps drive beat durations — beats are never assigned
arbitrary fixed lengths.

## 4. Narration (reused, not reimplemented)

`tools/chatterbox_tts.py` is vendored into `narration/chatterbox/` unchanged in behavior
(voice-cloned Chatterbox Multilingual, dedicated Hindi T3 checkpoint already downloaded locally at
`models/chatterbox-hindi/t3_hi.safetensors`, 2.1GB). The reference voice WAV currently lives in the
sibling `mythic-video-studio` repo and is copied in with attribution preserved
(`mythic-video-studio/CREDITS.md` names "getByteRush" as the project; no third-party license file
was found in either source repo, so there are no external license terms to carry forward beyond
that attribution). `whisper_align.py` (WhisperX forced alignment) comes along for word-level
timestamps. The engine calls this exactly as `technical-data-cinema` already does today: a
subprocess job, not an HTTP dependency baked into render-time control flow, so TTS and rendering
can be iterated on independently per point 4 of the brief.

## 5. Channel systems

Both channels share the engine and narration pipeline; everything else is config + prompts +
research workflow:

- **KATHAAYA**: `identity.json` encodes the parchment/black-ink/gold-red palette and dotted/ink
  progressive-reveal motion language already proven in `output/draupadi-question11/final.mp4`.
  Research workflow distinguishes traditional accounts from regional variants and disputed
  interpretations (no invented scripture quotes, no silent "most likely" framing presented as
  fact).
- **Agentic AI**: `identity.json` encodes the near-black/dotted-particle/editorial-type language
  already proven in `output/visual-director-benchmark.mp4` ("Yantralok" in the source docs).
  Research workflow verifies product claims, pricing, and benchmark figures before they're narrated.

## 6. Reference-Reel intelligence (new)

Not previously built — `modes/technical-data-cinema/reference-video-what-are-we-trying-to-build-the-same.mp4`
(512×1108, 30fps, 55.0s, confirmed by `ffprobe`) exists as raw input but has no analysis pipeline
yet. `reference-analysis/` adds:

- FFmpeg-based scene-boundary detection + contact-sheet generation.
- Shot-duration/pacing, camera-movement, typography/mask/transition, and color/contrast extraction.
- A cached, versioned **reference profile** (JSON) of actionable implementation rules, re-run only
  when the source video or profile schema changes.
- Explicit non-goal: the profile captures transferable technique, never raw footage, captions, or
  shot sequences to copy.

## 7. Studio UI

Extends `technical-data-cinema`'s existing `ui-server.mjs` (staged analysis → scene → render → QC
workflow, already live at `:4177`) rather than rebuilding a UI from zero: add a channel selector,
daily content planner, reference/asset manager, and an analytics/publishing-checklist panel on top
of the existing render-log and QC-report views. The Kathaaya Blender Studio's Flask UI
(`studio.py --ui`, port 8765) is left running independently for system A and is not merged into
this UI.

## 8. Claude Code skills

`.claude/skills/` ships one skill per workflow named in the brief (reference analysis, channel
strategy, mythology research, AI/tech research, hook/story architecture, narration production,
visual direction, engine development, A/V sync + rendering, QA/recovery, publishing prep,
analytics review) — each concise, pointing at the relevant doc/script rather than duplicating
instructions inline.

## 9. Deferred to later sessions (explicitly out of scope for this pass)

- Actual code extraction/porting from `infographics-motion` and `mythic-video-studio` into the
  folders above (this pass creates the repo + this documentation only).
- A live end-to-end reproduction render (the user chose "repo + architecture doc first" over
  "reproduce pipeline first" for this session — flagged here so it isn't silently skipped).
- Analytics platform API wiring (CSV import first, per the brief).
- Scaling past one sample video per channel.
