# KATHAAYA YouTube content-calendar pipeline

Built in the existing Node/JS `planner/` architecture (not standalone Python) so it shares the project's
existing `.env.local` keys, data-branch storage convention, and GHA patterns. Every number in the output
is either a real API response or a real astronomical calculation -- nothing here is a guessed statistic.

## What each script does, in run order

1. **`node planner/channels.mjs`** -- resolves the seed handles + ~25 niche search queries (Garuda
   Purana, Shiv Puran, Naglok, "Sanatan AI"-style, world-mythology-comparison) into real channels via the
   YouTube Data API: real `channelId`, real subscriber count, real last-upload date. Writes
   `data/channels.json` + `data/channels.txt`. A channel is only marked `verified: true` if it has posted
   in the last ~200 days -- dead channels are kept in the list (so you can see what was checked) but
   excluded from everything downstream. **Slow and quota-heavy (~3,000 units); run weekly/manually, not
   every day** (`workflow_dispatch` input `refresh_channels` on the daily workflow, or run it by hand).

2. **`node planner/channel-outliers.mjs`** -- for every *verified* channel in `channels.json`, scores its
   last ~30 uploads against **that channel's own median** for the same format (short ≤180s vs long) --
   the same method `planner/yt-outliers.mjs` already uses for search-discovered videos, applied to a
   tracked channel list instead of a search query. `outlier_score = views / channel's own median (same
   format, min 5 baseline videos, 2000-view floor)`. Anything over 3.0x is flagged `isOutlier: true`.
   Writes `data/channel-outliers-<date>.json` + `.csv`. Cheap (~1 quota unit/channel), safe to run daily.

3. **`node planner/panchang.mjs --merge`** -- computes Ekadashi, Purnima, Amavasya, Masik/Maha Shivratri,
   Saturdays, Tulsi Vivah, Kartik Purnima and Vaikuntha Ekadashi/Gita Jayanti for the next 90 days using
   real sunrise-based Tithi astronomy (the `hindu-panchang` npm package -- see "the broken package" below),
   not scraped from a website. Cross-checked against the existing hand-curated `calendar-festivals.json`:
   the computed Amavasya for 2026-11-09 lands exactly on that file's already-listed Diwali date. `--merge`
   folds the named (non-weekly) events into both `data/calendar-festivals.json` (the file the live monthly
   `outlier-engine.mjs` actually reads) and `data/calendar-2026.json`. No API calls, free, instant.

4. **`node planner/trends.mjs`** -- live Google Suggest autocomplete (free, no key) for Garuda Purana,
   Narak/Yamraj, Naglok, Kailash, Kalki, afterlife, Greek-vs-Hindu, Egyptian topics, India + a "worldwide"
   proxy (the US trending feed -- Google's public trends RSS has no single real worldwide feed; this is a
   documented approximation). Also checks today's trending-searches RSS for a same-day match (expect this
   to usually be empty -- these are evergreen topics, not daily news spikes). Writes `data/trends.json`.

