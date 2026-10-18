# Instagram reach: why single-digit views, and what we do about it

## Diagnosis (measured 2026-10-19)
`@kathaaya.stories` has **0 followers and 1 post** (Graph API). Instagram shows a new Reel to a small sample of people who do NOT follow you; with no account history and one post, single-digit views are the normal start, not proof the content is bad. What moves it: **volume + consistency + the signals below**, for weeks.

## What Instagram ranks (secondary sources, consistent with each other; Meta/Mosseri primary figures not verified)
1. **Watch time / completion** (replays count). 2. **Sends (DM shares) per reach**: the strongest lever for people who do not follow you. 3. Likes per reach. Saves matter for evergreen content.
Reels up to 3 minutes can be recommended, but a Reel people leave early travels nowhere: our 20-60 second cuts beat the 2:30 film for cold reach.

## Trial Reels (what we do)
A Trial Reel is shown ONLY to non-followers first, so a weak post does not hurt the (future) follower base and a strong one can be graduated to followers.
- Publishing API: `trial_params={"graduation_strategy":"SS_PERFORMANCE"}` (Instagram graduates it automatically when it performs; `MANUAL` keeps it in trial until graduated in the app). Only for Reels, not carousels. Access depends on the account (threshold unpublished; reports around 200 followers). **The studio now sends trial_params first and falls back to a normal Reel if Instagram refuses**, and logs which happened.
- Graduation itself is not in the API: with `MANUAL` you graduate in the app.

## Trending audio (the honest answer)
- The Graph API cannot attach a trending song. Music is added only inside the Instagram app. Business accounts also cannot use the commercial music library.
- Our films carry original narration (counts as original audio; originality is rewarded, reposts are not). For a trending-sound version, upload that one Reel from the app and pick the sound there; keep the API/Hub for the original-audio version.
- Do not download and embed copyrighted songs: it gets muted or removed.

## Playbook (do all, every Reel)
1. **First 1-2 seconds are the whole game**: open on the strongest image + the question. We already open with the hook line; keep it under 10 words.
2. **Short beats long**: publish 25-45 s cut-downs (one idea, a new hook) next to the 2-3 minute film; loop point: last line sets up the first.
3. **Ask for a send, not a comment word**: end with one line like "यह कथा उसे भेजिए जिसने कभी सुनी न हो" (a send is the strongest signal; no "comment a word" bait, per owner rule).
4. **Captions**: keyword in the first line (what people search), 3-5 hashtags, links block (WhatsApp channel + website). Instagram search reads the caption.
5. **Cover**: designed thumbnail with a different phrase than the caption (now automatic, uploaded as cover_url).
6. **Cadence**: one Reel a day for 30 days beats three a week: the account has no history to rank. Use the daily list (Today tab).
7. **Seed the first hour**: post, then share the Reel to the WhatsApp channel and Facebook Page right away; sends and early watch time from real people are the cold-start signals.
8. **Profile**: bio carries the WhatsApp channel link and one line on what the account is; pin the best 3 Reels.
9. **Measure**: the daily insights job logs reach/likes; judge a post by watch time and sends in the app's Insights, not by views alone, and double down on the topic that wins (the Outlier Topic Engine suggests topics).
