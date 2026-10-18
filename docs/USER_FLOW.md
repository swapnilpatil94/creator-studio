# How a person makes a carousel and a 3-minute video with the Hub (no Claude Code needed)

Open `http://127.0.0.1:4180/hub` (keep it running: `bash tools/hub/install-launchd.sh`). You need a frontier model (Claude, GPT or Gemini) for the two steps marked **[model]**; everything else the studio does by itself.

## A. Carousel (about 12 minutes of Mac time)
1. **Topics** tab: add the topic (title, formats, pillar, English search words). Click **carousel** on its row: the Hub shows a prompt that already contains the writing rules, the paste format and real source passages.
2. **[model]** Paste that prompt into your frontier model. Copy its answer.
3. **Create** tab: paste the answer, click **Read it and check**. The QA gate lists what to fix (for example "source line cites 115, 125 but no claim points there"): tell your model what the gate said and paste the corrected answer. Repeat until it says *QA clean*.
4. **Save as draft**, then **Generate images with Flux** (Draw Things paints each picture, about 41 s each; any picture with lettering in it is redone automatically). If one picture is wrong, click **Redo this image** under it.
5. **Render carousel** (depth layers and a different modern layout per slide), look at the preview, click **I checked it: approve**.
6. **Schedule** or **Post now**.

## B. 3-minute vertical video from that carousel
1. **Carousel → Video** tab, card "3-minute video". Pick the carousel and click **Get the prompt for my frontier model**.
2. **[model]** Paste that prompt into your model; it writes the voice-over, one spoken line per row, from the same sources. Paste the answer into the box.
3. **Check the script**. The Hub shows lines, words and minutes, and flags repeats, QA problems and a script over 3 minutes. Fix with your model if needed.
4. **Make the video**. The studio voices it, plans every visual from the lines, paints only the pictures the carousel does not cover, builds depth and camera moves, renders, runs 13 checks, and prepares the cover and publishing kit. A table shows every stage and its time. Leave the box empty and the studio writes the script itself with its local model (weaker Hindi).
5. Preview in the same tab, then schedule it (Plan tab) or upload from the dashboard.

## What the studio will not do for you
Approve (a human act), post without your click, invent facts (every claim must be found in the source text), or finish if the sources are too thin: it then says so and makes a shorter video.
