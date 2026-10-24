# Dark psychology reels: look, sound, gaps and templates

Dark psychology here means one thing: **someone arranged the choices, and you did not notice**. The video must make the viewer feel watched, nudged and then relieved to understand. It is investigative, not conspiratorial: it names mechanisms and incentives, never villains without evidence.

## Colour: each colour has one job
| Colour | Hex | Job | Rule |
|---|---|---|---|
| Warm kraft / aged paper | #3A2F25, #D9CDB4 | the familiar, the viewer's own habit | opens the film; warm = safe, so the doubt lands harder |
| Charcoal / ash | #1B1815, #0F0D0B | the system working in the background | the base of most middle beats; never pure black, keep a warm undertone |
| Amber | #C18A45 | bait, reward, evidence, "look here" | tape, the highlighted word, dates, the default option |
| Signal red | #B93A36 | pressure, the trap, the warning | stamps, thread, one tag; at most about 10% of any frame |
| Cold slate / sage | #64736B, #5E8C8A | observation, data, the system's point of view | surveillance and clinical templates |
| Pale paper / ivory | #D9CDB4, #EDE3CF | clarity, the realisation | only the last one or two beats: the brightest page arrives last |
| Avoid | pure white, neon, purple, saturated red fills | cheapen the mood | the casino look (noir) is the only place gold/black gets loud |

**Mood arc (built in):** calm (warm) -> pressure (cold dark) -> reveal (red tint, one or two beats) -> clarity (pale). Each beat's `mood` chooses the page colour; the Director must follow the arc.

## Patterns and motifs (what makes it feel arranged)
- Analytical: grid paper, ruler ticks, subject/file numbers (the world is being measured).
- Concealment: redaction bars, blurred/hidden text that clears, torn corners.
- Control: red thread between objects, strings, hands holding controls (puppet motif).
- Observation: scan lines, camera corner brackets, timecodes, REC dot, eyes.
- Choice architecture: signposts with arrows, doors slightly open, mazes, repeated identical doors, a default option lit amber while the others dim.
- Persuasion: price tags, checker edge, diagonal hairlines, bait buttons ("Free Trial").
- Texture: engraving/hatching on objects (evidence, not photography), light grain, strong vignette. Heavy grain or glow cheapens it.

## Sound
Quiet room tone, a low drone bed ducked 10-18 dB under the voice, small interface sounds (tick, keys), a low boom only on the twist, a short silence or music drop before the last line. Never a hit on every cut. Voice: closer, a little slower, no cheerful lift.

## Templates (one choice sets the whole kit)
| Template | Feel | Best for | Palette |
|---|---|---|---|
| specimen | museum exhibits of the arranged choice | habits, defaults, how a custom was made | kraft, ash, blood tint, pale paper, amber |
| caseboard | evidence wall, red thread | who arranged it, who benefits | dark cork, polaroid cream, red |
| surveillance | being observed | feeds, notifications, tracking | black, phosphor grey-green, amber timecode, red REC |
| clinical | cold lab page | documented experiments | slate, clinical white, teal, red flags |
| noir | the shop as a stage | pricing, anchoring, subscriptions | black, gold, velvet, cream |
Each template = a theme (colours, fonts, music, cut-out art style lock, four mood sheets) + a style (background, transitions, overlays, mount and label skin) + caption look. Adding one is a tokens.json plus a background function.

## Honest gaps (what still keeps it from feeling truly "dark psychology")
1. **Story tension.** The structure is hook -> mechanism -> twist -> reflection. Missing: an open loop (a question held until the end), a re-hook near 50-60%, a specific "you did this today" moment, and a closing line that makes people comment or share.
2. **Recurring motif.** Objects are chosen per beat (a cup, a button). A strong reel repeats one symbol (hands and strings, an eye, a door) so the idea feels designed. The Director does not yet carry a motif across beats.
3. **Real evidence.** Everything is illustrative. A dated ad, a leaflet or a screenshot (verified, licensed) would be far more convincing; the system has no import path for real documents yet.
4. **Motion tension.** Slow push, tape, cuts only. Missing: slow zoom to an eye, pulsing red edge, flicker/glitch on reveal, freeze-frame, heartbeat-synced pulses, text that blurs then clears, redaction bars that peel away.
5. **Sound.** One bed and a few CC0 effects. Missing: sub-bass hits, heartbeat, reversed swells, a dedicated dark voice chain (closer mic, low-shelf lift, a touch of room), per-template sound kits.
6. **Director quality.** The local 30B model writes valid but plain plans, repeats generic objects, sometimes truncates the last line (an automatic fix rebuilds it from the narration but it comes out short). It needs better prompts or a stronger local model, plus a motif and tension-beat planner.
7. **Layout.** Content sits in the top 60% of the frame; ChoiceTree and Timeline are small; long Hindi labels can wrap.
8. **Per-template art.** Template previews reuse the engraved cut-outs. Each template's own art (grainy CCTV stills, polaroids, line diagrams, price tags) is defined but not yet generated and reviewed.
9. **Facts.** Scripts are drafts with a VERIFY list; no automatic source checking.
