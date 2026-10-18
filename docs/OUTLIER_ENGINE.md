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
