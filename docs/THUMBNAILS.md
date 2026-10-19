# Thumbnails (final strategy, 2026-10-19)

`tools/video/make-thumb.mjs` makes the thumbnail of every video as its own pipeline step ("thumbnail", timed in the Hub). One format per video: Shorts/Reels 9:16, long 16:9.

## What the local Flux setup supports (measured, not assumed)
- Model: FLUX.2 Klein 4B q6p through `draw-things-cli` (the default backend), 4 steps, ~35-45 s per 16:9 image, ~70 s per 9:16 image.
- **Negative prompt:** ignored at the default CFG (the distilled model gives the identical image, same md5). It only takes effect with `--cfg > 1`, which doubles the time. I tested `--cfg 2` on the Karna short: duplicated characters still appeared in 2 of 3 seeds, so it is OFF by default (`--cfg 2` turns it on; the spec's negative list is in `NEG`).
- **Reference images:** `--image <file> [--strength 0..1]` is supported by the CLI (img2img / reference conditioning). Wired as `--ref image.png --ref-strength 0.62` (default 0.62: keep composition and light, change the content). Not used unless asked.
- No other parameters are invented.

## Locked art direction (`LOCK` in the file)
Cinematic Indian epic concept art; obsidian #0B0B0B, antique gold #D4A017, ivory #F7E8C3, crimson #A71930, bronze #5A3A1B; gold is the main light, black the contrast, crimson the conflict; golden backlight, rim light, volumetric shafts, dust and smoke, mature dignified characters. This is the default palette for every video. The other four palettes (red, teal, purple, parchment) are used only when `THUMB_STYLE` asks for them.

## Two composition templates (`COMPOSITION`)
- **16:9:** main figure left half (chest up), the key action/object near the centre, supporting figure at the right edge and lower, crimson diagonal, dark calm upper-right for the headline.
- **9:16:** face and upper body dominate the upper/middle, glowing key object, golden halo, one focal point, dark clean lower section for the headline.
The story goes in the SCENE slot: `THUMB_SCENE` (free English, <= 70 words) or `THUMB_ART` (subject | emotion | symbol | backdrop) or, if neither is given, the writer model reads the narration. The artwork is generated WITHOUT text; the Hindi headline is added by the compositor.

## Choosing the best seed
3 seeds (16:9) or 4 (9:16) per thumbnail. Each is OCR-checked for lettering (redone if found), face-detected (macOS Vision: more than 2 faces, no face, a tiny face, or a face under the headline area all cost points), and scored on: dark calm text-safe area, contrast, gold present, no purple cast, saturation. The best is kept; `output/thumb-seeds-<ratio>.png` shows all candidates side by side (best outlined) so you can judge at thumbnail size and re-run with `--regen`.

## Headline placement
The compositor measures the finished painting: it puts the brush-stroke headline in the calmest corner and, if the text box would touch a detected face, shrinks it (100/88/78/68 %) or moves it. Gold for the key line, ivory for the rest, crimson only for the "?".

## Inputs (pack fields or the Thumbnail studio card)
`THUMB` (<= 5 words short, <= 7 long), `THUMB_SUPPORT`, `THUMB_STYLE`, `THUMB_ART`, `THUMB_SCENE`. All optional.
CLI: `node tools/video/make-thumb.mjs stories/<name> --ratio 16x9 --headline "..." --scene "..." --seeds 4 --regen`
