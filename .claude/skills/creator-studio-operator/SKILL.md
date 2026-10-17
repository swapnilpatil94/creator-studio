---
name: creator-studio-operator
description: How to operate the Creator Studio end to end - start the studio UI, paste a script and an AI-written HTML scene, generate Chatterbox narration, validate, preview, render with sound, read QA. Use whenever the user asks how to make a film, or when a film fails a gate.
---

# Operating the studio
Full guide: `docs/STUDIO_GUIDE.md`. Quick path:
1. `node studio-ui/server.mjs` -> http://127.0.0.1:4180
2. New film -> paste script (one line = one beat) -> **Generate narration** (Chatterbox).
3. **Copy AI prompt** (it embeds your script and the real narration timeline) -> paste into any frontier model -> paste the returned HTML -> **Save & validate**.
4. Scrub the preview; **Render video**. Gates: validate -> visual QA with auto-repair -> sound + ducked mix (auto-gain) -> render -> audio/video QA -> share copy.
5. Download the master (1080x1920) or 720p.
CLI for story folders: `node engine/dot-cinema/pipeline.mjs stories/<name> [--force]`.
When a gate fails, read `output/<stage>.log`; fix the scene, not the standard (see `dot-cinema-visual-qa`). Never claim a film is done without reading its contact sheet.
