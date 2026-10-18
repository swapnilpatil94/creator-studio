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
