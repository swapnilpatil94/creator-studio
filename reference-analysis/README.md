# reference-analysis

Reference-Reel intelligence workflow (new — not built in any source project). Will hold FFmpeg
scene-boundary/contact-sheet extraction, pacing/camera/typography/color analysis, and a cached,
versioned reference profile per input video. `cache/` holds per-reference analysis output.
The first target is `reference-video-what-are-we-trying-to-build-the-same.mp4`
(512x1108, 30fps, 55.0s — confirmed via ffprobe, not yet analyzed). See `ARCHITECTURE.md` §6.
