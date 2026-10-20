#!/usr/bin/env node
// Trend signal for the specific topic clusters the calendar generator needs (Garuda Purana/Naraka, Yamraj,
// Naglok, Kailash, Kalki, Afterlife, Greek-vs-Hindu, Egyptian), India + "worldwide" (proxied by the US feed --
// Google's public trending RSS is per-country, there is no single worldwide feed; this is a documented
// approximation, not a real worldwide number). Two free, no-key sources (planner/sources.mjs):
//   - autocomplete: what people actually type right now, per topic (works for any topic, always returns something)
//   - trendsDaily: today's top trending searches for a country; cross-referenced against each topic's
//     keywords for a same-day timeliness flag (most days this will legitimately be empty -- these topics
//     are evergreen, not usually a top-20 daily trend, and this script says so rather than forcing a match)
// usage: node planner/trends.mjs  -> planner/data/trends.json
import path from "node:path"; import { DATA, wj } from "./lib.mjs";
import { autocomplete, trendsDaily } from "./sources.mjs";

const TOPICS = [
  { id: "garuda-purana", seeds: ["गरुड़ पुराण", "garuda purana"], kw: ["garuda", "गरुड़"] },
  { id: "narak-yamraj", seeds: ["नरक की कहानी", "यमराज", "yamraj narak"], kw: ["narak", "नरक", "yamraj", "यमराज"] },
  { id: "naglok", seeds: ["नागलोक", "naglok"], kw: ["naglok", "नागलोक", "patal lok"] },
  { id: "kailash", seeds: ["कैलाश पर्वत रहस्य", "mount kailash mystery"], kw: ["kailash", "कैलाश"] },
  { id: "kalki", seeds: ["कल्कि अवतार", "kalki avatar"], kw: ["kalki", "कल्कि"] },
  { id: "afterlife", seeds: ["मृत्यु के बाद क्या होता है", "hindu afterlife"], kw: ["afterlife", "मृत्यु के बाद", "आत्मा"] },
  { id: "greek-vs-hindu", seeds: ["greek vs hindu mythology", "ग्रीक और हिंदू पौराणिक कथा"], kw: ["greek", "ग्रीक"] },
  { id: "egyptian", seeds: ["egyptian mythology hindi", "मिस्र की पौराणिक कथा"], kw: ["egyptian", "मिस्र"] },
];

const regions = [["IN", "India"], ["US", "Worldwide (proxied via US feed -- no real worldwide feed exists)"]];
const dailyByRegion = {};
for (const [geo] of regions) dailyByRegion[geo] = await trendsDaily(geo);

const rows = [];
for (const t of TOPICS) {
  const suggestions = { hi: await autocomplete(t.seeds[0], "hi"), en: await autocomplete(t.seeds[t.seeds.length - 1], "en") };
  const matches = {};
  for (const [geo, label] of regions) {
    const titles = dailyByRegion[geo].map(d => (d.title + " " + d.newsTitle).toLowerCase());
    matches[geo] = { label, trendingNow: dailyByRegion[geo].filter(d => t.kw.some(k => (d.title + " " + d.newsTitle).toLowerCase().includes(k.toLowerCase()))) };
  }
  rows.push({ id: t.id, seeds: t.seeds, suggestions, trending: matches });
}

const out = { generated_at: new Date().toISOString(), method: "autocomplete = live Google Suggest (free, no key). trendingNow = today's top Google Trends (per-country RSS, free, no key) titles matching this topic's keywords -- expect this to be empty most days, these are evergreen topics not daily-spike news.", topics: rows };
wj(path.join(DATA, "trends.json"), out);
console.log(JSON.stringify(rows.map(r => ({ id: r.id, hiSuggestions: r.suggestions.hi.slice(0, 5), trendingNowIN: r.trending.IN.trendingNow.length, trendingNowUS: r.trending.US.trendingNow.length })), null, 1));
