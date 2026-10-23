> The synthesised tanpura drones here are now only a fallback; the main sound library is assets/sound (CC0, see its README). 

# Background music bed

`<mood>-tanpura-drone.m4a` (devotion, sorrow, war, cosmic, river, neutral) are synthesized from scratch by `tools/reel/make-music-beds.py` (Karplus-Strong tanpura tuned to the cue bed's 98 Hz root, mood pad, heartbeat drum for war): our own work, no licence questions, loop-seamless. Curated real tracks added below sit in the same pool and are picked the same way; delete the drones if you want only curated music.

Drop royalty-free instrumental tracks here, named `<mood>-<anything>.wav` or `.mp3` (e.g. `war-drums-rising.mp3`, `wonder-ambient-strings.wav`, `sorrow-piano-slow.mp3`). The mood prefix must match one used in `tools/longform/look.mjs` / `planner/outlier-config.json`'s moods: `war, cosmic, river, sorrow, devotion, neutral` (shorts) or any free word for long-form reels -- the engine matches by prefix, falls back to any file if no mood match exists.

Once files exist, `tools/reel/sound-reel.mjs` and the long-form sound stage pick one deterministically per story (seeded, so the same story always gets the same track, different stories spread across what's available) and reference it in `sound.json.music`. `engine/dot-cinema/sound.mjs` then loops/trims it to the film's length, mixes it under the procedural cue bed at -16 dB (quieter than cues), and the EXISTING sidechain-ducking in `mix.mjs` automatically pulls it down further under the narration -- no other code needs to change.

## Where to get real, legally safe tracks (manual, one-time curation -- there is no clean free music API to automate this)
- **Pixabay** (pixabay.com/music/): "Pixabay Content License" -- commercial use free, no attribution required, cannot resell the file standalone. No official API for music (checked 2026-10-19), so download from the website.
- **YouTube Audio Library** (studio.youtube.com -> Audio Library): large free catalogue, explicitly cleared for YouTube monetization.
- **Freesound.org**: filter by CC0 license specifically (other licenses on the site need attribution or are non-commercial) -- has a real API if automating later, free registration.
Keep a note of the source + license for each file you add, in case a platform ever asks.
