#!/usr/bin/env node
// Builds a verified list of real, active YouTube channels in KATHAAYA's target niches (Hindi mythology /
// Garuda Purana / Shiv Puran / Naglok / afterlife / "Sanatan AI" style channels / world-mythology
// comparison), starting from a hand-given seed list and expanding via YouTube search. Every channel in
// the output was actually resolved through the YouTube Data API (real channelId, real subscriber count,
// real last-upload date) -- nothing here is guessed or hallucinated; a handle that doesn't resolve, or
// has posted nothing in the last ~200 days, is left out rather than included as a guess.
// usage: node planner/channels.mjs  -> planner/data/channels.json + planner/data/channels.txt
// Quota: search.list (type=channel) 100 units/query, channels.list 1 unit/50 ids, playlistItems 1 unit/call.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, ".."), D = path.join(here, "data");

let KEY = process.env.YOUTUBE_API_KEY; const envf = path.join(root, ".env.local"); if (!KEY && fs.existsSync(envf)) KEY = (fs.readFileSync(envf, "utf8").match(/YOUTUBE_API_KEY=(\S+)/) || [])[1];
let KEY2 = process.env.YOUTUBE_API_KEY_KATHAAYA; if (!KEY2 && fs.existsSync(envf)) KEY2 = (fs.readFileSync(envf, "utf8").match(/YOUTUBE_API_KEY_KATHAAYA=(\S+)/) || [])[1];
let usingKey2 = false;
if (!KEY) { console.error("missing YOUTUBE_API_KEY (put it in .env.local)"); process.exit(1); }
let units = 0;
const api = async (ep, params, cost) => { const u = new URL("https://www.googleapis.com/youtube/v3/" + ep); for (const [k, v] of Object.entries({ ...params, key: usingKey2 ? KEY2 : KEY })) u.searchParams.set(k, v); const r = await fetch(u); units += cost; const j = await r.json();
  if (j.error) { if (!usingKey2 && KEY2 && /quota/i.test(j.error.message)) { usingKey2 = true; console.error("[channels] primary key quota exhausted, switching to second project's key"); return api(ep, params, 0); } throw new Error(ep + ": " + j.error.message); }
  return j; };

const SEED_HANDLES = ["SanatanTalesAI", "MysticGods", "SanatanLoreverse", "AIVisionbyRajesh", "TheBhakt", "Mahanitya", "ShivPuranKathaHindi", "GarudaPuranaKatha"];

// Niche discovery queries (channel search, not video search) -- Hindi + English, covering every pillar
// the user named: Garuda Purana / Naraka, Shiv Puran secrets, Naglok/afterlife, "Sanatan AI"-style
// animated-mythology brands, and world-mythology comparison channels.
const QUERIES = [
  "गरुड़ पुराण कथा", "garuda purana katha", "गरुड़ पुराण नरक", "28 narak garuda purana",
  "शिव पुराण कथा", "shiv puran katha", "शिव रहस्य", "mahadev rahasya katha",
  "नागलोक की कहानी", "naglok katha", "patal lok katha", "पाताल लोक कथा",
  "sanatan ai animation", "sanatan katha ai", "hindu mythology ai hindi",
  "यमराज की कहानी", "yamraj katha narak", "आत्मा की कहानी मृत्यु",
  "garuda purana ai animation", "mythology katha ai hindi", "puran katha hindi ai",
  "greek vs hindu mythology hindi", "world mythology comparison hindi", "egyptian mythology hindi katha",
  "sanatan dharma katha hindi", "bhagwat katha ai animation",
];

async function resolveHandle(h) {
  const j = await api("channels", { part: "snippet,statistics,contentDetails", forHandle: h.startsWith("@") ? h : "@" + h }, 1);
  return j.items && j.items[0] || null;
}

const found = new Map(); // channelId -> {channel object, fromQueries:[]}
for (const h of SEED_HANDLES) {
  try { const c = await resolveHandle(h); if (c) found.set(c.id, { c, q: ["seed"] }); else console.error("seed handle not found:", h); }
  catch (e) { console.error("seed handle error:", h, e.message); }
}
for (const q of QUERIES) {
  try {
    const j = await api("search", { part: "snippet", q, type: "channel", maxResults: 15, relevanceLanguage: "hi" }, 100);
    for (const it of j.items || []) { const id = it.id.channelId || it.snippet.channelId; if (!id) continue; if (found.has(id)) found.get(id).q.push(q); else found.set(id, { c: null, q: [q] }); }
  } catch (e) { console.error("query failed:", q, e.message); }
}

// Fetch full stats for anything discovered-but-not-yet-fetched (seed channels already have `c`).
const needStats = [...found.entries()].filter(([, v]) => !v.c).map(([id]) => id);
for (let i = 0; i < needStats.length; i += 50) {
  const j = await api("channels", { part: "snippet,statistics,contentDetails", id: needStats.slice(i, i + 50).join(",") }, 1);
  for (const c of j.items || []) found.get(c.id).c = c;
}

const NICHE_RULES = [
  ["garuda", /garud|गरुड़|narak|नरक|yamraj|यमराज/i],
  ["shiva", /shiv|शिव|mahadev|महादेव/i],
  ["lok", /naglok|नागलोक|patal|पाताल|afterlife|आत्मा|moksha|मोक्ष|स्वर्ग/i],
  ["world", /greek|norse|egyptian|mesopotam|world mythology|विश्व पौराणिक/i],
];
const nicheOf = text => (NICHE_RULES.find(([, re]) => re.test(text)) || ["big"])[0];

const results = [];
for (const [id, { c, q }] of found) {
  if (!c) continue;
  const up = c.contentDetails?.relatedPlaylists?.uploads;
  let lastUpload = null, alive = false;
  if (up) {
    try { const pl = await api("playlistItems", { part: "contentDetails", playlistId: up, maxResults: 1 }, 1);
      const vid = pl.items?.[0]?.contentDetails?.videoId;
      if (vid) { const v = await api("videos", { part: "snippet", id: vid }, 1); lastUpload = v.items?.[0]?.snippet?.publishedAt || null; }
    } catch (e) { /* channel has an uploads playlist but it's empty or private -- leave lastUpload null, alive stays false */ }
  }
  if (lastUpload) alive = (Date.now() - Date.parse(lastUpload)) / 864e5 <= 200;
  const subs = +c.statistics?.subscriberCount || 0, videos = +c.statistics?.videoCount || 0;
  results.push({ handle: c.snippet.customUrl || null, channelId: id, title: c.snippet.title, subs, videoCount: videos, niche: nicheOf(c.snippet.title + " " + (c.snippet.description || "")), verified: alive && videos > 0, lastUpload, fromQueries: q, url: "https://youtube.com/channel/" + id });
}

results.sort((a, b) => (b.verified - a.verified) || (b.subs - a.subs));
fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "channels.json"), JSON.stringify({ generated_at: new Date().toISOString(), quotaUnits: units, count: results.length, verifiedCount: results.filter(r => r.verified).length, channels: results }, null, 1));
fs.writeFileSync(path.join(D, "channels.txt"), results.map(r => `${r.verified ? "" : "# DEAD/UNVERIFIED "}${r.handle || r.channelId}\t${r.niche}\t${r.subs}subs\t${r.title}`).join("\n"));
console.log(`${results.length} channels found (${results.filter(r => r.verified).length} verified alive), quota units used: ${units}`);
console.log(results.filter(r => r.verified).slice(0, 40).map(r => `${r.subs.toString().padStart(9)}  ${r.niche.padEnd(6)}  ${r.handle || r.channelId}  ${r.title}`).join("\n"));