5. **`node planner/content-calendar.mjs`** -- the actual 45-day calendar. One long video (8:15am & 11am
   IST) + one short, same story (7:30pm IST) every day; weekly Sunday "Sanatan vs World" special. Mix:
   50% Garuda Purana/28-Naraka series (mood: bhay) / 30% Shiva Secrets (rahasya) / 20% Naglok+world
   comparison (vismay), as a deterministic repeating 10-slot rotation (not random, so it's reproducible).
   A festival date (from step 3) overrides the mix for that day with the matching mood (Ekadashi→upay,
   Tulsi Vivah→shrap-prem, etc). Every row cites one **real** outlier video from step 2 as "why this will
   get views" plus the live trend signal from step 4. Writes `CONTENT_CALENDAR.md` + `.csv` at the repo root.

   **This is a planning calendar, not a script generator.** Per the existing KATHAAYA workflow (the owner
   reads the source Purana and writes the real narration -- see the "visuals unique, not template" project
   note), any slot needing a specific traditional detail (*which* of the 28 Narakas, *which* Shiva story)
   is left as an explicit `[FILL: ...]` placeholder rather than an invented scripture detail. Titles/hooks
   are real-data-informed templates to execute from; the religious specifics are yours to fill from your
   own reading, same as every video so far.

6. **`node planner/format-plan.mjs`** -- reads `CONTENT_CALENDAR.csv` and takes each day's topic across
   every platform format already scheduled that day in `content/calendar.json` (carousel, fb_text,
   fb_long, yt_long) plus the long/short pair from step 5. Writes `FORMAT_PLAN.md` at the repo root.

## Running it all

```bash
npm install --prefix planner      # one-time (installs the patched hindu-panchang)
node planner/channels.mjs         # weekly/manual -- slow, quota-heavy
node planner/channel-outliers.mjs
node planner/panchang.mjs --merge
node planner/trends.mjs
node planner/content-calendar.mjs
node planner/format-plan.mjs
```

`.github/workflows/daily-content-calendar.yml` runs steps 2-6 every day at 6:00 IST (step 1 only on
`workflow_dispatch` with `refresh_channels: true`), stores the generated data + the two deliverable files
on the `data` branch (same convention as `outlier-engine.yml`), and opens/updates a "Content calendar
YYYY-MM-DD" GitHub issue with the next week inline so it reaches your phone via GitHub mobile. Pull the
full files locally any time with:

```bash
git fetch origin data && git checkout origin/data -- CONTENT_CALENDAR.md CONTENT_CALENDAR.csv FORMAT_PLAN.md planner/data
```

Needs repo secret `YOUTUBE_API_KEY` (already set; `YOUTUBE_API_KEY_KATHAAYA` is used as automatic quota
overflow, same as the existing outlier engine).

## The broken package (if you ever `npm install` fresh and it breaks again)

`hindu-panchang@1.0.1`'s published build has two packaging bugs: its `package.json` `"main"` points at a
`src/` folder that was never published (only `dist/` exists), and every file inside `dist/` imports its
sibling modules without a `.js` extension, which Node's strict ESM resolver rejects (works under bundlers/
CJS, not plain Node). `planner/fix-hindu-panchang.mjs` patches the installed copy's imports in place and
is wired as this package's own `postinstall` script, so a fresh `npm install --prefix planner` fixes
itself automatically. All astronomy code imports `hindu-panchang/dist/index.js` directly (bypassing the
broken `main` field) rather than `hindu-panchang` itself.

One non-obvious real detail of the library you'll hit if you touch `panchang.mjs`: its `Tithi.ino` is
**absolute across both pakshas** (0-14 Shukla, 15-29 Krishna, same 15 names reused) -- use `ino % 15` to
get the in-paksha tithi index that Ekadashi(10)/Purnima-or-Amavasya(14)/Chaturdashi(13) actually key off.
Getting this wrong silently drops every Krishna-paksha event (that was the first bug found while building
this).

## Honest limitations

- 5 of the 8 hand-given seed handles (`AIVisionbyRajesh`, `TheBhakt`, `Mahanitya`, `ShivPuranKathaHindi`,
  `GarudaPuranaKatha`) did not resolve via YouTube's `forHandle` lookup. Best-guess matches were found by
  name search for 2 of them (`Mahanitya` → real, 336k subs, active; `AIVisionbyRajesh` → "Rajesh AI
  Vision", 225 subs, active) and added as `verified`. The other 3's closest name matches are small, dead
  channels (0-49 subs, last post 2024) and were **not** added -- re-check the actual handle for those three.
- "Worldwide" trend data is a US-feed proxy, not a real worldwide aggregate (documented above and in
  `trends.json` itself).
- The weekly Sunday special and the 28-Naraka part numbers are a **deterministic rotation**, not pulled
  fresh from new outlier data every day -- re-run `content-calendar.mjs` after a `channel-outliers.mjs`
  refresh to pick up newer outlier references for the same slot structure.
