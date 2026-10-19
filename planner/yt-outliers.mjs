#!/usr/bin/env node
// Data-based outlier finder using the YouTube Data API v3 (official). Reads YOUTUBE_API_KEY from .env.local (gitignored) or the environment.
// For each query: recent search results -> video + channel stats -> outlier ratio = views / median views of that channel's last ~25 uploads in the SAME format (short <=180s vs long).
// Also reports views/day and views per subscriber. Output: planner/data/outliers-<date>.json + .md. Quota: search.list 100 units each (10,000/day default).
// usage: node planner/yt-outliers.mjs --channel kathaaya --queries "q1|q2|q3" [--days 120] [--lang hi] [--per 25] [--label name]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "..");
const arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d;
let KEY = process.env.YOUTUBE_API_KEY; const envf = path.join(root, ".env.local"); if (!KEY && fs.existsSync(envf)) KEY = (fs.readFileSync(envf, "utf8").match(/YOUTUBE_API_KEY=(\S+)/) || [])[1];
// second project's key (separate 10,000/day quota): used automatically when the first is exhausted, so one busy research day does not block the whole engine. Same quota reset schedule, different project.
let KEY2 = process.env.YOUTUBE_API_KEY_KATHAAYA; if (!KEY2 && fs.existsSync(envf)) KEY2 = (fs.readFileSync(envf, "utf8").match(/YOUTUBE_API_KEY_KATHAAYA=(\S+)/) || [])[1];
let usingKey2 = false;
if (!KEY) { console.error("missing YOUTUBE_API_KEY (put it in .env.local)"); process.exit(1); }
const channelTag = arg("--channel", "kathaaya"), queries = arg("--queries", "").split("|").map(s => s.trim()).filter(Boolean), days = Number(arg("--days", 120)), lang = arg("--lang", "hi"), perQ = Number(arg("--per", 25)), label = arg("--label", channelTag);
if (!queries.length) { console.error("give --queries 'a|b|c'"); process.exit(1); }
let units = 0; const api = async (ep, params, cost) => { const u = new URL("https://www.googleapis.com/youtube/v3/" + ep); for (const [k, v] of Object.entries({ ...params, key: usingKey2 ? KEY2 : KEY })) u.searchParams.set(k, v); const r = await fetch(u); units += cost; const j = await r.json();
  if (j.error) { if (!usingKey2 && KEY2 && /quota/i.test(j.error.message)) { usingKey2 = true; console.error(`[yt-outliers] primary key quota exhausted, switching to the second project's key for the rest of this run`); return api(ep, params, 0); } throw new Error(ep + ": " + j.error.message); }
  return j; };
