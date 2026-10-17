---
name: seekable-libs-and-render-quality
description: How to use GSAP, anime.js, WAAPI/CSS, Lottie inside the deterministic renderAt(t) contract, plus render-quality techniques (motion blur, supersampling, deterministic Chromium flags), caption pacing and loudness targets for social. Use when adding any animation library to a scene or when a film looks "digital" or stutters.
---

# Seekable libraries and render quality

Sources: HyperFrames adapters (Apache-2.0), Howseen render notes (MIT), GSAP official skills (MIT, installed as `gsap-core`, `gsap-timeline`, `gsap-plugins`).

## Rule: drive every library from t, never from a clock
Our export calls `renderAt(t)` for arbitrary t. A library is usable only if you can *set* its time.
| Library | Seek |
|---|---|
| GSAP timeline | build `const tl = gsap.timeline({paused:true})`; in renderAt: `tl.time(t)` (or `tl.totalTime(t, true)`; if the same time is requested twice GSAP skips the redraw, so for forced redraw: `tl.totalTime(t+0.001,true); tl.totalTime(t,true)`) |
| anime.js | `autoplay:false`, then `anim.seek(t*1000)` |
| WAAPI / CSS animations | `document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000})` |
| Lottie | `anim.goToAndStop(t*1000, false)` |
| Theatre.js | set `sheet.sequence.position = t` after dropping Studio |
Never use libraries that only animate in real time (Spline/Unicorn runtimes, live framer-motion, rAF-driven physics): frames drift.
GSAP is free including SplitText, MorphSVG, DrawSVG (kinetic type, SVG path draw-on for Kathaaya ink reveals). The studio shim replaces rAF/timers, so build timelines at load and only seek them.

## Render quality upgrades (in order of visual payoff)
1. **Motion blur**: render N sub-frames per output frame spread over a 180-degree shutter (0.5 of the frame interval) and average (`ffmpeg tmix`). Adaptive N: still = 1, <= 20 px/frame = 4, above = ceil(px/5) up to 16. Blur only the 1-3 slam moves; never blur text meant to be read; never blur across a hard cut. (Not yet in `render.mjs` - candidate engine upgrade.)
2. **Supersample 2x**: we already capture at deviceScaleFactor 2 (1080x1920 from a 540x960 page).
3. **Determinism**: for pixel-identical reruns use Chromium flags `--deterministic-mode --run-all-compositor-stages-before-draw --disable-threaded-animation --disable-checker-imaging --font-render-hinting=none --force-color-profile=srgb`.
4. **Grain in ffmpeg, not in the page** (page grain makes frames incompressible); use `-tune grain` when grain is baked in.
5. **Colour**: encode `yuv420p`, BT.709, TV range, `+faststart`; poster frame in frame 0 for platforms that ignore covers.

## Captions
Pop style 1-3 words, or karaoke 3-7 words; each caption on screen >= 0.7 s; <= 17 characters/second; a word lights on its start frame, never before; drop words the aligner hallucinated over trailing silence. Keep captions out of the bottom 25% only if the platform UI covers it - our overlay sits at ~y 1450-1620 of 1920, verified by `caption_in_margins` and `caption_legible`.

## Audio
Master to **-14 LUFS, true peak <= -1.5 dBFS** for Reels/Shorts/YouTube (the studio currently targets -16; raise `loudnorm I` in `mix.mjs` to -14 when the voice margin allows). Duck the bed under the voice by sidechain; voice >= 12 dB above the bed (QA gate). Find a music drop by energy, not an auto beat grid. Keep 20-120 Hz about -3 dB relative to the rest and give bass harmonics so it speaks on phone speakers.
