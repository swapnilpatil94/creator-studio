---
name: meta-social-packaging
description: Use when preparing a KATHAAYA video for Facebook (Reels and long video) and Instagram (Reels) and when writing YouTube long-form descriptions and chapters. Holds the researched platform rules with their source and confidence, and what we deliberately do per platform.
---
# Meta + YouTube long-form packaging (researched 2026-10-17)
Code: `planner/social.mjs` (social.json), `planner/seo.mjs` (YouTube), `studio-ui/meta.mjs`, `tools/meta-setup.mjs`, `docs/META_SETUP.md`. Confidence tags: **[official]** from the platform's own docs, **[secondary]** blogs (can be wrong or stale), **[ours]** our judgement.

## YouTube long form
- Chapters: the list goes in the description; first stamp `0:00`; at least 3; each chapter at least 10 s; ascending order; manual chapters override automatic ones **[official, support.google.com/youtube/answer/9884579]**. `seo.mjs` checks all four and refuses bare labels ("Part 2") **[ours, long-form-youtube]**.
- Chapter titles can appear as key moments in search **[secondary]**: write them as curiosity gaps with the keyword when natural.
- Description order **[ours]**: hook line + primary keyword in the first ~100-160 characters (shown before "more"), summary, chapters, source/picture credits (public-domain paintings are credited), variant note, brand line, AI disclosure, hashtags (first 3 show above the title). Pinned comment text is generated for you to paste (the API upload tool does not post comments).

## Facebook
- Reels API: MP4, 9:16, 1080x1920 recommended (min 540x960), 24-60 fps, **3-90 s**, AAC 48 kHz; flow = start session, upload to rupload.facebook.com, finish with `video_state` DRAFT/SCHEDULED/PUBLISHED, optional `description` (hashtags allowed) and `title`; 30 API-published Reels per Page per 24 h; Page token from a user with CREATE_CONTENT; permissions pages_show_list, pages_read_engagement, pages_manage_posts **[official]**. A copyright check runs at upload and violations "may have restricted access or be subject to monetization impacts" **[official]**.
- Long video = a normal Page video (the Reels API is for vertical clips up to 90 s) **[ours from official limits]**.
- **No YouTube link in FB/IG copy** **[owner decision, 2026-10-17]**: keep viewers on-platform for Meta monetization and reach.
- Monetization: eligibility numbers conflict across sources (5k vs 10k followers; various watch-minute rules); originality matters (reposts, watermarked clips, static slideshows are deprioritised or excluded); in-stream ads reportedly need 3+ minute videos **[secondary, unverified]**. Never promise a threshold: the creator's Monetization page in Meta Business Suite is the truth.
- Description **[ours]**: first line = the hook, 2-3 lines of summary with the keywords, 3 hashtags, no external links, disclaimer + AI disclosure.

## Instagram
- Content Publishing: professional account; Reels container with `video_url` (public) or resumable upload (Facebook Login for Business only) to rupload.facebook.com; poll `status_code`; `media_publish`; 100 API posts per 24 h; `is_ai_generated=true` supported; `alt_text` is NOT supported for reels; trial reels via `trial_params` **[official]**. No draft state, so an API upload publishes at once.
- Caption **[secondary + ours]**: captions work like search text, so put the searchable words in the first line and body; 3-5 hashtags in the caption (vendor claims differ; the platform allows up to 30); first line under ~125 characters; AI disclosure in text and flag.
- A 16:9 film is not an Instagram Reel: cut 3-5 vertical Shorts from it (long-form-playbook).

## What to re-verify before relying on it
Graph API version numbers, monetization thresholds, and whether a Development-mode app is enough for your own accounts.
