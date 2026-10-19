# "Modern edits" research: open-source tools vs. what we have (2026-10-19)

## The honest finding
Searched for open-source equivalents of CapCut/Instagram-style auto-editing (OpenCut-AI, AutoClip, OpenClipper, VibeClip, OpenEdit, auto-editor, Unsilence). **None of them apply directly to our pipeline**, and that's not a gap -- it's a difference in what kind of video we make:
- Every one of those tools solves **repurposing raw camera footage**: detecting silence to cut dead air, tracking a speaker's face to auto-crop 16:9 into 9:16, transcribing to burn in captions after the fact.
- Our films have **no raw footage and no silence to remove** (narration is TTS with designed pauses), **no cropping to do** (every frame is painted directly at the target 1080x1920 or 1920x1080), and **captions are generated from exact word timestamps we already have**, not detected after the fact.
- The "modern edit" feel (word-pop captions, punch zooms, kinetic type, grain, light leaks) that those SaaS tools (CapCut, OpusClip, Submagic) sell is mostly what `engine/longform/core.js` and `engine/longform/backdrops.js` already do natively this session: word-by-word pop/karaoke captions, Ken Burns per scene, 7 kinetic styles, 10 animated backdrops, film grain/teal/light-leak grades.

**Conclusion: build on our own renderer, don't bolt on a generic tool.** A generic editor would need our footage exported first, then re-import it, losing the deterministic re-render-on-voice-change property the whole system depends on.

## What was a genuine, missing piece: music
Checked and confirmed: the pipeline had **zero background music**, only procedural sound effects (`engine/dot-cinema/sound.mjs`: synthesized heartbeats, whooshes, impacts). A lot of the "thrilling edit" feeling people associate with modern Reels comes from a music bed with energy, not just caption motion.

**Built and tested this session:**
- `assets/music/` folder convention (see its README for where to legally get real free tracks -- there is no clean automatable royalty-free music API; Pixabay's official API doesn't cover music, so this needs a one-time manual curation of ~10-20 tracks).
- `engine/dot-cinema/sound.mjs` now mixes an optional music bed under the procedural cues (looped, faded, -16 dB).
- The existing sidechain-ducking in `mix.mjs` (already built for the sound effects) automatically pulls music down further under the narration -- no change needed there.
- `tools/reel/sound-reel.mjs` picks a track deterministically by the story's mood, falls back to any track if no mood match.
- Tested end to end with a synthesized test tone: confirmed it mixes, loops, fades at the seam, and respects the limiter. With zero files in `assets/music/` (current real state) it's a no-op -- exactly today's behavior, nothing regresses.
- **What's needed from you:** drop 10-20 royalty-free tracks into `assets/music/`, named `<mood>-name.mp3` (see the README). The next video made will use one automatically.

## Beat-sync (researched, not built)
Found real, free, open-source BPM/beat-detection libraries for when real tracks exist: [music-tempo](https://npmjs.com/package/music-tempo) (BeatRoot algorithm, returns tempo + beat timestamps), [web-audio-beat-detector](https://cdn.jsdelivr.net/npm/web-audio-beat-detector). Once real tracks are in `assets/music/`, the next step is: detect each track's beat times once (cached), and snap kinetic-text pops / Ken Burns punches to the nearest beat instead of narration-only timing. Not built yet -- there was nothing to test it against.
