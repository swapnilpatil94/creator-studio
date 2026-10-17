# Reference Profile: "system-architecture explainer" visual grammar

Source file analyzed: `reference-video-what-are-we-trying-to-build-the-same.mp4`
(512×1108, h264/aac, 30fps, 55.0s — confirmed via `ffprobe`).

## Important finding about the source file

This file is **a screen recording of another creator's Instagram Reel**, not a stock reference
or a licensed asset. The frames show Instagram's own Reels UI chrome (status bar, Reels/Friends
tabs, like/comment/share/follow counts, a verified handle, a caption, Instagram's own
"Screen recording is not available when watching reels in full-screen" warning baked into the
frame). That warning being present *and* the video still existing as a file means the capture
happened through some workaround of Instagram's anti-recording protection — this was not shared
by the creator for reuse.

**Consequence for this project, per the brief's own instruction** ("learn transferable
production techniques... not copy other creators' footage, scripts, assets or distinctive
sequences"):

- This document extracts **visual grammar only**: palette, typography rules, diagram
  conventions, motion/camera patterns, pacing. These are generic conventions of the
  "system-design explainer" genre, not the creator's expression of them.
- The specific script, headline copy, narrative analogy, data points, title, caption, and
  account/branding visible in the source are **not reproduced anywhere in this repository** and
  must not be used as content for any generated video. Original scripts are written per channel
  skill (`channel-strategy-topic-planning`, `ai-tech-research-verification`).
- **Recommendation: do not commit the raw `.mp4` file into git.** It's useful locally as a
  reference while building, but it's someone else's captured content obtained in a way that
  bypassed platform protection — keep it out of version control (`.gitignore`'d) and out of any
  published artifact. Flagging this to the user explicitly rather than silently deciding.

## Visual grammar extracted (transferable technique)

### Palette & atmosphere
- Near-black navy base (`#05070c`–`#0b0f16` range), radial vignette toward center-top, not flat black.
- Two-tone accent system: cool white/ice for "normal" state, warm amber/orange for "load/stress"
  state. The shift from cool to warm *is* the visual metaphor for increasing system load — not a
  random palette choice.
- A single accent color per beat is used to highlight exactly one word in the headline (amber on
  the "problem" word), everything else stays white/grey.

### Diagram conventions (the core reusable technique)
- Infrastructure nodes are **dashed/dotted-outline shapes**, not solid fills or solid wireframes:
  dashed rounded-rectangle grids (`backend` cluster) and dotted-ring "beacon" icons (`edge`
  nodes) with a thin dotted vertical tether line down into the content below.
- A dense particle/dot field represents a crowd or request volume (small rectangular dot
  sprites in a loose vertical gradient of density) — this is the same family of technique as
  this engine's existing stadium-crowd particle system (`build-visual-benchmark.mjs`), just
  rendered as a falling/rising field rather than a seated-ring bowl in some beats.
- Small monospace, lower-case, letter-spaced labels under each diagram element
  ("core backend", "cdn edge") — technical/blueprint labeling convention, not marketing copy.
- A labeled-connector beat: curved lines from the infrastructure cluster to specific named
  endpoints (e.g. API-route-style labels) fan out onto a device mockup, each connector carrying
  its own small pill label in the accent color.

### Typography & layout
- Centered, two-line, bold sans headline directly over the diagram — no persistent header/footer
  chrome during explainer beats (lighter-weight UI than a "dashboard card" look).
- A large centered numeral ("stat reveal") beat exists as its own distinct beat type, separate
  from the headline-over-diagram beats — big number, small caption underneath, minimal diagram.
- A custom horizontal row of small dashed-rectangle "chapter chips" near the bottom of some
  beats, one of them highlighted — a creator-added scene/chapter index, distinct from the
  platform's own progress bar.

### Chart beat (distinct from the 3D diagram beats)
- A 2D line/area chart is its own beat type: axis lines, a filled step/area shape in the accent
  color for "traffic", a dotted step-line for "capacity", small pill annotations at key points
  (threshold/alarm markers), and a two-item legend (color dot + label) under the axis.
- Two chart beats in sequence contrast a "reactive" shape (capacity rising only after the spike,
  with a visible gap/error zone) against a "proactive" shape (capacity pre-raised before the
  spike) — i.e., the chart *shape itself* carries the explanation, not just the label text.

### Motion & pacing
- Scene-cut detection on the full 55s file found only 2 hard cuts, both near the very end —
  the body of the video is near-continuous camera movement through one connected 3D/2D space
  per section, not a slideshow of fully separate static cards. This matches this engine's
  existing `renderAt(seconds)` single-scene-with-phases architecture far better than a
  multi-HTML-per-beat approach.
- No silence gaps found at -30dB/0.3s — continuous music/sound bed under the whole piece, not
  narration-with-pauses. (This project's own narration is spoken Hindi/English explainer audio,
  so pacing should still be driven by narration timing per the engine's existing contract — this
  observation is about the reference's audio design, not a requirement to copy it.)

## Gap analysis against the existing engine

| Technique | Status in `technical-data-cinema` before this session |
|---|---|
| Near-black palette, fog, camera push/pan, phase-based color shift, deterministic `renderAt` | **Already implemented** — `examples/visual-director-benchmark.html` |
| Particle/point crowd field | **Already implemented** — stadium-ring particle system in the same file |
| Dashed/dotted-outline node style (vs. solid wireframe) | **Gap** — benchmark uses solid wireframe box meshes, not a dashed/sketch look |
| Big centered stat-number reveal beat | **Gap** — not present |
| Phone-mockup + labeled-API-connector diagram beat | **Gap** — not present |
| 2D line/area chart beat with annotations | **Gap** — not present |
| Chapter-chip scene index | **Gap** — not present (minor, cosmetic) |
| Monospace technical labels under diagram elements | Partially — present in the Draupadi dotted-ink example in a different (ink/parchment) palette, not in the dark tech benchmark |

Everything in the "Gap" rows is addressed as new, original, reusable scene primitives — see
`engine/primitives/` and the demo render produced this session (not a copy of the reference's
specific diagram content).
