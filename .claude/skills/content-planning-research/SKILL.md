---
name: content-planning-research
description: Data-driven content planning for KATHAAYA and Agentic AI - research briefs with a claims ledger, analytics import, performance report, scored daily plan, hook lint. Use when deciding what to make next, researching a topic, or reviewing performance.
---

# Content planning and research

Tools live in `planner/` (plain Node, no dependencies). Research itself (web search, reading sources) is done by Claude in a session - the studio cannot browse.

## Weekly loop
1. **Import analytics** (CSV from YouTube Studio / Instagram Insights, or manual): `node planner/import-analytics.mjs data.csv` -> `planner/data/analytics.json`. Columns: `id,title,channel,format,topic,hook_type,published,duration_s,views,avg_view_pct,hold_3s_pct,shares,saves,subs_gained`. Official API access needs OAuth/app review; CSV works today.
2. **Report**: `node planner/report.mjs` -> `planner/data/report.md`: per channel/format/topic/hook medians, top and bottom videos, Spearman correlations - always with sample size and a *correlation, not causation* caveat; groups with n < 8 are labelled "insufficient".
3. **Backlog**: ideas in `planner/data/topics.json` (`channel,title,angle,tags,hook_options,status`). Mythology topics need a research brief; AI topics need verified product facts.
4. **Research brief + claims ledger** (`stories/<name>/claims.json`): every factual line in the script maps to `{beat, claim, status: verified|traditional-account|variant|interpretation|omitted, sources:[url or text+locator]}`. `node planner/claims-check.mjs stories/<name>` fails if a beat has no ledger entry or an unsourced `verified` claim.
5. **Plan**: `node planner/plan.mjs --date YYYY-MM-DD` -> up to 3 videos per channel, scored by evidence-weighted performance of the topic's tags (shrunk toward the channel mean when n is small), research readiness, novelty vs the last 14 days and series diversity. It prints why each was chosen.
6. **Lint the script**: `node planner/hook-lint.mjs stories/<name>` (hook length, specific question/claim, throat-clearing, caption reading speed, open loop and payoff, ending echo).
7. After publishing, add the row to the CSV next week; the loop closes.

## Research standards
- **Mythology**: separate traditional accounts (cite text + chapter/kanda/parva), regional variants (name the region/telling), and interpretations. Never present a disputed claim as settled; omit what you cannot source. Never invent shlokas.
- **AI/tech**: verify product capabilities, pricing and benchmarks against first-party docs or reproducible tests *on the day*; record the access date; show "as of <date>"; never fabricate numbers or demo results.
- Keep sources in the ledger, not in your head.

## What the data can and cannot say
Small samples, confounded topics, posting-time and algorithm drift: treat results as hypotheses. Use one-variable experiments (`retention-psychology` protocol) to learn causes.
