# Quality assurance policy: blogs, text stories, carousels, reels, long films

Owner of the policy: the manager (editor-in-chief). Enforced by code wherever a rule can be checked by a machine (`tools/content/qa-content.mjs`, `planner/*`, `tests/content-qa.test.mjs`), and by a human checklist where it cannot. A piece that fails any **FAIL** rule is never scheduled. A **WARN** needs a human tick.

## 1. Principles
1. **Source or silence.** Every factual line maps to a claim; every claim is `verified` against a named text, or labelled `tradition`, `variant` or `interpretation` in the copy.
2. **No invented numbers.** No statistic without a source. "99% लोग नहीं जानते" is banned.
3. **Belief is not fact.** "Hanuman is alive", "seen at N places" are written as मान्यता, with places named as places of belief.
4. **Respect.** No jokes about deities, no trivialising suffering, no communal or caste framing, no fear-marketing ("share or bad luck"), no boon guarantees.
5. **Original.** Our own telling, our own research. We paraphrase public-domain translations; verbatim passages are rejected.
6. **Honest about AI.** AI helps draft, voice and illustrate; a human approves; disclosure is on every post, the blog and the YouTube settings.
7. **Retention without bait.** One curiosity gap per hook; one real question or a save in the CTA; never a demanded keyword.

## 2. Pipeline and gates
| Gate | What happens | Who/what |
|---|---|---|
| 0 Intake | Topic from `content/queue/topics.json` with pillar, sensitivity (`normal`, `belief`, `hold`) and corpus. `hold` is never drafted without the manager's frame. | manager |
| 1 Research | Passages retrieved from the corpus (`tools/content/corpus.mjs search`), section numbers noted; variants listed. | writer (AI or human) |
| 2 Draft | Writer fills `content/items/<id>.json` including `claims` (text, English paraphrase `en`, status, `source: corpus:section`). | writer |
| 3 Automated QA | `qa-content.mjs` (below). Fails block. | CI on every push; again at post time |
| 4 Human review | Checklist in section 5, then `status: approved`. | manager |
| 5 Schedule | `plan-week.mjs` fills slots only with approved items; the weekly PR is reviewed. | manager |
| 6 Post | `post-due.mjs` re-runs QA at post time and refuses unapproved or failing items. | GitHub Actions or local |
| 7 Monitor | Insights snapshot daily; comments watched; corrections within 24 h. | automation + manager |