const dur = s => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || "") || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
const after = new Date(Date.now() - days * 864e5).toISOString();
const found = new Map();
for (const q of queries) {
  const j = await api("search", { part: "snippet", q, type: "video", maxResults: perQ, order: "viewCount", publishedAfter: after, regionCode: "IN", relevanceLanguage: lang, safeSearch: "none" }, 100);
  for (const it of j.items || []) if (!found.has(it.id.videoId)) found.set(it.id.videoId, { id: it.id.videoId, queries: [q] }); else found.get(it.id.videoId).queries.push(q);
}
const ids = [...found.keys()], vids = [];
for (let i = 0; i < ids.length; i += 50) { const j = await api("videos", { part: "snippet,statistics,contentDetails", id: ids.slice(i, i + 50).join(",") }, 1); vids.push(...j.items); }
const chIds = [...new Set(vids.map(v => v.snippet.channelId))], chans = {};
for (let i = 0; i < chIds.length; i += 50) { const j = await api("channels", { part: "snippet,statistics,contentDetails", id: chIds.slice(i, i + 50).join(",") }, 1); for (const c of j.items) chans[c.id] = c; }
const base = {}; // channel baselines per format
for (const cid of chIds) {
  const up = chans[cid]?.contentDetails?.relatedPlaylists?.uploads; if (!up) continue;
  try {
    const pl = await api("playlistItems", { part: "contentDetails", playlistId: up, maxResults: 25 }, 1), vi = pl.items.map(x => x.contentDetails.videoId);
    const vs = await api("videos", { part: "statistics,contentDetails,snippet", id: vi.join(",") }, 1);
    const rows = vs.items.map(v => ({ views: +v.statistics.viewCount || 0, short: dur(v.contentDetails.duration) <= 180, age: (Date.now() - Date.parse(v.snippet.publishedAt)) / 864e5 })).filter(r => r.age > 3);
    base[cid] = { short: median(rows.filter(r => r.short).map(r => r.views)), long: median(rows.filter(r => !r.short).map(r => r.views)), nShort: rows.filter(r => r.short).length, nLong: rows.filter(r => !r.short).length };
  } catch (e) { base[cid] = null; }
}
const out = vids.map(v => {
  const d = dur(v.contentDetails.duration), short = d <= 180, views = +v.statistics.viewCount || 0, age = Math.max(0.5, (Date.now() - Date.parse(v.snippet.publishedAt)) / 864e5), cid = v.snippet.channelId, b = base[cid], n = b ? (short ? b.nShort : b.nLong) : 0, med = b ? (short ? b.short : b.long) : 0, subs = +chans[cid]?.statistics?.subscriberCount || 0;
  return { id: v.id, url: "https://youtu.be/" + v.id, title: v.snippet.title, channel: v.snippet.channelTitle, subs, published: v.snippet.publishedAt.slice(0, 10), ageDays: +age.toFixed(1), format: short ? "short" : "long", durationS: d, views, viewsPerDay: Math.round(views / age), likes: +v.statistics.likeCount || 0, comments: +v.statistics.commentCount || 0, channelMedianSameFormat: med, baselineN: n, outlierRatio: n >= 5 ? +(views / Math.max(med, 2000)).toFixed(2) : null, viewsPerSub: subs ? +(views / subs).toFixed(2) : null, queries: found.get(v.id).queries, tags: (v.snippet.tags || []).slice(0, 8) };
});
const date = new Date().toISOString().slice(0, 10), D = path.join(here, "data"); fs.mkdirSync(D, { recursive: true });
const res = { date, label, channel: channelTag, days, lang, queries, quotaUnits: units, videos: out };
fs.writeFileSync(path.join(D, `outliers-${label}-${date}.json`), JSON.stringify(res, null, 1));
const top = out.filter(v => v.outlierRatio !== null && v.ageDays >= 3 && v.views >= 50000).sort((a, b) => b.outlierRatio - a.outlierRatio).slice(0, 25);
const md = [`# Outliers: ${label} (${date})`, "", `Queries: ${queries.join(" | ")}. Window ${days} days, language ${lang}. Outlier ratio = views / max(channel median of its last ~25 uploads in the same format, 2000) (needs >= 5 baseline videos; the 2000 floor stops near-zero medians producing absurd ratios). API units used: ${units}.`, "", "| ratio | views | /day | fmt | subs | channel | title | query |", "|---|---|---|---|---|---|---|---|", ...top.map(v => `| ${v.outlierRatio}x | ${v.views.toLocaleString()} | ${v.viewsPerDay.toLocaleString()} | ${v.format} | ${v.subs.toLocaleString()} | ${v.channel} | [${v.title.replace(/\|/g, " ")}](${v.url}) | ${v.queries[0]} |`)];
const topicRows = queries.map(q => { const a = out.filter(v => v.queries.includes(q)), pd = a.map(v => v.viewsPerDay), s = a.filter(v => v.format === "short").length; return `| ${q} | ${a.length} | ${a.filter(v => v.views >= 100000).length} | ${a.filter(v => v.views >= 1000000).length} | ${Math.round(median(pd)).toLocaleString()} | ${a.length ? Math.round(100 * s / a.length) : 0}% |`; });
md.push("", "## Topic demand (per query: top results by views in window)", "", "| query | videos | >=100k | >=1M | median views/day | shorts share |", "|---|---|---|---|---|---|", ...topicRows);
fs.writeFileSync(path.join(D, `outliers-${label}-${date}.md`), md.join("\n")); console.log(md.join("\n")); console.error(`videos ${out.length}, with baseline ${out.filter(v => v.outlierRatio !== null).length}, quota ${units}`);
