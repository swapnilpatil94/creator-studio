# reference-analysis

Reference-Reel intelligence workflow. `REFERENCE_PROFILE.md` in this folder is a real, completed
analysis (ffprobe facts, scene-cut/silence detection, full-duration frame sampling, extracted
visual grammar, gap analysis against the engine) of
`reference-video-what-are-we-trying-to-build-the-same.mp4` (512×1108, 30fps, 55.0s).

**Read `REFERENCE_PROFILE.md`'s "Important finding about the source file" section before using
this folder for anything else** — the source video is a screen recording of another creator's
Instagram Reel, not a stock asset, which is why `sources/` (where the raw file lives locally) is
git-ignored rather than committed.

- `sources/` — raw reference video files, local only, never committed (see root `.gitignore`).
- `REFERENCE_PROFILE.md` — the written analysis for the one reference processed so far.
- `cache/` — not yet used; reserved for a machine-readable (JSON) version of profiles as the
  number of analyzed references grows.

The process to follow for the next reference video is `.claude/skills/reference-reel-analysis/`.
