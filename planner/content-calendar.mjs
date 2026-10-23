#!/usr/bin/env node
// 71-day YouTube content calendar. Cadence (KATHAAYA Growth Strategy doc, "Posting cadence" + "Does any of
// this guarantee views...", 2026-10-21, revised same day after the owner weighed real production capacity --
// a 15-25 min long needs ~5x the art/narration of a 3 min one): Short (2:00-2:30, 8:15 AM) every weekday
// except Saturday (5/week); Long (15-25 min, 11:00 AM, same story as that day's Short) on Thursday only
// (1/week -- cut from Tuesday+Thursday); Saturday is a rest day, no upload; Sunday keeps the existing
// flagship "Sanatan vs World" special (long only, 25-30+ min). A real festival on any other day gets promoted
// to a full extra long video too, capped at one per week -- a second festival the same week stays a Short.
// Pillar mix: 50% Garuda Purana / 28 Naraka series, 30%
// Shiva Secrets, 20% Naglok/Lok + world comparison (a deterministic repeating 10-slot rotation, not
// random). MOOD is a separate, explicit layer on top of the pillar (planner/moods.json, 12 moods): a
// festival date maps to a fixed mood; otherwise mood is picked from a deterministic weighted rotation
// (BHAY 40% / RAHASYA 20% / LOK_BRAHMAND 15% / MRITYU_PARLOK 10% / the other 8 moods split the remaining
// 15%) built with a fair weighted-interleave so no mood clusters even though it's not random.
// This is a PLANNING calendar, not a script generator: KATHAAYA's existing workflow is the owner reads the
// source Purana and writes the actual narration (see .claude memory "visuals unique, not template" --
// the owner brings scripts, the system doesn't invent scripture). So every slot that needs a specific
// traditional detail (which of the 28 Narakas, which exact Shiva story) is left as an explicit [FILL: ...]
// placeholder rather than a made-up name -- titles/hooks are real-data-informed templates to execute from,
// not finished scripts. "Why Mood+Festival = Views" cites one REAL video this format/mood actually is
// known to outlier on (planner/data/channel-outliers-*.json, a real channel's real video, real view
// count, real outlier ratio against that channel's own median, auto-tagged with the same mood) -- not a guess.
// usage: node planner/content-calendar.mjs [--from YYYY-MM-DD] [--days 45]
// -> CONTENT_CALENDAR.md, CONTENT_CALENDAR.csv (repo root)
import fs from "node:fs"; import path from "node:path"; import { DATA, rj, here } from "./lib.mjs";

const arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d;
const from = arg("--from", new Date(Date.now() + 864e5).toISOString().slice(0, 10));
const days = Number(arg("--days", 45));
const root = path.resolve(here, "..");

