#!/usr/bin/env node
// Scored daily plan: up to 3 videos per channel. Evidence-weighted (shrunk) tag performance, research readiness, novelty, diversity, plus 1 exploration slot.
// usage: node planner/plan.mjs [--date YYYY-MM-DD] [--per-channel 3]
import path from "node:path"; import fs from "node:fs"; import { DATA, rj, wj, mean, rank, fmt, here } from "./lib.mjs";
const arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d, date = arg("--date", new Date().toISOString().slice(0, 10)), PER = Number(arg("--per-channel", 3));
const topics = rj(path.join(DATA, "topics.json"), []), V = rj(path.join(DATA, "analytics.json"), { videos: [] }).videos; if (!topics.length) { console.error("no topics: add ideas to " + path.join(DATA, "topics.json")); process.exit(1); }
const K = 5; // shrinkage strength: a tag with n videos counts as n/(n+K) evidence, rest is the channel prior (0.5)
const comp = {}; for (const ch of [...new Set(V.map(v => v.channel))]) { const a = V.filter(v => v.channel === ch), pc = m => { const r = rank(a.map(m)); return r.map(x => (x - 1) / Math.max(1, a.length - 1)); }; const r1 = pc(v => v.avg_view_pct ?? NaN), r2 = pc(v => v.hold_3s_pct ?? NaN), r3 = pc(v => v.shares !== null && v.views ? v.shares / v.views : NaN); a.forEach((v, i) => comp[v.id] = 0.5 * (Number.isFinite(r1[i]) ? r1[i] : 0.5) + 0.3 * (Number.isFinite(r2[i]) ? r2[i] : 0.5) + 0.2 * (Number.isFinite(r3[i]) ? r3[i] : 0.5)); }
const tagStats = (ch, tag) => { const a = V.filter(v => v.channel === ch && v.tags.includes(tag)); const n = a.length; return { n, score: (n * mean(a.map(v => comp[v.id])) + K * 0.5) / (n + K) || 0.5 }; };
const recent = V.filter(v => v.published && (Date.parse(date) - Date.parse(v.published)) / 864e5 <= 14 && (Date.parse(date) - Date.parse(v.published)) / 864e5 >= 0);
const plan = { date, channels: {} }, md = ["# Plan for " + date, "", "Scores are evidence-weighted estimates from your own analytics (shrunk toward 0.5 when a tag has few videos). They rank candidates; they do not predict views.", ""];
for (const ch of [...new Set(topics.map(t => t.channel))]) {
  const cand = topics.filter(t => t.channel === ch && t.status !== "done" && t.status !== "rejected").map(t => { const tags = (t.tags || []).map(x => x.toLowerCase()), ts = tags.map(x => tagStats(ch, x)); const perf = ts.length ? mean(ts.map(x => x.score)) : 0.5, n = ts.reduce((a, x) => a + x.n, 0);
    const claims = rj(path.join(here, "..", "stories", t.story || "_none_", "claims.json"), null); const ready = t.status === "researched" ? 1 : claims ? claims.claims.filter(c => ["verified", "traditional-account", "omitted"].includes(c.status) && !c.needs_check).length / Math.max(1, claims.claims.length) : 0;
    const used = recent.filter(v => v.channel === ch && v.tags.some(x => tags.includes(x))).length, novelty = Math.max(0, 1 - 0.35 * used); const needsResearch = ready < 0.8;
    return { id: t.id || t.title, title: t.title, tags, perf, n, ready, novelty, needsResearch, score: 0.55 * perf + 0.25 * novelty + 0.2 * ready, explore: n === 0 }; });
  const ok = cand.filter(c => !c.needsResearch).sort((a, b) => b.score - a.score), picks = [], tagUse = {}; const exploit = ok.filter(c => !c.explore), explore = ok.filter(c => c.explore);
  for (const c of exploit) { if (picks.length >= Math.max(1, PER - (explore.length ? 1 : 0))) break; const k = c.tags[0] || "-"; if ((tagUse[k] || 0) >= 2) continue; tagUse[k] = (tagUse[k] || 0) + 1; picks.push({ ...c, slot: "exploit" }); }
  if (explore.length && picks.length < PER) picks.push({ ...explore[0], slot: "explore (untested tags)" }); for (const c of ok) { if (picks.length >= PER) break; if (!picks.includes(c) && !picks.some(p => p.id === c.id)) picks.push({ ...c, slot: "fill" }); }
  plan.channels[ch] = { picks, blocked: cand.filter(c => c.needsResearch).map(c => ({ id: c.id, title: c.title, ready: c.ready })) };
  md.push("## " + ch, "", "| # | topic | slot | score | tag evidence (videos) | research ready | novelty |", "|---|---|---|---|---|---|---|"); picks.forEach((p, i) => md.push(`| ${i + 1} | ${p.title} | ${p.slot} | ${fmt(p.score, 2)} | ${p.n} | ${fmt(p.ready * 100, 0)}% | ${fmt(p.novelty, 2)} |`));
  if (plan.channels[ch].blocked.length) md.push("", "Blocked until researched (claims ledger < 80% sourced): " + plan.channels[ch].blocked.map(b => `${b.title} (${fmt(b.ready * 100, 0)}%)`).join("; ")); md.push("");
}
wj(path.join(DATA, "plan-" + date + ".json"), plan); fs.writeFileSync(path.join(DATA, "plan-" + date + ".md"), md.join("\n")); console.log(md.join("\n"));
