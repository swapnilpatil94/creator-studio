---
name: content-qa-policy
description: Use before writing, approving or posting any KATHAAYA text story, carousel, blog or reel script. The editor's QA rules (source or silence, no invented stats, belief is not fact, no engagement bait, respect, originality, AI disclosure) and how the machine gate enforces them.
---
# Content QA policy (summary of docs/QA_POLICY.md)
Run `node tools/content/qa-content.mjs content/items/<id>.json`; fix every FAIL; get the human checklist ticked; only then `status: approved`.
- **Claims:** every factual line has a claim; `verified` claims cite `<corpus>:<section>` that retrieval can find (`tools/content/corpus.mjs search`); variants/traditions/interpretations are labelled in the text.
- **Banned:** invented stats ("99% लोग"), belief stated as fact ("आज भी जीवित"), keyword-comment asks ("Comment GANGA"), tag/share-or-else, jokes about deities, equating a sacred figure's humiliation with a modern case, links inside Facebook posts, more than 3 hashtags on Facebook text (5 on Instagram).
- **Style:** hook 3-10 words with a question word or number; no stock AI phrases ("आइए जानते हैं", "इस लेख में हम"); Devanagari ≥60% of letters; paraphrase translations, never copy them.
- **Always:** source_line, tradition_note (blog/reel), AI disclosure, cover/thumbnail set, human approval.
- Limits: retrieval proves topic words appear in the cited section, not that the paraphrase is faithful; the corpus holds the Mahabharata Adi Parva only so far. Read the passage yourself.
Test the gate: `node tests/content-qa.test.mjs` (the planning PDF's own example must fail).