## 3. Automated rules (code -> meaning)
**Formats** `hook-length` (3-10 words) · `hook-gap` (question word or number) · `length` (FB text ≤ 900 chars) · `link` (no link inside a Facebook post: reach; the blog link goes in the first comment) · `hashtags` (≤3 FB text, ≤5 IG/carousel) · `slides` (5-10; Instagram's maximum is 10) · `slide-length` (hook ≤10 words, other slides ≤14) · `blog-length` (≥700 words), `blog-structure` (H1, ≥3 H2), `meta-description` (≤160), `tradition-note`, `faq` · `source-line` (every story post).
**Honesty** `fake-stat` · `hype` (unsupported superlatives) · `belief-as-fact` · `sensitive` (needs `human_approved`) · `trivialise` (Draupadi/workplace-type equations) · `joke-frame`.
**Claims** `claim-unverified` (the cited section does not surface for the claim in retrieval) · `claim-source` · `claim-status` · `unchecked-citation` · `label` (tradition/variant/interpretation must be labelled in the text).
**Claims also checked for coverage:** `claim-coverage` (the distinctive words of the claim's English paraphrase must occur in the cited section) and `source-line-mismatch` (every section number in the visible source line must be backed by a verified claim; this caught a model draft that cited sections it never used).
**Writing** `hindi-grammar` (known model slips such as "कौन ने"), `llm-draft` (WARN: written by a local model; needs a full human rewrite), `ai-slop` (stock AI phrases such as "आइए जानते हैं", "इस लेख में हम", "आज के डिजिटल युग में") · `repetition` · `emoji` (>3) · `devanagari` (<60% Devanagari letters).
**Bait** `engagement-bait`: "comment WORD", tag-bait, share-or-else, blessing-for-sharing.
**Originality** `duplicate` (>50% six-word-shingle overlap with another item in the same format) · `copied-translation` (a long English passage matching the corpus verbatim).
**Disclosure** `ai-image-disclosure` (slide-1 image must carry `ai_art_disclosed`) · `disclosure` (`ai_assisted` flag).
The rules are tested against the planning PDF's own example, which must fail, and against the corrected exemplars, which must pass (`node tests/content-qa.test.mjs`).

**Lesson from the first local-model draft (qwen3:14b, 2026-10-18):** it passed retrieval but contained wrong Hindi ("कौन ने"), a hallucinated detail (a tiger instead of a deer-form rishi) and citations to sections it never used. Local drafts are therefore labelled `writer: ollama:...`, get a WARN, and must be rewritten by a human; for quality use the Claude API writer. The failing draft is kept as `content/fixtures/local-model-bad-draft.json` and the test suite requires the gate to reject it.

**Known limits of the machine check** (so nobody over-trusts a green tick): retrieval proves the cited section *contains the topic words of the claim*, not that the sentence is a faithful paraphrase; it covers only the texts in the corpus (Mahabharata Adi Parva today); it does not judge tone, taste or theology. Hence gate 4.

## 4. Videos (Shorts, Reels, the long film)
Existing gates stay: `planner/gates.mjs` (skills read, topic evidence, claims ledger, hook lint, sound silences), audio checks (loudness, no clipping, no unintended silence, sync), frame checks (no blank, no frozen stretch over 1.5 s, motion present, captions on every beat), package checks (title/description/tags/thumbnail), human approval bound to the package hash. Additions in this policy: the Meta Reel spec checks (3-90 s, 9:16, ≥540×960, 24-60 fps, AAC 48 kHz) and the chapter checks for YouTube long videos (first at 0:00, ≥3, each ≥10 s, curiosity-gap titles).

## 5. Human review checklist (every item before `approved`)
- [ ] I read the cited passage, not only the claim list; the post says what the text says.
- [ ] Variants and later retellings are named as such (TV serials and regional tellings differ).
- [ ] No sentence could be read as mocking a deity, a community or a victim.
- [ ] The hook promises exactly what the post delivers (no bait-and-switch).
- [ ] The CTA is an open question or a save, not a demanded word.
- [ ] Devanagari reads correctly aloud (names, conjuncts, numerals); transliterations consistent.
- [ ] Image (if any) is respectful, correct iconography, flagged as AI art; no text errors in the picture.
- [ ] Disclosure is present; hashtags relevant; no link inside the post.
- [ ] For blogs: the page answers a real reader question in the first paragraph, has sources, a tradition note, FAQs from real questions, and does not duplicate another page.

## 6. Blog standards (E-E-A-T in practice)
Named editorial team and editorial policy page; sources at the end of every post; last-reviewed date; corrections policy; contact and privacy pages; no keyword-stuffed or near-duplicate pages; internal links between related katha; images with descriptive alt text; Article structured data. Volume is capped by human review: **no more posts per week than the manager can read** (target 2). Mass-publishing to rank is what Google calls scaled content abuse.

## 7. Platform-specific rules
- **Facebook:** original content only; no reposts or third-party watermarks; no link in the post body; hashtags ≤3; no engagement bait; Reels 3-90 s; set the cover (thumbnail) on every Reel and Page video.
- **Instagram:** keyword first line (captions behave like search text); ≤5 hashtags; AI flag on; carousel images JPEG ≤8 MB from a public URL; first image sets the ratio (we use 4:5); Reels need a cover (offset frame or `cover_url`).
- **YouTube:** chapters and credits in the description; synthetic-media flag; thumbnails at 16:9; no custom promises the film does not keep.

## 8. Corrections and incidents
Wrong fact found: fix the item, re-run QA, update every derived asset (the repurposing matrix makes this a single list), edit or re-post within 24 hours, log it in `docs/CORRECTIONS.md` with date, what was wrong, the source. Platform strike or demotion: stop auto-posting (disable `post-due` workflow), review the last 10 posts against this policy before resuming.

## 9. Sensitive topics
Maintained list in `qa-content.mjs` (`SENSITIVE`) and in the topic bank (`sensitivity`). Examples: sexual violence or humiliation scenes, caste, communal comparisons, suicide, contested historicity. They require `human_approved: true`, a long-form treatment with sources, and are excluded from hooks, memes and short text posts.

## 10. Definition of done by format
| Format | Done when |
|---|---|
| FB text | QA pass, ≤3 hashtags, source line, approved, scheduled in a slot |
| Carousel | QA pass, 5-10 slides rendered, JPEG ≤8 MB, last slide has one action, approved |
| Blog | QA pass (no FAIL, WARN resolved), ≥700 words, sources + tradition note, approved, builds in CI |
| Reel/Short | film gates pass, package checks pass, cover set, approved in the dashboard |
| Long film | all gates, chapters valid, thumbnail supplied, credits in the description, approved |
