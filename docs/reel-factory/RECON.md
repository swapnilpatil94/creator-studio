# Reel Factory: P0 recon (2026-10-24)

Branch: `feat/reel-factory`. Status: **recon only; no feature code written, nothing downloaded.**

## 0. Two things that differ from the prompt (need your decision)

1. **Branch base.** The prompt says "from the default branch". `main` is **73 commits behind** `feature/stipple-engine` (0 ahead) and lacks the current Hub, voice and cinema work this tab must reuse. I branched `feat/reel-factory` from `feature/stipple-engine` instead. Say so if you want it rebuilt on `main`.
2. **Disk: 27 GB free of 460 GB (94% full).** The prompt budgets 30-45 GB for models. That does not fit. Ollama already holds 64 GB, DrawThingsModels 17 GB, ComfyUI 13 GB. Section 4 proposes a ~9 GB plan that reuses what is installed.

## 1. What exists on this Mac

| Area | Found | Notes |
|---|---|---|
| OS / RAM | macOS, 24 GB unified, `iogpu.wired_limit_mb = 0` (default) | No sudo needed so far; I will not change it without asking |
| Node / ffmpeg | Node v25.8.1 (needs 22+: ok), ffmpeg 8.1.2 | |
| Python | pyenv 3.12.0 with torch 2.6, `chatterbox` 0.1.7, whisperx, onnxruntime; `uv` available | `mlx_whisper`, `rembg`, `mflux` **not installed** |
| HyperFrames | `npx hyperframes@0.8.191` works (render proven today in `poc/`); doctor: all ok except Docker not running (not needed) | The repo's own film engine is a separate canvas/GSAP engine (`engine/longform`, `engine/dot-cinema`), not HyperFrames |
| Ollama models | `qwen3-coder:30b` (18 GB), `qwen3.5:9b`, `gemma4:12b-mlx`, `qwen3:14b`, `deepseek-r1:14b`, `llama3.1:8b`, `qwen2.5-coder:7b` | `gpt-oss:20b` and `qwen3-vl:8b` **not installed** |
| Images | Draw Things CLI, models in `~/DrawThingsModels`: FLUX.2 Klein 4B q6p (41 s per 1024x1280), Z-Image Turbo + realism/eyes LoRAs (photoreal), qwen3-vl-4b-instruct q8p; ComfyUI also set up | Backend switch in `tools/flux/klein.mjs` (`IMAGE_MODEL=klein` gives the flat style the themes need; Z-Image + LoRAs is photoreal and wrong for folk-art themes) |
| TTS | Chatterbox (variant `dedicated_hindi`) at `~/infographics animations`, plus Veena (maitri). `audio/synth.py` does per-beat directed takes, post chain, whisperx alignment | Reuse the model loaders, not the story-shaped `synth.py` |
| Sound | `assets/sound/sfx` (15 CC0 cue families) + `assets/sound/music` beds + `LEDGER.json` with licences | Covers about 15 of the 25 SFX in the prompt; the rest synthesised |
| Fonts | Noto Sans Devanagari, Rozha One (woff2 already vendored in `poc/`); **Teko, Kalam, Mukta, Tiro Devanagari, Anton, Permanent Marker, IBM Plex Mono not installed** | All OFL; download needed |
| GSAP | `engine/node_modules/gsap`, so the render can use a local copy, no CDN | HyperFrames scaffold defaults to a CDN script tag; the prompt forbids that |
| Hub / tabs | `studio-ui/hub.html` has `TABS`, a `render()` map, one inline script; `server.mjs` mounts modules with one line (`merge.handle(...)`, `hub.handle(...)`); `hub.mjs` has `startJob()` (one heavy job at a time, 30-job history, polling) | A tab key `reels` already exists as an alias to Create, so the new tab uses key `reelfactory` |
| Tests | `tests/*.test.mjs` (node), `ui.e2e.*` scripts | Reuse the style |
| Git hygiene | Uncommitted work from earlier: Merge tab (`studio-ui/merge.mjs`, `hub.html`, `server.mjs`, `.gitignore`) and `poc/` | **Not mine to commit here; I will only `git add` Reel Factory paths** |

## 2. REUSE vs ADD

**Reuse (no changes):** Draw Things Klein backend (`tools/flux/klein.mjs`), Chatterbox/Veena loaders (`audio/model.py`, `model_veena.py`), `audio/postprocess.py`, whisperx alignment, `assets/sound/*`, `tools/content/llm.mjs` (Ollama `ask`), the Hub job pattern, `serveFile` range streaming, the HyperFrames CLI.

