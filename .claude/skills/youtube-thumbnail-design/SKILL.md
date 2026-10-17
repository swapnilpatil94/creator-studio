---
name: youtube-thumbnail-design
description: Design KATHAAYA thumbnails (9:16 Shorts frame and 16:9) from the channel's real logo and palette: brand template, 120 px test, safe zones, contrast, text limits, upload limits. Use whenever tools/thumbnail.mjs is run or a thumbnail is reviewed.
---
# YouTube thumbnail design
Rules distilled (ideas only, no code) from `inferen-sh/skills` `youtube-thumbnail-design` (README MIT badge, no LICENSE file in the repo; we did not install its `belt` CLI or its paid image-generation workflow) and `kostja94/marketing-skills` (MIT). Brand facts come from the live channel (observed 2026-10-17).

## Brand (from the channel logo, banner and past thumbnails)
Logo: black circle, antique-gold ink-brush Devanagari "क" with ONE crimson brush stroke, ornate thin gold ring with four small diamonds, serif "KATHAAYA". Palette tokens live in `channels/kathaaya/youtube.json` (`brand.palette`): ink black, antique gold, crimson accent, warm white. Rule: **gold + ink black, crimson only as the single accent** (matches `channels/kathaaya/identity.json`). Past thumbnails: figure on one side, 2-line bold Devanagari title on the other (line 1 white, line 2 gold), thin rule, small wordmark top-left.

## The actual god (decided with the owner, 2026-10-17)
CTR comes from seeing the real deity: the thumbnail uses a **public-domain painting of the god in full colour** (see `stories/<name>/assets/CREDITS.md`), exactly like the channel's Ganesh covers (large painted figure, thick-outlined 2-line Devanagari title, red brush stroke, small parchment note, tiny "ANCIENT STORIES REIMAGINED" header and "STORIES THAT STAY" footer, round logo). The film itself shows the same painting as a coloured dot matrix. Never use an image whose licence you have not checked: dotting a copyrighted image does not remove the copyright.

## Rules (checked in `output/thumb-check.json` and shown in the dashboard)
- Sizes: 1280x720 minimum for 16:9 (we render 1280x720), upload JPG/PNG under 2 MB (the uploader converts to JPG). Shorts: 9:16 frame 1080x1920.
- **120 px test**: a 120-px-wide preview is generated (`thumb-120-*.png`); mood, subject and text must read there.
- Main title text <= 4 words (our limit; a separate small parchment note of <= 5 words is allowed), bold sans, >= 60 pt equivalent, shadow/stroke for contrast, never duplicates the title.
- <= 3 colours (ink black, gold, warm white; crimson only as the accent). Contrast ratio of text vs background >= 4.5:1 (computed).
- Safe zones: nothing important bottom-right (duration stamp) or bottom-left (progress/chapter marker) on 16:9.
- One focal point; the subject occupies 30-50% of the frame; eyes/gaze point toward the text.
- Honest: show a frame that is in the film.

## Process
1. Pick the frame time `t` from the film (the most readable subject frame), 2. line1 (white) + line2 (gold) <= 4 words total, the other half of the title's story, 3. run `node tools/thumbnail.mjs stories/<name>`, 4. view the 120 px previews and the checks in the dashboard, 5. approve there before upload.
