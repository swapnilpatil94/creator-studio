# The effect stack: what was chosen and why (2026-10-18)

| Candidate | Verdict | Evidence |
|---|---|---|
| **DepthFlow** (depth-parallax shader) | **Adopted for every camera move** (drone push-in/pull-out/orbit/top-down/FPV, crane up/down, dolly-zoom, handheld, 2.5D parallax, parallax occlusion, rack focus) | Installed and tested here: runs natively on the Apple GPU (OpenGL via Metal), 77 fps at 1080x1920 (a 3 s clip renders in about 1.3 s), real perspective and occlusion. 8 clips for a film in 13 s. `tools/layers/depthflow_clip.py`, `camera-clips.mjs`; env `~/.venvs/depthflow`. |
| ComfyUI-MLX node packs | Not adopted | The packs found are small experiments (a fork with 2 stars), image-only, no evidence of FLUX.2 Klein support. |
| **mflux** (real MLX port of FLUX.2 Klein, Z-Image, Qwen-Image; edit, inpaint, depth) | Installed as a tool, **not** the default image path | Tested: Klein 4B (q8) makes a good 768x1344 portrait; about 11-17 s per step under load, i.e. no speed win over ComfyUI's 36-45 s per image. Valuable for editing: inpaint/outpaint behind subjects, an "aged" version for morph_age_shift. env `~/.venvs/mflux`. |
| Draw Things (API) | Not adopted | Reported about 20% faster than ComfyUI for images; the search found no verified video API. |
| Wan 2.1/2.2, SVD XT (generative image-to-video) | Not adopted on this Mac | Reports: Wan 2.2 5B on Apple MPS gives corrupt frames after the first; GGUF Wan 2.2 took 82 minutes for a 2 s clip on an M1 Max 64 GB. |
| LTX-Video / LTX-2 | Not adopted on this Mac | The Mac app found needs 32 GB RAM minimum (this Mac has 24 GB); no timing numbers found. |
Generative video remains an option for a few hero shots on a cloud GPU (needs your approval and a budget). For everything the channel makes daily, DepthFlow plus the layered effects is what is fast and reliable here.
Pipeline: still painting -> depth (Depth Anything V2 Small) + cut-out layers (rembg) -> DepthFlow camera clip -> film engine (captions, kinetic type, charts, particles, fog, rays, lightning...) -> parallel render -> QA.

## Measured later the same day (Draw Things, SVD, the other chat's advice)
- **Draw Things replaced ComfyUI as the image backend.** `draw-things-cli` runs FLUX.2 Klein 4B (6-bit) in 41 s per 1024x1280 image including process start-up and model load, against ComfyUI's 46-60 s (median 50); same painterly quality in a side-by-side; no server to start, about 8 GB less memory held. ComfyUI remains as a fallback (`IMAGE_BACKEND=comfy`). Models live in `~/DrawThingsModels` (`DRAWTHINGS_MODELS_DIR`).
- **"SVD XT Small" and "AnimateDiff Small" do not exist** in Draw Things' model catalogue (385 entries checked with `draw-things-cli models list`). The real video models are Stable Video Diffusion I2V XT 1.0, Wan 2.1/2.2, LTX-2/2.3 (19-22 B) and Hunyuan. "Depth Anything V2 Small" is not a Draw Things download; the studio already uses it (outside Draw Things) for the depth maps that DepthFlow consumes.
- **SVD XT I2V (8-bit), measured:** 731 s (12 min) for a 25-frame clip of 0.83 s at 576x1024 (sampling 33 s per step, 20 steps); colours blown out (soft painting became saturated), faces redrawn between frames, almost no motion. Rejected: it breaks the rule that sacred faces must not change.
- Text-in-picture guard: pictures are checked with macOS Vision and redone while lettering is found (a sage "speaking a warning" produced a page of gibberish before this).