**Add (all new, isolated):**
- `reel-factory/` package: `src/` (stages, CLI `reel`), `components/` (30+), `themes/` (5 packs), `prompts/`, `schemas/`, `episodes/` (git-ignored heavy output), `tests/`.
- `studio-ui/reelfactory.mjs` + a tab in `hub.html` (one mount line in `server.mjs`).
- `docs/reel-factory/` README, ARCHITECTURE, COMPONENT_SPEC, THEMES, LICENSES.json, eval reports.
- `assets/LICENSES.json` entries for any new font, icon pack, SFX.

Nothing in `engine/`, `tools/video`, `tools/longform`, `audio/` or the existing tabs is modified. It runs without the Hub (CLI) and as its own tab.

## 3. Conflicts and risks found in the prompt

1. **`window._timelines` vs `window.__timelines`.** The prompt (engineering rule 2) says `_timelines`. HyperFrames reads `window.__timelines` (two underscores). Plan: register under both names. Please confirm.
2. **CDN.** HyperFrames' starter loads GSAP from jsDelivr. The prompt bans CDN at render time, so GSAP and all fonts will be vendored into each composition.
3. **30-minute unattended P7 vs image cost.** Klein is ~41 s per 1024x1280 picture. 18 assets x 2 candidates x ~41 s = ~25 min for images alone on a cold cache. Plan: generate at ~768 px, 1 candidate by default, a second only when the critic flags the asset; assets cache by hash and recurring characters are reused.
4. **Memory.** `qwen3-coder:30b` is 18 GB on a 24 GB machine. It will run alone with `keep_alive: 0` and nothing else loaded; the Hub's own server stays idle. Free-memory check before each stage as required.
5. **Style.** Z-Image + LoRAs (what our films use) would make the folk-art / collage themes photoreal. The factory will use Klein with the theme style lock.
6. **Safe-zone numbers.** The prompt gives x 60-900, y 150-1250 for text; HyperFrames' own vertical guide says y 168-1330. I will use the tighter box (the prompt's), which fits inside both.
7. **No HF token needed** unless a gated model is chosen (none proposed).

## 4. Proposed downloads (nothing downloaded yet; needs your yes)

| Purpose | Prompt's candidate | What I propose | Size | Licence | Source |
|---|---|---|---|---|---|
| Director LLM | `gpt-oss:20b` (13 GB) | **Skip. Use installed `qwen3-coder:30b`** (the prompt's stated alternative); compare with `qwen3.5:9b` in the P4 eval | 0 | Apache-2.0 | installed |
| Vision critic | `qwen3-vl:8b` (~6 GB) | `qwen3-vl:8b` via Ollama | ~6.1 GB | Apache-2.0 | ollama.com |
| Alignment | `mlx-whisper` large-v3-turbo | **Keep whisperx (installed, already used for Hindi)**; add mlx-whisper only if it proves better | 0 (or ~1.6 GB) | MIT | installed |
| Cutout | rembg + BiRefNet | `rembg` + BiRefNet (small footprint) | ~1 GB | MIT / MIT | PyPI / Hugging Face |
| Images | reuse Flux | **Reuse Klein 4B (installed)** | 0 | Apache-2.0 | installed |
| TTS | Chatterbox Multilingual | Reuse installed `dedicated_hindi` + Veena; the multilingual `hi` fine-tune only if you want it | 0 (or a few GB) | MIT | installed |
| Fonts (OFL) | Teko, Kalam, Mukta, Tiro Devanagari Hindi, Anton, Permanent Marker, IBM Plex Mono | same, woff2 vendored | ~2 MB | SIL OFL 1.1 | Google Fonts |
| Icons | "local icon packs" | Lucide (ISC) or Tabler (MIT) | ~5 MB | ISC / MIT | npm |
| Music / SFX | royalty-free folder | reuse `assets/sound` (CC0); synthesise the missing cues with ffmpeg | 0 | CC0 | installed |
| **Total new** | | | **~7.1 GB** (leaves ~20 GB free) | | |

## 5. Questions for you (Phase 0 inputs)

1. Branch base: keep `feature/stipple-engine`, or rebuild on `main`?
2. Register timelines as both `_timelines` and `__timelines`? (recommended)
3. Approve the download table above (qwen3-vl:8b, rembg + BiRefNet, fonts, icons: ~7.1 GB)? Or free disk first and take the prompt's full list?
4. Voice: stock Veena (maitri), or the installed Chatterbox with a reference clip of your own voice (send a clean 10-20 s clip)?
5. Music: reuse the CC0 beds in `assets/sound/music`, or supply a folder?
6. Tab name: "Reel Factory" (key `reelfactory`) OK?

## 6. Phase plan after your OK

P1 core engine (design system, primitives, one-take camera, 12 components, determinism test, golden Hindi `pothi` plan of 8 beats) -> P2 30+ components, 5 themes -> P3 assets -> P4 director + eval -> P5 voice/align/mix -> P6 QA loop + tab -> P7 end-to-end with the Rupkund test script. I stop after each phase with evidence.
