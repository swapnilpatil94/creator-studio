# KATHAAYA: Evidence-Led Mythology Topic Prediction System

**Research updated:** 2026-10-19  
**Repository branch:** `feat/global-mythology-topic`  
**Workflow:** [global-mythology-topic](../.github/workflows/global-mythology-topic.yml)  
**Monthly output:** `reports/global-mythology-topic-YYYY-MM.md` and matching JSON

## Executive decision

Build a **calibrated decision system**, not a “99% viral prediction” claim. Data improves decisions, but it cannot guarantee a platform outcome. Before any accuracy percentage is meaningful, we must define the outcome (for example, a video exceeds 2x the channel's median views after 7 days), collect enough historical examples, and evaluate on dates the model has never seen.

A 99% figure could be a target for engineering reliability (the scheduled job creates a valid report, records source data, and labels missing evidence). It is not a defensible target for predicting which video will go viral.

## What we learned from the first live run

- The workflow's Node syntax check and calendar JSON parse check passed.
- The first YouTube API research attempt failed after three story searches with Google's explicit error: **quota exceeded for the “Search Queries” daily limit**.
- That means the initial run did **not** provide a complete 30-topic comparison and did **not** generate its monthly report. Missing results must never be interpreted as low demand.
- The API key is configured (the runner reached the API), but the Google Cloud project quota is currently too low or exhausted. Re-running immediately without a quota fix or another data source will likely fail again.
- The planner has now been updated to stop on quota/rate-limit errors, preserve the partial evidence it did collect, label unresearched topics, and still write JSON and Markdown outputs.

**Required operational fix:** check the YouTube Data API quota for the Google Cloud project associated with `YOUTUBE_API_KEY`, request an appropriate quota if eligible, and avoid overlapping/manual runs. Search requests are expensive relative to ordinary video/channel lookups. Never share the key in logs or reports.

## Prediction target: define success before training

Track each published KATHAAYA video against a clear, format-specific label. Recommended primary label:

- **Short-form hit:** views at 7 days are at least 2x the rolling median of the channel's previous 20 Shorts that are at least 7 days old.
- **Long-form hit:** views at 7 days are at least 2x the rolling median of the channel's previous 20 long videos that are at least 7 days old.
- **Secondary outcomes:** views at 24 hours and 28 days, watch time, average percentage viewed, shares, subscribers gained, and returning viewers.

Keep Shorts and long videos separate. Also segment by duration band, language, packaging style, and topic tradition where sample size permits. Views alone are not the same as viewer satisfaction or business value.

## Evidence pipeline: multiple independent signals

### 1. Competitor outlier evidence

For every candidate story, collect public videos from several independent creators, their publish timestamps, format/duration, views, and engagement signals where available. Compare each video's performance against that creator's recent videos of the same format and age window. A raw view count is not an outlier metric.

Suggested features:
- number of independent creators with an outlier on the same subject;
- median and maximum same-channel outlier ratios;
- age-normalized view velocity at comparable ages;
- whether more than one video/creator confirms the signal;
- creator and format baseline sample sizes;
- recency and decay of the signal.

A topic appearing in many search results is not necessarily trending; search relevance is not a time-series trend measure.

### 2. Search interest and velocity

Add a separate search-interest input rather than treating YouTube search ranking as trend data. Use a documented source that permits the intended use, record region and date range, and retain the raw observations. A 7-day and 28-day comparison can indicate acceleration, while a year-over-year comparison helps separate recurring seasonal interest from a genuine spike.

Do not claim this input is present in the current YouTube-only implementation. It must be implemented and validated before it contributes to a model score.

### 3. Cultural calendar and publishing lead time

For each event record:
- event date, location/region, source URL, and date confidence;
- ideal publication lead time and production lead time;
- story angles tied to the correct tradition;
- whether the date is fixed, astronomical, lunar, or region-dependent;
- a verification deadline and fallback date.

Calendar relevance is a scheduling feature, not proof of demand. Publish early enough for discovery and indexing; do not blindly apply one universal lead time to every festival. Measure KATHAAYA's actual pre-event performance and update the lead-time policy by event class.

### 4. Audience fit and story quality

Use channel-owned analytics after publication: average percentage viewed, retention curve, viewed-vs-swiped-away (where available), shares, subscribers gained, and comments that show comprehension. These private creator metrics cannot be inferred from competitors' public view counts.

Human editorial review must verify source quality, version of the myth, cultural sensitivity, novelty, and whether the hook accurately represents the story.

## Scoring and model plan

### Phase A — usable baseline (current foundation)

- Channel-relative outlier ratios rather than raw views alone.
- Independent-creator corroboration.
- Format-aware baselines.
- Separate calendar boost from performance evidence.
- Source links and confidence labels.
- Partial report generation on API quota errors.

The current evidence score is a **heuristic ranking score**, not a calibrated probability. A score of 80 does not mean an 80% chance of success.

### Phase B — robust data collection

- Fix or increase YouTube Data API quota; implement bounded retries only for transient errors, exponential backoff, and a daily request budget.
- Cache raw search/video/channel responses with fetch timestamps so reruns do not spend quota repeating the same requests.
- Make collection incremental and record per-source status: success, quota blocked, rate-limited, stale, or missing.
- Add a separate time-series source for search interest, with regional context and source attribution.
- Store every prediction and its feature snapshot before publication, then append actual outcomes at 24h, 7d, and 28d.
- Make report generation independent of research success so a quota outage never erases the calendar.

### Phase C — probability model only after labels exist

Train a small, interpretable baseline first (regularized logistic regression). Compare it with gradient-boosted trees only when sample size supports them. Use time-based/walk-forward splits; random splits can leak seasonality and future information. Do not train on future performance signals unavailable on the decision date.

Report:
- Brier score and log loss for probability quality;
- calibration plot/reliability bins;
- precision@5 / precision@10 for topic selection;
- hit rate versus simple baselines (random, highest outlier score, calendar-only);
- confidence intervals and sample size;
- performance by month, tradition, format, and lead-time window.

A model may output, for example, “estimated 7-day hit probability: 0.34, low confidence” only after calibration. The value must be learned from historical outcomes, not assigned by intuition. Recalibrate when performance drifts.

## Avoiding false confidence

1. **No 99% promise:** virality is a noisy, adaptive platform outcome. Even a well-calibrated model cannot know audience response, creative execution, distribution changes, or competition in advance.
2. **No data is not negative data:** quota failures and missing observations are labelled as missing.
3. **No leakage:** only information available before the publish decision can be used to predict the outcome.
4. **No one-video validation:** measure performance across many consecutive uploads and future time windows.
5. **No score laundering:** keep observed evidence, editorial judgment, calendar timing, and calibrated probability in separate fields.
6. **No false cultural certainty:** verify regional and lunar dates; cite the specific source/tradition used in each script.

## Publishing decision policy

Use three buckets:
- **Publish candidate:** multiple independent outliers, clear audience fit, valid sources, and no unresolved cultural/date issue.
- **Test candidate:** promising but weak or conflicting evidence; test a distinctive angle, not a copy of the competitor's packaging.
- **Calendar/evergreen reserve:** useful story with limited performance evidence. Label it as unvalidated and don't imply it is an observed trend.

Reserve production capacity for timely events, but keep a mix of evergreen stories so the channel does not depend entirely on festivals. Re-rank weekly as new evidence arrives.

## Current limitations and next actions

- [ ] Resolve Google Cloud YouTube Data API quota exhaustion; check daily quota and quota history.
- [ ] Verify the new partial-report behavior in GitHub Actions and inspect the generated Markdown artifact.
- [ ] Add caching and a daily quota guard before expanding the query set.
- [ ] Add an approved search-interest source and a time-series collector.
- [ ] Define a standard outcome schema and begin recording KATHAAYA's own video results.
- [ ] Wait for a meaningful history of published videos before reporting predictive accuracy.
- [ ] Verify every festival date locally before finalizing the corresponding story.

## Source references

- YouTube Data API quota calculator and quota-cost documentation: https://developers.google.com/youtube/v3/determine_quota_cost
- YouTube Data API quota extension guidance: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- YouTube Analytics API overview (creator-owned performance data): https://developers.google.com/youtube/analytics
- YouTube Creator Academy / audience and analytics resources: https://creatoracademy.youtube.com/
- Calendar source entries are stored in `planner/global-cultural-calendar.json`; each event's source should be checked before use.

---
**Status:** Engineering changes are committed on the feature branch. The quota failure is confirmed. The updated workflow must complete successfully before the partial Markdown report can be treated as verified output. The prediction model described above is a staged plan, not yet a trained 99%-accurate model.
