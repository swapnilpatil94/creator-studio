#!/usr/bin/env node
// Channel-based outlier detection (NOT query/search discovery): reads the fixed, verified channel list
// from planner/data/channels.json (built by planner/channels.mjs) and scores every one of each channel's
// recent uploads against that channel's OWN median for the same format (short <=180s vs long) -- the
// same statistically-sound method planner/yt-outliers.mjs already uses for search-discovered videos,
// applied here to a tracked channel list instead. outlier_score = views / channel's own median (same
// format, min 5 baseline videos; a 2000-view floor on the median avoids a near-zero median producing an
// absurd ratio). Threshold for "outlier" reporting: >3.0x (per spec), but every video's ratio is kept in
// the output so the calendar generator can also use near-misses.
// usage: node planner/channel-outliers.mjs [--per-channel 30] [--min-subs 0]
// -> planner/data/channel-outliers-<date>.json + .csv
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, ".."), D = path.join(here, "data");
const arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d;
const perChannel = Number(arg("--per-channel", 30)), minSubs = Number(arg("--min-subs", 0));

// Mood auto-tagging: match a video's title against every mood's keyword list (case-insensitive substring,
// works for both the Hindi/Devanagari and romanized keywords in moods.json); the mood with the most
// keyword hits wins, confidence = that count. No match -> mood null, confidence 0 (left for the calendar's
// own rotation/festival logic to assign, not guessed here).
const MOODS = JSON.parse(fs.readFileSync(path.join(here, "moods.json"), "utf8"));
function tagMood(title) {
  const t = title.toLowerCase();
  let best = null, bestN = 0;
  for (const [id, m] of Object.entries(MOODS)) { const n = m.keywords.filter(k => t.includes(k.toLowerCase())).length; if (n > bestN) { bestN = n; best = id; } }
  return { mood: best, mood_confidence: bestN };
}

let KEY = process.env.YOUTUBE_API_KEY; const envf = path.join(root, ".env.local"); if (!KEY && fs.existsSync(envf)) KEY = (fs.readFileSync(envf, "utf8").match(/YOUTUBE_API_KEY=(\S+)/) || [])[1];
let KEY2 = process.env.YOUTUBE_API_KEY_KATHAAYA; if (!KEY2 && fs.existsSync(envf)) KEY2 = (fs.readFileSync(envf, "utf8").match(/YOUTUBE_API_KEY_KATHAAYA=(\S+)/) || [])[1];
let usingKey2 = false;
if (!KEY) { console.error("missing YOUTUBE_API_KEY (put it in .env.local)"); process.exit(1); }
let units = 0;
const api = async (ep, params, cost) => { const u = new URL("https://www.googleapis.com/youtube/v3/" + ep); for (const [k, v] of Object.entries({ ...params, key: usingKey2 ? KEY2 : KEY })) u.searchParams.set(k, v); const r = await fetch(u); units += cost; const j = await r.json();
  if (j.error) { if (!usingKey2 && KEY2 && /quota/i.test(j.error.message)) { usingKey2 = true; console.error("[channel-outliers] primary key quota exhausted, switching to second project's key"); return api(ep, params, 0); } throw new Error(ep + ": " + j.error.message); }
  return j; };
const dur = s => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || "") || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };

const chFile = path.join(D, "channels.json");
if (!fs.existsSync(chFile)) { console.error("run planner/channels.mjs first (no " + chFile + ")"); process.exit(1); }
const channels = JSON.parse(fs.readFileSync(chFile, "utf8")).channels.filter(c => c.verified && c.subs >= minSubs);

const rows = [];
for (const ch of channels) {
  try {
    const cj = await api("channels", { part: "contentDetails", id: ch.channelId }, 1);
    const up = cj.items?.[0]?.contentDetails?.relatedPlaylists?.uploads; if (!up) continue;
    const pl = await api("playlistItems", { part: "contentDetails", playlistId: up, maxResults: perChannel }, 1);
    const ids = (pl.items || []).map(x => x.contentDetails.videoId); if (!ids.length) continue;
    const vj = await api("videos", { part: "snippet,statistics,contentDetails", id: ids.join(",") }, 1);
    const vids = (vj.items || []).map(v => ({ id: v.id, title: v.snippet.title, published: v.snippet.publishedAt.slice(0, 10), ageDays: Math.max(0.5, (Date.now() - Date.parse(v.snippet.publishedAt)) / 864e5), views: +v.statistics.viewCount || 0, short: dur(v.contentDetails.duration) <= 180 }));
    const shortV = vids.filter(v => v.short), longV = vids.filter(v => !v.short);
    const medShort = Math.max(median(shortV.map(v => v.views)), 2000), medLong = Math.max(median(longV.map(v => v.views)), 2000);
    for (const v of vids) {
      const base = v.short ? medShort : medLong, n = v.short ? shortV.length : longV.length;
      const ratio = n >= 5 ? +(v.views / base).toFixed(2) : null;
      const { mood, mood_confidence } = tagMood(v.title);
      rows.push({ channel: ch.title, handle: ch.handle, niche: ch.niche, subs: ch.subs, videoId: v.id, url: "https://youtu.be/" + v.id, title: v.title, published: v.published, ageDays: +v.ageDays.toFixed(1), format: v.short ? "short" : "long", views: v.views, viewsPerDay: Math.round(v.views / v.ageDays), channelMedianSameFormat: base, baselineN: n, outlierScore: ratio, isOutlier: ratio !== null && ratio > 3.0, mood, mood_confidence });
    }
  } catch (e) { console.error("channel failed:", ch.title, e.message); }
}

const date = new Date().toISOString().slice(0, 10);
const out = { date, method: "outlier_score = views / channel's own median views for same format (short<=180s vs long), min 5 baseline videos, 2000-view floor on median. mood = highest-keyword-count match against planner/moods.json's 12 moods (null if no keyword hits)", threshold: 3.0, channelsScanned: channels.length, quotaUnits: units, videos: rows };
fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, `channel-outliers-${date}.json`), JSON.stringify(out, null, 1));
const csvHeader = "channel,handle,niche,subs,videoId,url,title,published,ageDays,format,views,viewsPerDay,channelMedianSameFormat,baselineN,outlierScore,isOutlier,mood,mood_confidence";
const esc = s => '"' + String(s ?? "").replace(/"/g, '""') + '"';
const csv = [csvHeader, ...rows.map(r => [r.channel, r.handle, r.niche, r.subs, r.videoId, r.url, r.title, r.published, r.ageDays, r.format, r.views, r.viewsPerDay, r.channelMedianSameFormat, r.baselineN, r.outlierScore, r.isOutlier, r.mood, r.mood_confidence].map(esc).join(","))].join("\n");
fs.writeFileSync(path.join(D, `channel-outliers-${date}.csv`), csv);
const outliers = rows.filter(r => r.isOutlier).sort((a, b) => b.outlierScore - a.outlierScore);
console.log(`${channels.length} channels scanned, ${rows.length} videos, ${outliers.length} outliers (>3.0x), quota units: ${units}`);
console.log(outliers.slice(0, 30).map(r => `${r.outlierScore}x\t${r.views.toLocaleString()}\t${r.format}\t${r.niche}\t${r.mood || "-"}\t${r.channel}\t${r.title}`).join("\n"));
