# engine

Shared JS/TS scene-rendering engine, extracted from
`infographics-motion/modes/technical-data-cinema/` (see `../MIGRATION_INVENTORY.md`). Node 22+,
Playwright/Chromium for deterministic capture, esbuild only where a scene needs bundling
(three.js scenes), FFmpeg for encoding.

## What's here
- `scripts/` — `render.mjs` (the renderer + QC: determinism check, visual-density audit, frozen-
  ending check, offline-only enforcement), `export.mjs`/`export-compat.mjs` (narration + final
  MP4), `generate.mjs`/`ollama-session.mjs`/`visual-plan.mjs` (local-LLM scene planning/coding,
  not yet exercised in this repo), `ui-server.mjs`/`ui.html` (staged production UI, not yet
  adapted for a channel selector — see `../studio-ui/README.md`), `doctor.mjs` (setup check),
  `fallback-scene.mjs` (deterministic SVG fallback for repair failures), the `test-*.mjs` suites.
- `examples/` — reference scene implementations: `visual-director-benchmark.html` (Three.js,
  requires bundling via `scripts/build-visual-benchmark.mjs`), `agentic-fanout-demo.html` (pure
  Canvas2D, no bundling needed — the current reference implementation for the dashed/dotted
  "system-design explainer" visual family; see `.claude/skills/visual-direction-scene-generation/`),
  `dotted-character-reveal.html` (ink/parchment reveal technique for Kathaaya).
- `prompts/` — generic (channel-neutral) visual-planner/visual-director prompts for the Ollama
  scene generator. Not yet composed with `channels/*/prompts/` overlays (that composition step
  doesn't exist yet).

## Verified this session
```bash
cd engine && npm install
node scripts/test-export-compat.mjs    # pass
node scripts/test-scene-compat.mjs     # pass
node scripts/test-narration-text.mjs   # pass
node scripts/render.mjs --html examples/agentic-fanout-demo.html --out output/demo.mp4 --fps 24
# -> determinism check passed, visual density audit 5/6, 1080x1920 24fps 26s MP4 produced
```
A copy of that render is committed at `../docs/demo/agentic-fanout-demo.mp4` as evidence — not
regenerated automatically, re-run the command above if the scene changes.

## Not yet done
- Narration (`narration/`) is not wired up — no render in this repo has had Chatterbox audio yet.
- The LLM scene planner/generator (`generate.mjs`) has not been run in this repo; the only scene
  content so far is hand-written (`agentic-fanout-demo.html`).
- The channel-aware prompt composition described in `../ARCHITECTURE.md` §2 doesn't exist yet.
