# Outlier Topic Engine

What to make next month, per platform, from real data plus the festival calendar.

| Platform | Data | Honest limit |
|---|---|---|
| YouTube long and Shorts (ranked separately) | YouTube Data API: topic demand, views/day, views per subscriber, outlier videos with links | search results only (survivorship bias); ~2,900 of 10,000 daily quota units per run |
| Instagram | Graph API `business_discovery` on the handles in `planner/outlier-config.json` (posts whose likes + 3×comments beat that account's own median) | works only for business/creator accounts; hashtag search needs Meta app review (not approved) |
| Facebook | PROXY: YouTube long demand 55% + Shorts 15% + Instagram 20% + our own Page results 10% | Meta gives no competitor data (Page Public Content Access needs review) |
| Festivals | `planner/data/calendar-festivals.json` (Oct 2026 to Oct 2027) | lunar dates differ 1-2 days between panchangs (`uncertain_days`); used only for planning windows |

A topic tied to a festival is boosted when its **publish-by date** (festival minus lead days: YouTube long 12, Shorts 5, Facebook 5, Instagram 4) is close; the festival plan lists exact publish-by dates per platform.

## Runs
- GitHub Action `outlier-engine.yml`: the 25th (plans next month) and every Monday (refreshes the month in progress), or by hand: `gh workflow run outlier-engine.yml -f month=2026-11`.
- Needs secrets `YOUTUBE_API_KEY`, `META_PAGE_TOKEN`, `META_IG_USER_ID`.
- Result is stored on the **`data` branch**: `planner/data/monthly/<YYYY-MM>/{topics.json,topics.md,raw/}`, `latest.json`, `index.json` (every month is kept). Main stays clean.
- Hub: Topics tab → Outlier Topic Engine (Run now, Pull latest from GitHub, Add top 3 per platform to my topics).
- Local: `node planner/outlier-engine.mjs [--month YYYY-MM|auto] [--no-api] [--add-to-queue N]`.

Edit queries, handles, lead days, aliases in `planner/outlier-config.json`; add festivals in `calendar-festivals.json`.

## v2: multi-pillar, not restricted to one religion (2026-10-19)

KATHAAYA is a storytelling + psychology brand, not a single-god channel. The engine now researches **four pillars independently**, each with its own relevance filter, Instagram accounts, and (for Indian mythology only) festival boost:
- `mythology-india` -- all Indian traditions (Hindu, Buddhist, Jain, Sikh), not one god
- `mythology-world` -- Greek, Norse, Egyptian, Mesopotamian, Japanese, Maya...
- `psychology` -- everyday mind, behaviour, relationships
- `dark-psychology` -- manipulation awareness, persuasion, self-protection (a real, mainstream YouTube/Instagram genre; this is pop-psychology education, not instructions for harm)

Edit pillars in `planner/outlier-config.json` (`pillars.<id>`). `topics.json` now has `pillars: {...}` (one block each) plus `brand_overview` (top 20 across all pillars, deduplicated) and `trending_now_india`.

### Queries are discovered, not fixed
Every run expands each pillar's `seed_queries` with Google's own autocomplete suggestions (`planner/sources.mjs`, no key needed) -- real things people type, not just what we guessed. A handful of seeds becomes a changing set of real queries every run.

### YouTube quota: two keys, automatic fallback
`yt-outliers.mjs` tries `YOUTUBE_API_KEY` first; if that project's daily quota is exhausted it automatically switches to `YOUTUBE_API_KEY_KATHAAYA` (a second Google Cloud project, separate 10,000-unit/day quota) for the rest of the run. Both are set as GitHub secrets. If BOTH are exhausted, that run's YouTube rows are empty and `errors[]` says so in plain language -- Instagram, Trends and the autocomplete-discovered query list still produce a full report regardless.
**Do not run the engine more than 1-2 times a day** (one full 4-pillar run costs ~8,000-11,000 YouTube units) -- testing it repeatedly in one session is what exhausts both keys.

### Reddit (optional, not yet connected)
`planner/sources.mjs` has a Reddit reader, OFF until you add it: Reddit blocks anonymous reads from server IPs (GitHub Actions included) as of 2026, so it needs your own free "script" app.
1. reddit.com/prefs/apps -> "create app" -> type **script** -> name/description anything, redirect URI `http://localhost` -> Create.
2. Copy the string under the app name (client id) and the "secret" field.
3. Add as GitHub repo secrets: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` (and in `.env.local` for local runs).
Once set, add `"reddit_subs": ["mythology", "GreekMythology", "Psychology", "DarkPsychology"]` (pick real subreddits) to any pillar in `outlier-config.json` and the engine will pull their top posts automatically -- no code change needed.

### Google Trends
`sources.mjs` reads Google's free daily-trending RSS for India (no key) and cross-references it against every query: a topic that is currently trending gets a timeliness boost (`trending: true` on that row).
