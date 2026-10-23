# Sound library

Every file here is **CC0 1.0 (public domain)**: no credit needed anywhere, monetisation on YouTube allowed. `LEDGER.json` records, per file, the source URL, licence, author and how it was processed. Keep it: it is the proof of source if a platform ever flags a file (a Content ID claim on a CC0 file is a false claim; dispute it with the ledger line).

```
sfx/<role>/        recorded one-shots: whoosh_fast, whoosh_soft, whoosh_long, air, impact_small, impact_mid, impact_big, boom, riser, riser_dark, glitch, shimmer, pop, tick
sfx/keys/          95 single keystrokes sliced from three real keyboard recordings (the typewriter)
music/<mood>-*.m4a 17 beds (sorrow, war, devotion, cosmic, river, neutral), -23 LUFS; NOT in git: python3 tools/sound/fetch-music.py rebuilds them
LEDGER.json        provenance of everything above
```

## Where it comes from
| Source | Licence | Used for |
|---|---|---|
| [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) `skills/sound-effects/sfx` (MIT repo; the sounds inside are Kenney packs and Freesound items, each verified CC0 by the curator) | CC0 1.0 | all sound effects and the keystrokes |
| [btahir/open-lofi](https://github.com/btahir/open-lofi) | CC0 1.0 (the owner generated the tracks with Suno v5 and dedicated them to the public domain) | calm music beds: ambient, Asian/zen, cinematic |
| [effacestudios/Royalty-Free-Music-Pack](https://github.com/effacestudios/Royalty-Free-Music-Pack) | CC0 1.0 (the studio's own music) | 3 rhythmic tracks, tension/battle only |

**Deliberately not used:** `SoundSafari/CC0-1.0-Music` (a scrape of five sites; per-track provenance cannot be verified and its FreePD source has closed), and the Mixkit, Pixabay and Sonniss entries named in the Barty manifest (not CC0).

## How the sound design works (tools/reel/sound-reel.mjs -> engine/dot-cinema/sound.mjs -> mix.mjs)
Priority is **voice > effects > music**. `sound-reel.mjs` reads the plan and writes `sound.json`; `sound.mjs` renders two stems (bed = drone + music, effects); `mix.mjs` ducks the bed hard under the narrator (12:1) and the effects lightly (2.5:1), then loudness-normalises (-16 LUFS) and checks the voice stays 12+ dB above the bed in every beat.

| On screen | Sound |
|---|---|
| any typed text (title, kinetic words, quote, 3D hero word, end card) | a real keystroke per letter at the frame the letter appears (snapped to the 1/fps grid; text entering through a fading transition waits 1-2 frames) |
| whip pan | fast whoosh, starting 2 frames early, panned L/R alternately |
| zoom-through | long whoosh peaking at the zoom + a soft thud |
| light leak | air pass + a faint glass shimmer |
| hard cut in fire | deep impact |
| dissolve | silence (the music carries it) |
| shot cut inside a beat | impact + whoosh in fire/ember beats, soft air elsewhere |
| hook | heartbeat; a riser that peaks as the typed title lands, then a hit; nothing audible before ~0.5 s (the QA onset check) |
| reveal | authored silence, riser, big hit, bell |
| 3D hero word | keys, a mid hit when it completes, a glint when the light sweep crosses |
| end card | keys for the four lines, a pop on the save/share/comment pill |

Levels live in the `LV` table at the top of `sound-reel.mjs`, calibrated by rendering every effect alone. The music bed is chosen by the film's mood and never repeats the last three films' tracks (`content/sound-history.json`); it loops with a 4 s equal-power crossfade and has a 3 dB carve at 2.8 kHz for the voice. If this library is missing, the old `assets/music` tanpura drones are used.

## Adding sounds
Only CC0. Put the file under `sfx/<role>/` (or `music/<mood>-<name>.m4a`) and add its ledger entry (source URL, licence, author). Never add CC-BY, "free with attribution", or anything whose licence forbids use inside a monetised video.
