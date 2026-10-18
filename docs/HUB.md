# KATHAAYA Hub: run the whole content operation from one screen

`http://127.0.0.1:4180/hub` (start: `node studio-ui/server.mjs`; keep it always on: `bash tools/hub/install-launchd.sh`). The older `/dash` stays for video packaging, thumbnails and YouTube upload.

## What you do in it (and what it does for you)
| You | The Hub |
|---|---|
| **Topics** tab: paste a list of topics (title, formats, pillar, English search words) | adds them to the topic bank; for any topic builds the **prompt to paste into Claude/GPT/Gemini**: our writing rules, the paste format, and the real source passages retrieved from the corpus (so the model writes from text, not memory) |
| **Create** tab: paste the model's answer (labelled text or JSON) | parses it, runs the QA gate (hook, hashtags, bait, fake stats, claims against the sources, Hindi slips, image rules), shows what to fix |
| Click **Generate images with Flux** | starts ComfyUI if it is off (refuses during a video render), generates every slide with FLUX.2 Klein one by one with live progress, saves to the story folder (`content/art/<slug>`), stops Flux by itself after 10 idle minutes; **Redo this image** per slide |
| Click **Render carousel**, then **I checked it: approve** | lays Devanagari text over the art (1080×1350 JPEG), checks the AI-art disclosure, marks the item approved (a human act: the checklist is printed next to the button) |
| **Schedule** (date and time, Facebook/Instagram) or **Post now** | adds it to `content/schedule.json`; GitHub Actions or `node tools/content/post-due.mjs` posts it; Post now runs the poster immediately and shows the result |
| **Plan** tab | the next 30 days of slots (from `content/calendar.json`) with status: empty, scheduled, posted, failed; a table "what must get ready" (empty slots vs ready items per format); click a slot to assign an approved item or video, remove it, or post now |
| **Facebook / Instagram / YouTube** tabs | the same month filtered to that platform, the limits that apply, which items are ready or need work, and the state of every video story (voiced, rendered, packaged, approved, posted) |
| **Blog** tab | paste an article, validate (QA + Google News checklist), preview, publish: it saves, builds the site and pushes; Cloudflare Pages serves your subdomain |
| **Storage & limits** | disk free, what can be deleted and why, one-click clean (dry run first); API limits table and live Meta quota/token status |
| **System** | Flux start/stop, recent jobs, recent GitHub Actions runs |

## Why a Cloudflare token was on my list, and why it no longer has to be
The Hub's *Publish* button needs somewhere to send the site. Two ways: (a) **Git-connected Cloudflare Pages** (default, no token here): you connect the repo to a Pages project once in the Cloudflare dashboard, set the build command and your subdomain; every publish is a commit/push and Cloudflare builds and serves it. (b) Direct deploy with wrangler, which needs an API token and account id. We use (a). Setup steps are shown on the Blog tab. The Instagram carousel images also come from that site (Instagram needs public image URLs).

## Google News: what is built and what is not promised
Built (`blog/build.mjs`): `NewsArticle` structured data with headline ≤110, `datePublished`/`dateModified` with time zone, image, publisher logo (`/logo.png`), author, `isAccessibleForFree`; visible byline and date; canonical URLs; `news-sitemap.xml` (only the last 2 days, as Google requires) and `sitemap.xml`, RSS with `pubDate`, `robots.txt` pointing to both; About, Editorial policy, Corrections, Contact, Privacy pages. **Not promised:** inclusion. Google News is for timely reporting and decides itself; evergreen mythology is a weaker fit than pieces tied to a date (festival, tithi, anniversary), which is why each post has a **timely hook** field. The same markup serves Search and Discover, our realistic main targets. Steps: add the subdomain to Search Console, submit both sitemaps, apply in Publisher Center once there are real posts.