// --- real data in ---------------------------------------------------------------------------------
const MOODS = rj(path.join(here, "moods.json"), {});
const outlierFile = fs.readdirSync(DATA).filter(f => /^channel-outliers-\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop();
if (!outlierFile) { console.error("run planner/channel-outliers.mjs first"); process.exit(1); }
const outliers = rj(path.join(DATA, outlierFile), { videos: [] }).videos.filter(v => v.isOutlier);
const byNiche = n => outliers.filter(v => v.niche === n).sort((a, b) => b.outlierScore - a.outlierScore);
const refPools = { garuda: byNiche("garuda"), shiva: byNiche("shiva"), lok: byNiche("lok"), world: byNiche("world"), big: byNiche("big") };
for (const k of Object.keys(refPools)) if (refPools[k].length < 3) refPools[k] = [...refPools[k], ...refPools.shiva, ...refPools.big].slice(0, 15);
// Outliers grouped by their auto-tagged mood too (channel-outliers.mjs tags every video against moods.json) -- this is what grounds "Why Mood+Festival = Views" in a real video, not a guess.
const byMood = m => outliers.filter(v => v.mood === m).sort((a, b) => b.outlierScore - a.outlierScore);

const trends = rj(path.join(DATA, "trends.json"), { topics: [] }).topics;
const trendFor = id => trends.find(t => t.id === id);

const panchangFile = fs.readdirSync(DATA).filter(f => f.startsWith("panchang-") && f.endsWith(".json")).sort().pop();
const panchangEvents = panchangFile ? rj(path.join(DATA, panchangFile), { events: [] }).events : [];
const festFile = rj(path.join(DATA, "calendar-festivals.json"), { events: [] }).events;
const eventsByDate = new Map();
for (const e of [...festFile, ...panchangEvents]) if (!eventsByDate.has(e.date)) eventsByDate.set(e.date, e);

// --- pillar definitions (content angle -- separate from mood) --------------------------------------
const PILLARS = {
  garuda: { label: "Garuda Purana / 28 Naraka series", source: "Garuda Purana", niche: "garuda", seriesName: "Narak" },
  shiva: { label: "Shiva Secrets", source: "Shiv Purana / Skanda Purana", niche: "shiva", seriesName: "Rahasya" },
  lokworld: { label: "Naglok/Patal Lok + World comparison", source: "Naglok & Patal Lok traditions, compared with world mythology", niche: "lok", seriesName: "Lok" },
};
const ROTATION = ["garuda", "garuda", "shiva", "garuda", "shiva", "lokworld", "garuda", "shiva", "garuda", "lokworld"];

// --- mood layer: festival -> fixed mood; otherwise a deterministic weighted rotation ---------------
const FEST_MOOD = { ekadashi: "UPAY_VIDHI", purnima: "MRITYU_PARLOK", amavasya: "MRITYU_PARLOK", "tulsi-vivah": "SHRAP_VARDAN", "kartik-purnima": "YUDH_SHAKTI", masikshivratri: "RAHASYA", mahashivratri: "RAHASYA", shani: "BHAY", "vaikuntha-ekadashi": "KALYUG_BHAVISHYA", "gita-jayanti": "KALYUG_BHAVISHYA" };
// Substring fallback: the hand-curated calendar-festivals.json tags named festivals more specifically
// than panchang.mjs's generic tags (e.g. "sharad-purnima" / "karwa-chauth" rather than plain "purnima"),
// so an exact-tag miss still catches the underlying lunar event instead of silently falling through to
// the generic weighted rotation.
const FEST_MOOD_SUBSTR = [["kartik-purnima", "YUDH_SHAKTI"], ["purnima", "MRITYU_PARLOK"], ["amavasya", "MRITYU_PARLOK"], ["ekadashi", "UPAY_VIDHI"], ["shivratri", "RAHASYA"], ["tulsi-vivah", "SHRAP_VARDAN"]];
const festMoodFor = e => { if (!e) return null; const exact = e.tags.map(t => FEST_MOOD[t]).find(Boolean); if (exact) return exact; const hit = FEST_MOOD_SUBSTR.find(([sub]) => e.tags.some(t => t.includes(sub))); return hit ? hit[1] : null; };

// Weighted rotation, out of 100 -- rebalanced 2026-10-21 (KATHAAYA Growth Strategy doc, "Does any of this
// guarantee views...") against each mood's actual outlier rate in planner/data/channel-outliers-2026-10-20.json
// (weight ~ rate x sqrt(n), so a mood needs both a real rate AND a real sample before it gets a real share):
// the old weights (BHAY 40 despite a middling 5.5% rate; UPAY_VIDHI and AVTAR_LEELA at 2 despite the two
// highest rates measured, 8.4% and 8.1%) didn't track the data at all. RAHASYA keeps the largest share --
// its 6.1% rate rides on by far the largest sample (855 videos), which is what makes it the most reliable
// bet, not just a high one. NYAY and SHRAP_VARDAN stay small on purpose: real rates, thin samples (27, 31).
const MOOD_WEIGHTS = { RAHASYA: 20, AVTAR_LEELA: 13, UPAY_VIDHI: 12, BHAY: 10, PREM_TYAG: 10, MRITYU_PARLOK: 8, DHAN_KISMAT: 7, YUDH_SHAKTI: 6, LOK_BRAHMAND: 6, KALYUG_BHAVISHYA: 4, NYAY: 2, SHRAP_VARDAN: 2 };
// Same source, kept as rate rather than share: how often a video tagged this mood actually crossed the
// outlier bar (isOutlier=true) in the scan, not a target weight -- this is what drives the "Historical odds"
// column below. NYAY/SHRAP_VARDAN sit on thin samples (27/31 videos); treat those two rates as directional.
const MOOD_RATE = { UPAY_VIDHI: 8.4, AVTAR_LEELA: 8.1, DHAN_KISMAT: 6.7, RAHASYA: 6.1, BHAY: 5.5, MRITYU_PARLOK: 5.0, YUDH_SHAKTI: 4.7, PREM_TYAG: 4.5, LOK_BRAHMAND: 3.9, NYAY: 3.7, SHRAP_VARDAN: 3.2, KALYUG_BHAVISHYA: 2.8 };
const MOOD_RATE_AVG = +(Object.values(MOOD_RATE).reduce((a, b) => a + b, 0) / Object.keys(MOOD_RATE).length).toFixed(1);
// Fair weighted interleave (every mood spread evenly across the sequence by its share, not clumped at
// the start the way a naive "repeat each N times then concat" would be): at each tick, pick whichever
// mood is furthest BEHIND its target share so far. Deterministic -- same input always gives the same
// sequence, which is what makes this a reproducible rotation rather than a random draw.
function weightedInterleave(weights, length) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0), counts = {}; for (const k in weights) counts[k] = 0;
  const seq = [];
  for (let i = 0; i < length; i++) {
    let best = null, bestDeficit = -Infinity;
    for (const k in weights) { const target = weights[k] / total * (i + 1), deficit = target - counts[k]; if (deficit > bestDeficit) { bestDeficit = deficit; best = k; } }
    counts[best]++; seq.push(best);
  }
  return seq;
}
const MOOD_ROTATION = weightedInterleave(MOOD_WEIGHTS, 100);

