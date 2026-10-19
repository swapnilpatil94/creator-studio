# Publishing: thumbnails and Instagram carousels (what broke, how to debug)

## Instagram carousel did not post
Instagram cannot take carousel uploads. It downloads every slide from a public https address (`https://kathaaya.getbyterush.com/c/<slug>/NN.jpg`). After the blog moved to `site/`, nothing published the slides, so every URL was 404 and the post was skipped.
- Fix: `node tools/content/publish-assets.mjs carousel <slug>` (or Hub > Create > "Make slides public"), which copies slides to `site/public/c/<slug>/`, commits and pushes (also fast-forwards `main`, the only branch blog-deploy deploys). Wait ~3 minutes.
- Check: `node tools/content/publish-assets.mjs check https://kathaaya.getbyterush.com/c/<slug>/01.jpg` must say LIVE (or Hub "Check if public").
- Test without publishing: create a carousel-item container for one slide; status_code FINISHED means Instagram accepts it.

## No thumbnail on the uploaded video
- Instagram Reels: cover only via `cover_url` = public https image (`/covers/<story>.jpg`); without it Instagram takes a frame. The Hub upload never passed it. Now it publishes the cover first and asks you to upload again after it is live.
- Facebook Reels/videos: cover is uploaded as the preferred thumbnail (`/{video}/thumbnails`); the Hub upload never passed it. Fixed.
- YouTube: `thumbnails.set` uses `publish.json` `thumbnails[0]`; long films had none (needed owner artwork). `tools/video/make-thumb.mjs` now designs 9:16 and 16:9 thumbnails from a film painting + headline, run in the package stage. Shorts feeds never show custom thumbnails; the channel page and search do.
- Already published posts: Facebook cover can be replaced (setFacebookThumbnail); an Instagram cover cannot be changed through the API after publishing.

## "I still do not see the thumbnail" (checked live 2026-10-19)
The API shows the designed cover is set on all three: Instagram `thumbnail_url` of the new Reel is the cover, Facebook lists it as the preferred thumbnail, YouTube `maxresdefault.jpg` is the cover (portrait art on a blurred 16:9 canvas). What differs is WHERE each app shows it:
- Instagram: cover appears on the profile grid and Reels tab; in the feed and in the Reel player the video autoplays (no cover).
- Facebook: Reels tab / page video list; feed autoplays.
- YouTube Shorts: the Shorts feed autoplays and uses a frame; a custom thumbnail shows on the channel page and in search, not in the Shorts shelf.
Fix for future videos: the film now OPENS on the thumbnail look (painting, headline, logo) for the first ~0.5 s (engine `poster()`), so the cover is also the first frame everywhere, including autoplay and Shorts. Already uploaded videos are not re-posted (it would duplicate them).
