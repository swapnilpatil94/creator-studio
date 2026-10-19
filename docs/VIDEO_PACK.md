# Making a video from the Hub (no carousel needed)

Hub → **New video**. Three steps, everything else is automatic.

1. **Topic + format → "Get the strict prompt".** Short = vertical 9:16, 45 s to 3 min. Long = horizontal 16:9, 3 to 12 min with chapters. The prompt is generated from the code, so it lists exactly what the engine understands (all 30 effects, 10 backdrops, 7 kinetic styles, 5 hand-drawn marks, stickers, intents, looks) and the hard limits the checker enforces. Optionally paste the scripture passages the model must stay inside.
2. **Give the prompt to your frontier model, paste its answer.** **Check it** shows what was understood beat by beat, errors in red, warnings in yellow, and the estimated machine time.
3. **Make the video.** Steps appear live (script, prepare, voice, director, art, layers+scene, camera, sound, render+QA, package) with the real seconds of each; the finished video and thumbnail appear on the page. One full-quality file is produced (`<name>-upload.mp4`); there is no preview copy.

## The input pack (labels are read by `tools/video/pack.mjs`)
| Label | Required | What the system does with it |
|---|---|---|
| FORMAT | yes | `short` (1080x1920) or `long` (1920x1080: paintings, camera, captions, thumbnails and QA all switch to landscape) |
| TITLE | yes | the hook; YouTube title before " \| KATHAAYA"; beat 1 must restate it |
| SLUG | no | latin id of the folder (made from the title if absent) |
| THUMB / THUMB_SUPPORT | no | thumbnail headline (<= 4 words, must not repeat the title) and small line; else "<subject> का सच" |
| SOURCE_LINE, TRADITION, HASHTAGS | no | description, captions, carousel/blog lines, hashtags |
| LOOK | no | `mood grade captions transition motif bg hue`: fixes any part of the film's look; the rest is picked uniquely per film |
| NARRATION | yes | one spoken line per beat: `N \| [intent] text`, `*word*` = punch word, `## Title` starts a chapter (long needs 3+) |
| SCENES | no | `N \| subject \| action \| setting \| light` English picture prompts (budgets 9/9/8/6 words): your prompt beats the local model's |
| VISUALS | no | `N \| comp= fx= style= bg= mark= sticker= move= reveal= label= behind= text=`: direct a beat; every value is validated against the engine's lists |
| CLAIMS | no | claim \| English source quote \| verified \| source ref |

Limits: short 130 to 540 words, long 540 to 2160 words (the voice speaks 3 words a second); each line about 5-16 words (long 6-20); numbers as words; no Latin letters in Hindi lines.

## How the visuals are decided
`look` (palette, caption style, grade, transition) is chosen from the story's mood + a seeded hash and never repeats recent films; the **director** reads each line and picks a component (painting with camera move, kinetic type, quote, stat, bars, timeline, icon list, dot-word...) and one of the 30 effects under pacing rules (no effect three times in a row, 5+ scene types a minute, text scenes hide subtitles); your SCENES/VISUALS/LOOK are applied on top and always win. Text scenes sit on one of ten animated backdrops (`ink-clouds nebula embers temple-jali yantra water-ripples mountain-mist storm gold-bokeh kolam`), a different one for neighbouring scenes unless you set `bg`.

## Long horizontal video: what is different
Same stages, 16:9 everywhere: FLUX paintings at 1344x768 (upscaled to 1920x1080), DepthFlow camera clips at 1920x1080, landscape caption position, chapters from your `##` lines become YouTube chapters (needs `0:00` and 3+), 16:9 thumbnail for YouTube/Facebook, chunked upload to Facebook. Expect about 2 hours of machine time for 8 minutes (voice is about 6x the speech length; paintings about 45 s each; render about 0.8x the film length).
