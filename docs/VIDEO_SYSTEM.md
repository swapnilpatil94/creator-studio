# Vertical video system (2026-10-18)

One item (carousel or blog) in, one produced 9:16 video of up to 3 minutes out. Hub: **Carousel → Video** tab, button "Make 3-min video". CLI: `node tools/video/make-video.mjs <item id> [--minutes 3] [--force]`.

## Stages (each timed; `stories/video-<slug>/timing.json`; each skipped when its output is current)
| # | Stage | What it does | Tool |
|---|---|---|---|
| 1 | script | uses the owner's script if `stories/video-<slug>/script.txt` (one line per beat) or `item.video_script` exists; otherwise the writer model expands the carousel into about 3 minutes of voice-over grounded in retrieved source passages; checked with the reel QA rules and a word budget | `tools/video/script.mjs` |
| 2 | prepare | story folder; carousel paintings become reusable scene assets (`c1..c9`) | `make-video.mjs` |
| 3 | voice | Chatterbox Hindi with emotion per beat, takes cached per phrase | `audio/synth.py` |
| 4 | director | one visual per beat from the component catalog, with this film's own look (hue, motif, transition, captions); validator enforces pacing | `tools/longform/director.mjs`, `look.mjs` |
| 5 | art | only the scenes the carousel cannot cover are painted (FLUX.2 Klein, 9:16, at most 12) | `tools/longform/art.mjs` |
| 6 | layers+scene | depth + cut-out parallax layers for every painting; scene file | `tools/layers`, `make-scene.mjs` |
| 7 | sound | procedural sound design | `tools/reel/sound-reel.mjs` |
| 8 | render+QA | deterministic render, 13 automatic checks | `engine/dot-cinema/pipeline.mjs` |
| 9 | package | cover frame, SEO and social kit | `planner/seo.mjs`, `social.mjs` |

## Visual vocabulary (`engine/longform/core.js`, works in 16:9 and 9:16)
painting with camera move and **multilayer parallax** (+ text behind the subject, shape reveal), **kinetic type** (slam, wave, glitch), **dot-assembled words** (the stipple identity applied to type), animated counter with ring, bar chart, **line chart**, timeline (vertical in portrait), **icon list**, relationship graph, versus panels, typed quote, chapter card, **Three.js 3D layer** (yantra, galaxy), generative background motifs (mandala, flow field, rangoli lattice, light rays, drifting ink) and four transition styles.

## Why it is not a template
Per film: its own plan (the model picks components from the beat's own words), its own palette hue and motif (never repeating the last three films), its own transition and caption style, its own set of pictures. Numbers, charts and graphs appear only when the narration states real numbers or relations.

## Scale and limits
One heavy job at a time (24 GB Mac): Flux is stopped before voice and render. Time is dominated by voice (about 1 min per 11 words) and render (about 0.3 s per frame at 1080x1920, 24 fps). Every stage is resumable, so an interrupted run loses at most one stage. To scale beyond one Mac the stages are already separable (script and director are cloud-friendly; art, voice and render need the GPU and the Mac).
Not built: 2D rigged characters, map component, automatic YouTube upload of these videos (the dashboard Publish tab handles story `video-<slug>`).
