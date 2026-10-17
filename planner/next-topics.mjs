#!/usr/bin/env node
// Ranks next topics from the saved YouTube analyses (planner/data/analysis-*.json) + the festival calendar. Heuristic ranking, NOT a prediction.
// score = 0.5*log10(1+median views/day) + 0.3*(share of results >= 1M) + 0.2*log10(1+median views per subscriber), x1.25 if a related festival is within 5 days, x1.15 within 14 days.
// usage: node planner/next-topics.mjs [--date YYYY-MM-DD]  -> planner/data/next-topics.json
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), D = path.join(here, "data"), arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d, today = arg("--date", new Date().toISOString().slice(0, 10));
const cal = JSON.parse(fs.readFileSync(path.join(D, "calendar-2026.json"), "utf8")), days = d => Math.round((Date.parse(d) - Date.parse(today)) / 864e5);
const rows = [];
for (const [file, channel] of [["analysis-kathaaya.json", "kathaaya"], ["analysis-agentic.json", "agentic-ai"]]) {
  const f = path.join(D, file); if (!fs.existsSync(f)) continue; const A = JSON.parse(fs.readFileSync(f, "utf8")), meta = fs.readdirSync(D).filter(x => x.startsWith("outliers-" + (channel === "kathaaya" ? "kathaaya" : "agentic")) && x.endsWith(".json")).sort().pop();
  for (const q of A.queries) {
    if (q.relevant < 8) continue; const n = Math.min(25, q.relevant), share1M = q.ge1M / n;
    let tag = null; for (const t of cal.queryTags) if (new RegExp(t.re, "u").test(q.query)) { tag = t.tag; break; }
    const ev = tag ? cal.events.filter(e => e.tags.includes(tag) || e.id === tag).map(e => ({ ...e, in: days(e.date) })).filter(e => e.in >= -1).sort((a, b) => a.in - b.in)[0] : null;
    const boost = ev ? (ev.in <= 5 ? 1.25 : ev.in <= 14 ? 1.15 : 1) : 1;
    const score = (0.5 * Math.log10(1 + q.medViewsPerDay) + 0.3 * share1M + 0.2 * Math.log10(1 + q.medViewsPerSub)) * boost;
    rows.push({ channel, topic: q.query, relevant: q.relevant, ge100k: q.ge100k, ge1M: q.ge1M, medViewsPerDay: q.medViewsPerDay, medViewsPerSub: q.medViewsPerSub, shortShare: q.shortShare, format: q.shortShare >= 50 ? "short" : "long", event: ev ? { name: ev.name, date: ev.date, inDays: ev.in } : null, boost, score: +score.toFixed(3), source: meta });
  }
}
rows.sort((a, b) => b.score - a.score); fs.writeFileSync(path.join(D, "next-topics.json"), JSON.stringify({ date: today, method: "heuristic ranking from search results (survivorship bias, competition not measured)", rows }, null, 1));
console.log(rows.slice(0, 14).map(r => `${r.score}\t${r.channel}\t${r.format}\t${r.topic}\t${r.medViewsPerDay}/day\t${r.event ? r.event.name + " in " + r.event.inDays + "d" : ""}`).join("\n"));
