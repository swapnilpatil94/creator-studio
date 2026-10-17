---
name: youtube-packaging
description: Write and lint the title and thumbnail text of a KATHAAYA / Agentic AI video as ONE pairing (truncation, duplication, vagueness, 5 variants across formulas) in the channel's own style. Use before any publish step; planner/seo.mjs enforces the measurable rules.
---
# YouTube packaging (title + thumbnail text as one unit)
Distilled from `Jakeschincariol/youtube-agent-skill` `yt-package` (MIT) and our `titles-and-thumbnails`. Read `titles-and-thumbnails` too; this skill adds the rules we enforce in code.

## Inputs to read first
`channels/<channel>/identity.json` and `channels/kathaaya/youtube.json` (`brand`, `title_style`, baseline). Never invent a number, result or source.

## Rules (enforced by `planner/seo.mjs` checks)
- Title <= 100 chars hard limit; the part before `|` <= 60 chars (desktop truncation), key hook in the first ~40 (mobile feed).
- Primary keyword inside the first 55 chars. Channel style: Devanagari question + at most one emoji + ` | KATHAAYA`.
- Write **ten**, keep **five** across >= 4 formulas (question gap, pattern break, stakes, contrast, specific number/name). Show the recommended one with the gap it opens and who it qualifies.
- Thumbnail text <= 4 words (stricter than the 6-word generic rule: Devanagari at feed size), and it must **not repeat the title**: it carries the other half of the story.
- Pair test: cover the title, the thumbnail must still raise a question; cover the thumbnail, the title must still pull. Record the answer in `publish.review.json`.
- Honesty test: the film must deliver what the pair promises (no bait). A contested claim ("no mother") is allowed only if the film states it as the traditional account and the description carries the variant note.
- At most two ALL-CAPS words (Latin) in a title.

## Output
Five titles with formula, a thumbnail brief (focal point, 2-line text, what the background must do at 120 px), and the pairing-test result. The last step is human review in the dashboard: **ship it, or change it?**