// Cadence (KATHAAYA Growth Strategy doc, "Posting cadence" + "Does any of this guarantee views...", revised
// again 2026-10-21 after the owner asked about real production capacity): daily-both was budgeting short-film
// production time for a long-form length the data says needs to run 5-10x longer to actually compete. A real
// 15-25 min long video needs roughly 5x the art/narration of today's ~3 min "long" format (measured: the 3 min
// film used 21 art images, ~7/min -- a 16 min video at the same pace needs ~110+, ~80 min of machine art
// generation alone before the owner's own script-writing time, the actual bigger cost, which only the owner
// can estimate). The first version of this plan ran Long on Tue AND Thu (2/week) + the Sunday flagship = 3
// long videos/week baseline before any festival; the owner chose to cut that to ONE regular long/week (Thu)
// + the Sunday flagship, after seeing the real per-video cost, rather than keep 3/week on the data's say-so
// alone -- the data says longer wins, it says nothing about what one person can sustain writing every week.
// Shorts still run Mon-Fri (5/week, near the data's best-performing 2:00-2:30 length), and Saturday is a real
// rest day. Festival stacking is capped too: at most ONE extra festival-long beyond the Thu/Sun baseline per
// week -- a festival beyond that cap still gets full framing, just in the Short, not a second extra long film
// that week.
const LONG_DAYS = new Set([4]); // Thu only (getUTCDay: 0=Sun..6=Sat); Tuesday dropped 2026-10-21, see above
const mondayOf = dt => { const wd = dt.getUTCDay() || 7, m = new Date(dt); m.setUTCDate(dt.getUTCDate() - wd + 1); return m.toISOString().slice(0, 10); };
let garudaIdx = 0, shivaIdx = 0, lokIdx = 0, rotIdx = 0, moodRotIdx = 0, sundaySpecialIdx = 0, contentIdx = 0;
let weekKey = null, festivalLongUsedThisWeek = 0;
const rows = [];
for (let i = 0; i < days; i++) {
  const d = new Date(Date.parse(from) + i * 864e5), dateStr = d.toISOString().slice(0, 10), dow = d.getUTCDay();
  const wk = mondayOf(d); if (wk !== weekKey) { weekKey = wk; festivalLongUsedThisWeek = 0; }
  const ev = eventsByDate.get(dateStr), isSunday = dow === 0 && !ev; // a real festival on a Sunday takes priority over the generic weekly special
  // Saturday is the production buffer -- UNLESS a genuine festival lands there. The recurring weekly
  // "Shani-vaar" entry (planner/data/calendar-festivals.json tags every Saturday "saturday"/"shani") is not
  // a real festival, just the existing Saturday mood theme; treating it as one would mean Saturday is never
  // actually a rest day, since it fires every single week.
  const isRest = dow === 6 && (!ev || ev.tags.includes("saturday"));
  if (isRest) {
    rows.push({ date: dateStr, festival: "-", mood: "-", moodJustification: "-", longTitle: "-", shortTitle: "-", thumbText: "-", hook: "-", format: "Rest day -- no upload (production buffer; KATHAAYA Growth Strategy doc, \"Posting cadence\")", whyMoodViews: "-", sourcePurana: "-", historicalOdds: "-" });
    continue;
  }
  let pillarKey, mood, moodJustification;
  const festivalName = ev ? ev.name : "-";

  if (isSunday) {
    pillarKey = "lokworld";
    mood = sundaySpecialIdx % 2 === 0 ? "LOK_BRAHMAND" : "BHAY"; sundaySpecialIdx++;
    moodJustification = `Weekly "Sanatan vs World" special -- alternates LOK_BRAHMAND/BHAY by week (this is week's pick: ${mood}).`;
  } else {
    pillarKey = ROTATION[rotIdx % ROTATION.length]; rotIdx++;
    const fm = festMoodFor(ev);
    if (fm) { mood = fm; moodJustification = `Festival "${ev.name}" (tags: ${ev.tags.join(",")}) maps to ${mood} per the festival->mood table.`; }
    else { mood = MOOD_ROTATION[moodRotIdx % MOOD_ROTATION.length]; moodRotIdx++; moodJustification = `Weighted rotation slot (no festival today) -- ${mood} is ${MOOD_WEIGHTS[mood]}% of the 100-slot rotation.`; }
  }
  const P = PILLARS[pillarKey], moodInfo = MOODS[mood] || {};

  let seriesLabel = "";
  if (pillarKey === "garuda") { garudaIdx = garudaIdx % 28 + 1; seriesLabel = `Narak Part ${garudaIdx}/28`; }
  else if (pillarKey === "shiva") { shivaIdx++; seriesLabel = `Rahasya #${shivaIdx}`; }
  else { lokIdx++; seriesLabel = isSunday ? `Sanatan vs World #${lokIdx}` : `Naglok #${lokIdx}`; }

  const refPool = refPools[P.niche], ref = refPool.length ? refPool[contentIdx % refPool.length] : null;
  const pillarFill = pillarKey === "garuda" ? `[FILL: which of the 28 Narakas + the sin it punishes, from your Garuda Purana reading, Part ${garudaIdx}]`
    : pillarKey === "shiva" ? `[FILL: which Shiva story/secret from Shiv Purana or Skanda Purana for this slot]`
    : isSunday ? `[FILL: which Hindu concept + which world-mythology parallel to compare this week]`
    : `[FILL: which Naglok/Patal Lok episode or figure for this slot]`;
  const FEST_FILL = { SHRAP_VARDAN: "[FILL: the Tulsi/Shaligram Vivah katha -- which version/detail from your source]", UPAY_VIDHI: "[FILL: the specific upay/vrat-vidhi for today, in KATHAAYA's own voice, not a generic totka]", KALYUG_BHAVISHYA: "[FILL: the Gita/Vaikuntha Ekadashi teaching you want to cover]", MRITYU_PARLOK: "[FILL: which Purnima/Amavasya/pitru-dosha katha for today]", YUDH_SHAKTI: "[FILL: which Kartik Purnima / Dev Diwali katha for today]", RAHASYA: "[FILL: which Shivratri katha/secret for today]", BHAY: "[FILL: which Shani/dosha katha for today]" };
  const fillTopic = ev ? (FEST_FILL[mood] || pillarFill) : pillarFill;
  const sourcePurana = ev ? (mood === "SHRAP_VARDAN" ? "Vishnu Purana / Tulsi Vivah katha" : mood === "UPAY_VIDHI" ? "Shani/Navagraha tradition" : mood === "KALYUG_BHAVISHYA" ? "Bhagavad Gita / Vaikuntha Ekadashi tradition" : P.source) : P.source;

  const longTitle = ev ? `${ev.name} — ${fillTopic}` : `${P.label}: ${seriesLabel} — ${fillTopic}`;
  const shortTitle = ev ? `${ev.name} में क्या करें? (${fillTopic})` : `${seriesLabel}: ${fillTopic}`;
  const thumbText = ev ? ev.name.split(" / ")[0] : seriesLabel;
  const hook = ev ? `आज ${ev.name} है — ${fillTopic}` : `${P.source} के अनुसार ${fillTopic}`;

  const trendTopic = pillarKey === "garuda" ? trendFor("garuda-purana") || trendFor("narak-yamraj") : pillarKey === "lokworld" ? trendFor("naglok") || trendFor("greek-vs-hindu") : null;
  const searchVolume = trendTopic ? `"${trendTopic.suggestions.hi[0] || trendTopic.suggestions.en[0] || ""}" (planner/data/trends.json, topic ${trendTopic.id})` : "see planner/data/trends.json";
  const moodRef = byMood(mood)[contentIdx % Math.max(1, byMood(mood).length)] || ref;
  const whyMoodViews = moodRef
    ? `${moodInfo.name || mood} draws a "${moodInfo.audience || "general"}" audience -- real precedent: "${moodRef.title}" by ${moodRef.channel}, ${moodRef.outlierScore}x that channel's own median (${moodRef.format}), ${moodRef.views.toLocaleString()} views (${moodRef.url}), auto-tagged ${moodRef.mood === mood ? "exactly " + mood : "niche match"}. Search signal: ${searchVolume}.`
    : `No tracked-channel outlier auto-tagged ${mood} yet (see planner/data/channel-outliers-*.json) -- treat as exploratory until one lands. Search signal: ${searchVolume}.`;
  // A base rate, not a prediction: how often THIS mood crossed the outlier bar across 273 scanned channels,
  // against the 12-mood average. Historical odds, never a promise about this specific upload.
  const rate = MOOD_RATE[mood]; const mult = rate ? +(rate / MOOD_RATE_AVG).toFixed(1) : null;
  const historicalOdds = rate ? `${rate}% of ${mood} videos in the scan broke out (niche avg ${MOOD_RATE_AVG}%) -- ${mult}x avg` : "no rate on file for this mood";

  // format: Sunday flagship stays long-only; Thu carries the 1 regular long video (a festival landing on it
  // just adds festival framing, it was already a long day); a festival on any OTHER day gets promoted to
  // a full extra long video too, but at most once per week (festivalLongUsedThisWeek) -- a second, third,
  // fourth festival in the same festival-dense week still gets full treatment, just in the Short, so a
  // cluster of festivals (Diwali season) can no longer push the week past its production capacity.
  const festivalWantsExtraLong = !!ev && !isSunday && !LONG_DAYS.has(dow);
  const festivalGetsExtraLong = festivalWantsExtraLong && festivalLongUsedThisWeek < 1;
  if (festivalGetsExtraLong) festivalLongUsedThisWeek++;
  const format = isSunday ? "Long only -- flagship, 25-30+ min (weekly \"Sanatan vs World\" special)"
    : LONG_DAYS.has(dow) ? `Both -- Long 15-25 min + Short 2:00-2:30, same story${ev ? " (festival day)" : ""}`
    : festivalGetsExtraLong ? "Both -- Long 15-25 min + Short 2:00-2:30, same story (festival day)"
    : ev ? "Short only -- 2:00-2:30 (festival day, but this week's one extra long-form slot is already used -- full festival framing stays in the Short; KATHAAYA Growth Strategy doc, \"Posting cadence\")"
    : "Short only -- 2:00-2:30 (no long today; keeps production sustainable -- KATHAAYA Growth Strategy doc, \"Posting cadence\")";

  rows.push({ date: dateStr, festival: festivalName, mood, moodJustification, longTitle, shortTitle, thumbText, hook, format, whyMoodViews, sourcePurana, historicalOdds });
  contentIdx++;
}

