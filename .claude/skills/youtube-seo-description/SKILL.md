---
name: youtube-seo-description
description: Write the description, tags, chapters and Shorts text of a video aimed at the query a real person types, in the channel's own brand voice. Use before publishing; planner/seo.mjs builds and checks the package.
---
# YouTube SEO and description
Distilled from `Jakeschincariol/youtube-agent-skill` `yt-seo`, `yt-chapters`, `yt-shorts` (MIT) and `kostja94/marketing-skills` `youtube-seo` (MIT). We dropped kostja's marketing percentages (156%/89%/312% and AI-citation statistics are unsourced there) and kept only the mechanical rules.

## Search is a smaller lever than packaging
For subscriber-feed videos spend effort on `youtube-packaging`. For evergreen/festival topics (Navratri etc.) search matters: do the query test.

## Description
- The **first two lines** are all most viewers read and the search snippet: say what the video gives, in the words people type (Devanagari + the Roman spelling people search, e.g. "Maa Durga birth story"). Primary keyword in the first 160 characters.
- Then (long videos) chapters. Rules or they do not render: first is `0:00`, at least three, each >= 10 s. Retitle each as the promise of the section (3-5 words). Shorts: no chapters.
- Then the sourcing/variant note ("कथा के अनुसार…, ग्रंथों में भिन्न"), the AI/synthetic-media disclosure line, the channel brand line from `channels/kathaaya/youtube.json`, then 3-4 hashtags (the first three show above the title).
- Never claim a source you did not read; never stuff unrelated keywords (against YouTube's terms).

## Tags
Weak signal; use for spellings and disambiguation (Devanagari + Roman variants, deity names). **<= 15 tags**, <= 500 characters total. We mine tags used by >= 2 winning videos for the topic (data in `planner/data/outliers-*.json`), exclude other channels' names, then add curated ones.

## The query test
Write the three searches this video should win; the title and first two description lines must contain their words (checked in `publish.json`). If not, fix the title.

## Shorts text
A new first line (not the long video's), on-screen text of different words, a loop point (the last line sets up the first). Captions/subtitles stay in the film; do not paste the transcript into the description.