## Tech stack, and why (staff-engineer view)
- **Plain Node 22+ servers, no framework, no database service.** One process, one repo, runs on a laptop and in GitHub Actions. Fewer moving parts to break over months.
- **State is JSON files in git** (`content/items`, `queue/topics.json`, `schedule.json`, `calendar.json`): diffable, reviewable in pull requests, readable by GitHub Actions with no database credentials. Up to a few thousand items this is fast (the whole state loads in milliseconds). Upgrade path: Node's built-in `node:sqlite` for analytics and the schedule when the archive passes about 10,000 rows; the file format of items stays the source of truth.
- **Heavy work local, light work in the cloud.** Voice, FLUX, video render stay on the Mac (GPU, 24 GB RAM); GitHub Actions does QA, planning, posting, deploys, snapshots; Cloudflare serves files.
- **One heavy job at a time** (in-process job slot) and **Flux is a managed resource**: started on demand, health-checked, stopped when idle, refused while a video render runs. Prevents the RAM thrash we hit (stalled renders).
- **Deterministic, idempotent posting**: entries are marked before sending; retries never double-post; results are recorded in `schedule.json`.
- **Quality gates are code**: `qa-content.mjs` + `tests/` (the planning PDF's own bad example must fail) run in CI on every change.
- **Storage is a lifecycle, not an afterthought** (below).

## Storage lifecycle (so the disk does not fill)
| Artifact | Size seen | Rule |
|---|---|---|
| Render frames (`stories/*/output/frames`) | 1 to 19 GB each | the pipeline now deletes them when the mp4 passes QA (`keepFrames: true` in `story.json` to keep) |
| Bundled scene, pre-post voice master, rendered carousel slides (`content/out`), ComfyUI duplicate PNGs, scratch generations | tens of MB to ~1 GB | removed by **Clean** (regenerable) |
| Carousel art (`content/art/<slug>`, about 200 KB per slide) | small | kept in git (CI renders from it); local copies of posts older than 60 days are removable |
| Final mp4 + share copy | 90 MB to 1.2 GB | keep until posted everywhere, then archive (GitHub Release `video-<story>`) and delete locally |
| Schedule archive | tiny | entries older than 45 days move to an archive file (retention setting in `content/hub.json`) |
First clean on 2026-10-18 freed 24.5 GB (free space 75 GB to 91 GB).

## Limits and issues the Hub watches (see the Storage & limits tab for sources)
Facebook Reels 30/day via API, 3-90 s, 9:16; photos as unpublished uploads then one album post; schedule 10 minutes to 29 days. Instagram: carousel 2-10 JPEG images at **public** URLs, cropped to the first image's ratio, API quota shown live (100 per 24 h; the docs also state 50 for carousels, so plan for 50), Reels and carousels publish immediately (no scheduling in the API, so the queue publishes at the time). YouTube: 10,000 quota units/day means about 6 uploads (1,600 each); API projects that have not passed Google's audit have uploads forced to private. GitHub: scheduled workflows only from `main`, may start minutes late. Meta: your Page token is non-expiring; the app stays in Development mode (only people with a role on the app can use it).

## How to check it works, and how to keep it running
- **Tests:** `node tests/content-qa.test.mjs` (policy), `node tests/hub.test.mjs` (backend). Both run in GitHub Actions (`content-ci`) on every push, with actionlint on the workflows.
- **End-to-end proof (2026-10-18):** GitHub Actions rendered the Ganga art carousel and posted a 10-slide album to the Facebook Page; the daily insights snapshot ran; see `docs/AUTOMATION.md` section 9.
- **Daily glance:** Hub > Plan (any empty or failed slot), Storage (free space), System (Flux, jobs, Actions runs). Failed posting opens a GitHub issue.
- **Always on:** `bash tools/hub/install-launchd.sh` (restarts on crash and login). Flux manages itself.
- **Weekly:** merge the Sunday plan PR, approve drafts, glance at insights; monthly: look at the slot A/B data and edit `calendar.json`.

## Honest status
Done and tested: Hub backend and UI (plan, topics, brief, paste, QA, Flux auto start/stop, art, render, approve, schedule, post now, platform pages, blog validate/preview/publish, storage clean, limits, system), News-ready blog markup, pipeline frame cleanup, tests in CI. Not done: Instagram posting (needs the public host: connect Cloudflare Pages), YouTube scheduling from the Hub UI (the dashboard does it), Facebook native scheduling button in the Hub (post-due covers it), automatic archive of old schedule entries (rule defined, mover not yet written), SQLite analytics. The Hub has not been through a long soak test: expect small UI rough edges; every action reports errors instead of failing silently.
