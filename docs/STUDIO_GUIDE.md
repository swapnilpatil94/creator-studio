# Studio guide

## One-time setup
Node 22+, ffmpeg, Playwright Chromium (`cd engine && npm install && npx playwright install chromium`), and your existing Chatterbox
install (`~/infographics animations`, auto-detected; override `ttsRepo` in `studio-ui/config.json`).

## Make a film (UI)
```bash
node studio-ui/server.mjs        # http://127.0.0.1:4180  (local only)
```
1. **New film.** Pick the channel label.
2. **Script**: one line = one beat (Hindi or English). **Generate narration (Chatterbox)** uses your tuned storytelling preset and returns word-level timing. Or upload your own WAV and click *Estimate timing* (approximate captions).
3. **Visuals**: **Copy AI prompt** puts the strict scene prompt, your script and the *real narration timeline* on the clipboard. Paste it into any frontier model (Claude, GPT, Gemini...). Paste the HTML it returns and click **Save & validate**. Red items come with the exact fix; amber items (Math.random, Date, rAF...) are repaired automatically by the studio shim.
4. **Preview**: scrub or play, with or without narration/captions.
5. **Render**: sound design on/off, auto-repair passes, force re-render. The log shows each gate: validate -> visual QA (auto-repair) -> sound + ducked mix (auto-gain) -> render -> audio/video QA -> share copy. A failed gate stops the run with the reason; unchanged stages are skipped next time; an interrupted render resumes from the frames already written.
6. Download the 1080x1920 master or the 720p copy. **Read the QA list and watch the film before publishing.**

## Story folders (CLI)
`node engine/dot-cinema/pipeline.mjs stories/<name> [--force] [--fix 8] [--no-sound]`. Story types: SDK scenes (`scene.js`, captions drawn by the scene) and pasted HTML (`type: html`).

## Skills (project-level, loaded on demand; ask for them by purpose)
| Skill | Ask Claude Code | Gives you |
|---|---|---|
| `film-direction-method` | "Direct a new film about X: write the treatment first" | benchmark, 3 structures, shot list, cue map, sound table, review loop |
| `motion-continuity-doctrine` | "Plan the camera path and shot handoffs" | vector law, carriers, no idle wobble, anti-AI-look rules |
| `seekable-libs-and-render-quality` | "Add GSAP kinetic type to this scene" / "make it look less digital" | how to seek GSAP/anime/WAAPI/Lottie, motion blur, flags, caption and loudness rules |
| `gsap-core`, `gsap-timeline`, `gsap-plugins` | "Use GSAP SplitText for the title" | official GSAP guidance |
| `narration-craft` | "Write the narration for X" / "audit this script" | but/therefore beats, last-line-first, Hindi/TTS pacing from measured data, hook layers; routes to the skills below |
| `storytelling-hooks`, `viral-hooks`, `storytelling`, `anti-ai-writing` (third-party, MIT) | "Write 5 hooks" / "why is this opener flat?" | six attention levers, hook killers, but/therefore engine, anti-hollow-prose filter |
| `hook-formulas` | "Give me hooks from different formulas" | 21 named formulas with Hindi mythology + AI examples |
| `long-form-youtube`, `titles-and-thumbnails`, `retention-audit`, `channel-formula` (third-party, MIT) | "Script a 12-minute video" / "diagnose this flop from its retention graph" | long-form levers, title+thumbnail pairs, retention diagnosis, channel formula from winners vs flops |
| `retention-psychology` | "Write a hook" / "Why would this lose viewers?" | evidence-graded principles, checklist, experiment protocol |
| `long-form-playbook` | "Plan a 10-minute deep dive" | structure, re-hooks, packaging, production plan |
| `content-planning-research` | "Plan this week" / "Research topic X with a claims ledger" | planner workflow + research standards |
| `dot-cinema-visual-qa`, `visual-direction-scene-generation`, `reference-reel-analysis`, `creator-studio-operator` | operating and QA | engine rules and recovery |

## Planner (data-driven content planning)
```bash
node planner/import-analytics.mjs yourexport.csv   # normalise YouTube/Instagram CSV
node planner/report.mjs                            # medians by channel/format/topic/hook, correlations with n and caveats
node planner/plan.mjs --date 2026-10-18            # scored plan, 1 exploration slot, blocks unresearched topics
node planner/claims-check.mjs stories/<name>       # every beat needs a sourced claim
node planner/hook-lint.mjs stories/<name>          # hook strength (weakest-link), but/therefore, rhythm, last line, speaking rate
```
Demo data lives in `planner/fixtures/*FIXTURE*` and is synthetic. Use `PLANNER_DATA=/tmp/x` to keep tests out of your real data.

## Roadmap (honest)
- **Long-form (16:9, 6-20 min)**: not supported yet. Needed: `--size` through render/shim/validate/QA, chapter projects, music across chapters. Resumable rendering already exists.
- **Motion blur**, per-shot adaptive sub-frames: designed (see `seekable-libs-and-render-quality`), not implemented.
- **Official analytics APIs** (YouTube Data/Analytics, Instagram Graph): need OAuth and app review; CSV works now.
- **Research verification**: the two story ledgers still have `needs_check` citations. Verify against the texts before publishing.

## What the system cannot do
It cannot guarantee views, judge whether a figure looks beautiful, or hear taste in the sound design. It can guarantee the film is reproducible, framed, readable, correctly timed and level-safe, and it stops when it is not.
