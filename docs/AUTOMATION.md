# How the daily automation works (and what is real today, 26 Oct 2026)

## Three layers, three different places
| Layer | Runs on | Needs the laptop? | Status |
|---|---|---|---|
| **1. Make** the video (script -> voice -> pictures -> render) | this Mac (Hub, or `tools/content/factory.mjs`) | yes, awake, about 1.5 to 2.3 hours per video (a 3-minute long took 2 h 15 min) | works; every stage resumes from its cache after a crash, a closed lid or a reboot |
| **2. Hand over** (YouTube upload scheduled natively, Facebook scheduled natively, or a GitHub Release + schedule entry) | this Mac, at hand-over time only | only while uploading (minutes) | YouTube upload is BLOCKED: the Google login has expired. Facebook native scheduling works |
| **3. Post on time** | YouTube and Facebook servers (native schedule) or GitHub Actions `post-due` (10:55, 18:55, 19:55 IST) | **no** | post-due works on `main` (last runs green). Instagram posts from the Hub's LOCAL queue need the Hub running at post time |

## What goes out today (Mon 26 Oct) and the next days
- 26 Oct short (रौरव नरक): YouTube scheduled 19:00 (held by YouTube), Facebook scheduled 19:00 (held by Facebook), **Instagram waits in the Hub's local queue: the Hub must be running at 19:00**. Long (लाक्षागृह): Facebook scheduled 20:00; its YouTube copy is scheduled for 1 Nov.
- 27 Oct short (नीलकंठ): same as the 26th.
- **28 Oct has no script**: a gap.
- 29, 30 and 31 Oct (Baital, Tyr, Harishchandra long) are built but are **not uploaded or scheduled anywhere**. YouTube cannot take them until Google is reconnected.
- 1 Nov onward: scripts are ready, videos are not built.

## Why GitHub is not yet carrying the videos
`post-due.yml` can post Facebook and Instagram reels from a GitHub Release, and it runs fine, but nothing has been shipped to it, and all the new work (ship, readiness, status, factory) lives on branch `feat/reel-factory`, which is **not merged to main**. GitHub only runs workflows that are on main. Nothing was pushed.

## The new pieces (all dry-run or off by default)
- `node tools/content/status.mjs` and the Hub **Status** tab: every topic of every channel, script -> video -> GitHub -> YouTube/Facebook/Instagram, and the disk each one holds.
- `node tools/content/readiness.mjs`: is each of the next 7 days ready? `readiness.yml` asks the same on GitHub every morning and keeps one issue open while a day is empty.
- `node tools/content/ship.mjs <slug> --yes --push`: Release + schedule entry; re-encodes for QuickTime/phones when needed.
- `node tools/content/cleanup.mjs --yes`: frees disk, but only for videos that are safe elsewhere (GitHub Release, or both YouTube and Facebook hold them, and no Instagram post still needs the local file).
- `node tools/content/factory.mjs --run`: the overnight factory. Looks 7 days ahead, builds missing videos (resumable), ships when allowed, cleans up, flags gaps (no script, failed build, failed platform) in `content/factory-state.json` and as a macOS notification. Settings: `content/factory.json` (everything OFF), switchable in the Status tab. Template for running it nightly: `tools/launchd/com.kathaaya.autopilot.plist` (not installed).

## Keeping the Mac awake
The nightly job wraps itself in `caffeinate`. To wake a sleeping Mac for it: `sudo pmset repeat wakeorpoweron MTWRFSU 23:20`. A closed lid on battery will sleep regardless; keep it on power.

## Yantralok (hidden systems)
Topics run through Reel Factory (`reel-factory/episodes/_queue.json`) and show in the Status tab under their own heading. **No YouTube channel, Facebook page or Instagram account is connected for Yantralok.** To post it you need a second YouTube OAuth token (a second token file for that channel), a Facebook Page token and an Instagram business id (store as GitHub secrets `YANTRALOK_*`). Until then Yantralok videos can be made and kept, not posted.
