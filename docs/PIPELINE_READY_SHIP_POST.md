# Ready, ship, post: how a video gets from a topic to every platform on time

## The flow (shorts and long films use the same one)
1. **Plan**: a card per day in the Hub Week tab (`content/weekplan.json`). Scripts for 29 Oct to 31 Jan are already on the cards.
2. **Build** (Hub, this Mac): script -> voice -> pictures -> render -> thumbnail -> publish copy. "Build next missing video" builds the earliest card that has a script but no video.
3. **Ship** (Hub button, one video at a time): uploads the finished mp4 and thumbnail to a GitHub Release (`video-video-<slug>`), adds an entry to `content/schedule.json` at the card's date and time (IST), commits the small files, pushes. It is a dry run first: the dialog shows exactly what will go up.
4. **Post** (GitHub Actions, `post-due.yml`, 10:55, 18:55 and 19:55 IST): downloads the release asset and posts Facebook and Instagram reels (Facebook also takes long films). Entries are marked before sending, retried up to 3 times, then "blocked" and an issue is opened.
5. **Check** (GitHub Actions, `readiness.yml`, every morning 08:00 IST): are the next 7 days ready (script ok, release has the mp4, a schedule entry exists)? It writes `content/readiness.json` and keeps ONE issue open while a day is empty ("Not ready: ..."). The Hub Week tab shows the same answer at the top ("Ready to post: 5 of the next 7 days") and has "Build next missing video".

## What is a "ready" day
Local (Hub): script accepted, video built, thumbnail, publish.json + social.json, shipped, scheduled. Remote (GitHub): script accepted, shipped, scheduled. YouTube is a warning, not a blocker (see below).

## Known limits (be aware)
- **YouTube** cannot be posted by GitHub from this repo: the upload needs the Google login that the Hub holds on this Mac, and it currently shows "expired or revoked". The Hub schedules YouTube natively (the video is uploaded private and YouTube flips it public at the time), so it must be uploaded from the Hub, not by Actions, until a refresh token is stored as a GitHub secret. Reconnect Google in the Hub first.
- **Instagram long reels** (over about 90 s) failed before with `ProcessingFailedError`; keep Instagram reels at or under about 90 s.
- **GitHub cron** can run 5 to 15 minutes late. Slots look 20 minutes ahead and 6 hours back, so a late run still posts.
- **Free minutes**: private repos get 2,000 minutes a month. post-due (3 runs a day) plus readiness (1 run a day, about 1 minute) stays far below that.
- **Release assets**: up to 2 GiB each; a share mp4 is about 90 MB. Old releases can be deleted after posting.
- **Secrets** that must exist in the repo: META_APP_ID, META_PAGE_ID, META_IG_USER_ID, META_PAGE_TOKEN (already used by post-due).

## Commands
- `node tools/content/readiness.mjs --need 7` : what is ready, what is missing (local checks).
- `node tools/content/ship.mjs <slug>` : dry run; add `--yes` to upload and commit, `--push` to push as well.
- `node planner/check-drafts.mjs` : every ready narration passes the Hub's pack check.