// --- mood distribution (actual, over the generated run's content days -- rest days excluded, not the target weights) ------------------
const contentRows = rows.filter(r => r.mood !== "-");
const moodCounts = {}; for (const r of contentRows) moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
const moodChart = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map(([m, n]) => { const pct = Math.round(100 * n / contentRows.length); return `| ${m} (${MOODS[m]?.name || "-"}) | ${n} | ${pct}% | ${"█".repeat(Math.max(1, Math.round(pct / 2)))} |`; });
const restDays = rows.length - contentRows.length, longDays = rows.filter(r => r.format.startsWith("Both") || r.format.startsWith("Long")).length, shortDays = rows.filter(r => r.format.startsWith("Both") || r.format.startsWith("Short only")).length;

// --- write out ---------------------------------------------------------------------------------
const md = [
  `# KATHAAYA ${rows.length}-day Content Calendar (${from} to ${rows[rows.length - 1].date})`, "",
  `Cadence over this run: ${longDays} long videos, ${shortDays} shorts, ${restDays} rest days across ${rows.length} days -- see KATHAAYA Growth Strategy doc, "Posting cadence" for why (daily-both was replaced with Short Mon-Fri + Long Thu + Sunday flagship + Saturday off, cut from Tue+Thu after the owner weighed real production capacity 2026-10-21; a festival gets Both too, capped at one extra per week).`, "",
  `Pillar mix (content angle): 50% Garuda Purana / 28-Naraka series · 30% Shiva Secrets · 20% Naglok + world comparison, deterministic 10-slot rotation. MOOD (separate layer, planner/moods.json, 12 moods): a festival date maps to a fixed mood; otherwise a deterministic weighted rotation, rebalanced against each mood's actual outlier rate (RAHASYA 20% / AVTAR_LEELA 13% / UPAY_VIDHI 12% / BHAY 10% / PREM_TYAG 10% / 7 others split the remaining 35%). This is a PLANNING calendar: [FILL: ...] marks the one thing only the owner can fill in -- the exact traditional detail from their own reading of the source Purana. Everything else (mood auto-tag, outlier reference, historical odds, search signal, mix weighting, festival dates) is real, computed data, never a prediction about any single upload; see planner/data/channel-outliers-*.json, planner/data/trends.json, planner/data/panchang-*.json, planner/moods.json.`,
  "", "| Date | Festival | Mood | Mood Justification | Long Title (11:00, Thu/Sun) | Short Title (2:00-2:30, Mon-Fri) | Thumbnail Text | Format | Historical odds (mood) | Why Mood+Festival = Views |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map(r => `| ${r.date} | ${r.festival} | ${r.mood} | ${r.moodJustification} | ${r.longTitle} | ${r.shortTitle} | ${r.thumbText} | ${r.format} | ${r.historicalOdds} | ${r.whyMoodViews} |`),
  "", "## Mood distribution (this run, actual counts)", "",
  "| Mood | Days | % of run | |", "|---|---|---|---|",
  ...moodChart,
];
fs.writeFileSync(path.join(root, "CONTENT_CALENDAR.md"), md.join("\n"));
const esc = s => '"' + String(s ?? "").replace(/"/g, '""') + '"';
const header = Object.keys(rows[0]);
fs.writeFileSync(path.join(root, "CONTENT_CALENDAR.csv"), [header.join(","), ...rows.map(r => header.map(k => esc(r[k])).join(","))].join("\n"));
console.log(`${rows.length} days -> CONTENT_CALENDAR.md + .csv`);
console.log(rows.slice(0, 10).map(r => `${r.date}\t${r.festival}\t${r.mood}\t${r.longTitle}`).join("\n"));
console.log("\nmood distribution:", JSON.stringify(moodCounts));
