# Why videos took hours, what was measured, what changed (2026-10-18)

## Measured on this Mac (M4 Pro, 12 cores, 24 GB)
| Step | Before | After | How |
|---|---|---|---|
| Render, per frame | 323 ms (46 ms drawing + **277 ms PNG screenshot**) | **68 ms** | canvas captured directly as JPEG (`--fast`, scenes that draw on one canvas set `window.__canvasOnly`) |
| Render, whole film | one browser, one frame at a time | **6 parallel browsers** | `--workers N` shards (`--shard k/N --frames-only`), merged by one ffmpeg run |
| 72 s reel, full pipeline (render + 13 QA checks + share copy) | about 10 min | **78 s** | the two changes above, ffmpeg `medium` preset |
| Disk per film | up to 19 GB of PNG | about 1/10 | JPEG frames, still deleted after QA |
Voice (Chatterbox Hindi): 678 s for 101 s of speech while the machine was busy (about 6.7x real time). Script (local 12-14B writer): 5-6 min for 3 minutes of narration. Images (FLUX.2 Klein 4B on MPS): 36-45 s each at 1344x768.

## Where the remaining time goes, in order
1. **Voice** (about 11 min per 100 s of speech). Runs on the GPU; do not overlap it with image generation. Ideas to test: reuse takes (already cached per phrase), shorter scripts (the system now cuts paraphrased repeats), a faster TTS variant (not evaluated).
2. **Script** with a local model (5-6 min). An `ANTHROPIC_API_KEY` makes it about 20 s and better Hindi.
3. **Images** (about 40 s each). Reduced by design: carousel paintings are reused first (in story order) and at most 12 new ones are generated; a 2-minute film now needs 0-3.
4. Layers (depth + cut-out, about 20 s per painting, cached).
5. Render (about 1-3 minutes for 2-3 minutes of film).

## About ComfyUI-MLX, mflux and other "faster" options (research, not claims)
A web search found no benchmark showing ComfyUI-MLX nodes are faster than the current setup for FLUX.2 Klein on an M4, and no evidence those nodes support Klein; general statements that MLX is 2-3x faster than MPS are not FLUX-specific. mflux (an MLX port of FLUX) exists, but a reported M1 Max run of Klein 9B took 1m51s at 512 px and 5m37s at 1024 px, so it is not obviously faster than our 36-45 s at 1344x768 with the 4B distilled model. **Klein 4B distilled is already the speed-first model.** The honest way to know is an A/B test of mflux against the current ComfyUI path on this Mac, which needs a multi-GB model download and your approval.
Image editing with FLUX.2 Klein (reference images, object replacement) is supported by ComfyUI's Klein edit templates; it is the route to a real `morph_age_shift` (an "old" version of a subject) and to generative outpainting for `matte_painting_extension`. Not built yet.
