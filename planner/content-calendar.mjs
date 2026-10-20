#!/usr/bin/env node
// 45-day YouTube content calendar: one long (8:15 & 11:00 IST) + one short (7:30 PM IST, same story) per
// day, weekly Sunday "Sanatan vs World" special. Pillar mix: 50% Garuda Purana / 28 Naraka series, 30%
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

// Weighted rotation, out of 100: BHAY 40, RAHASYA 20, LOK_BRAHMAND 15, MRITYU_PARLOK 10, the other 8
// moods split the remaining 15 (2 each, one gets 1, so it sums exactly to 15).
const MOOD_WEIGHTS = { BHAY: 40, RAHASYA: 20, LOK_BRAHMAND: 15, MRITYU_PARLOK: 10, SHRAP_VARDAN: 2, PREM_TYAG: 2, YUDH_SHAKTI: 2, UPAY_VIDHI: 2, AVTAR_LEELA: 2, KALYUG_BHAVISHYA: 2, NYAY: 2, DHAN_KISMAT: 1 };
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

let garudaIdx = 0, shivaIdx = 0, lokIdx = 0, rotIdx = 0, moodRotIdx = 0, sundaySpecialIdx = 0;
const rows = [];
for (let i = 0; i < days; i++) {
  const d = new Date(Date.parse(from) + i * 864e5), dateStr = d.toISOString().slice(0, 10), dow = d.getUTCDay();
  const ev = eventsByDate.get(dateStr), isSunday = dow === 0 && !ev; // a real festival on a Sunday takes priority over the generic weekly special
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

  const refPool = refPools[P.niche], ref = refPool.length ? refPool[i % refPool.length] : null;
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
  const moodRef = byMood(mood)[i % Math.max(1, byMood(mood).length)] || ref;
  const whyMoodViews = moodRef
    ? `${moodInfo.name || mood} draws a "${moodInfo.audience || "general"}" audience -- real precedent: "${moodRef.title}" by ${moodRef.channel}, ${moodRef.outlierScore}x that channel's own median (${moodRef.format}), ${moodRef.views.toLocaleString()} views (${moodRef.url}), auto-tagged ${moodRef.mood === mood ? "exactly " + mood : "niche match"}. Search signal: ${searchVolume}.`
    : `No tracked-channel outlier auto-tagged ${mood} yet (see planner/data/channel-outliers-*.json) -- treat as exploratory until one lands. Search signal: ${searchVolume}.`;

  rows.push({ date: dateStr, festival: festivalName, mood, moodJustification, longTitle, shortTitle, thumbText, hook, format: isSunday ? "Long (weekly special)" : "Both (Long 8:15/11:00 + Short 7:30pm, same story)", whyMoodViews, sourcePurana });
}

// --- mood distribution (actual, over the generated run -- not the target weights) ------------------
const moodCounts = {}; for (const r of rows) moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
const moodChart = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map(([m, n]) => { const pct = Math.round(100 * n / rows.length); return `| ${m} (${MOODS[m]?.name || "-"}) | ${n} | ${pct}% | ${"█".repeat(Math.max(1, Math.round(pct / 2)))} |`; });

// --- write out ---------------------------------------------------------------------------------
const md = [
  `# KATHAAYA 45-day Content Calendar (${from} to ${rows[rows.length - 1].date})`, "",
  `Pillar mix (content angle): 50% Garuda Purana / 28-Naraka series · 30% Shiva Secrets · 20% Naglok + world comparison, deterministic 10-slot rotation. MOOD (separate layer, planner/moods.json, 12 moods): a festival date maps to a fixed mood; otherwise a deterministic weighted rotation (BHAY 40% / RAHASYA 20% / LOK_BRAHMAND 15% / MRITYU_PARLOK 10% / 8 others split 15%). This is a PLANNING calendar: [FILL: ...] marks the one thing only the owner can fill in -- the exact traditional detail from their own reading of the source Purana. Everything else (mood auto-tag, outlier reference, search signal, mix weighting, festival dates) is real, computed data; see planner/data/channel-outliers-*.json, planner/data/trends.json, planner/data/panchang-*.json, planner/moods.json.`,
  "", "| Date | Festival | Mood | Mood Justification | Long Title (8:15) | Short Title (58 sec) | Thumbnail Text | Format (Long/Short/Both) | Why Mood+Festival = Views |",
  "|---|---|---|---|---|---|---|---|---|",
  ...rows.map(r => `| ${r.date} | ${r.festival} | ${r.mood} | ${r.moodJustification} | ${r.longTitle} | ${r.shortTitle} | ${r.thumbText} | ${r.format} | ${r.whyMoodViews} |`),
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
