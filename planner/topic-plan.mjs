#!/usr/bin/env node
// Plans one topic per day (2026-10-29 .. 2026-12-31) for the Hub's Week tab, from DATA, not from taste:
//  demand   = per mythology theme and format: the share of scanned videos that were 3x-outliers of their own channel (planner/data/channel-outliers-*.json, thousands of videos) against the all-video base rate
//  calendar = festivals and tithis that fall on or near the day (planner/data/panchang-*.json computed astronomically + calendar-2026.json); a matching story gets a bonus, near days a smaller one
//  rhythm   = Thursday and Sunday and the big festivals are long videos, the rest shorts (CONTENT_CALENDAR.md cadence); a theme is not repeated within 2 days, a mood not back to back, beliefs at most one a week
// The stories themselves come from planner/data/topic-bank-2026-q4.json (not yet produced, none blocked by the content policy). Outliers are relative to each channel's own median, so this ranks themes, it does not predict any single video.
// usage: node planner/topic-plan.mjs            writes planner/data/topic-plan-2026-q4.json and prints the plan
//        node planner/topic-plan.mjs --apply    also adds the days to content/weekplan.json (days that already have a card are left alone)
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const FROM = "2026-10-29", TO = "2026-12-31";
const addDays = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }, dow = s => new Date(s + "T00:00:00Z").getUTCDay();
// ---- demand from the real outlier scan ----
const out = J("planner/data/channel-outliers-2026-10-20.json").videos.filter(v => v.outlierScore != null);
const THEMES = { hanuman: /हनुमान|Hanuman|बजरंग|अहिरावण/, shiva_mahadev: /शिव|महादेव|Shiv|Mahadev|महाकाल|Mahakal|नीलकंठ|भैरव|Bhairav/, vishnu_avatar: /वराह|नरसिंह|वामन|कल्कि|मत्स्य|कूर्म|परशुराम|अवतार|Varaha|Narasimha|Vamana|Kalki/, krishna: /कृष्ण|Krishna|राधा|गोपी|कन्हैया/, vishnu_lakshmi: /विष्णु|नारायण|लक्ष्मी|Vishnu|Lakshmi/, mahabharat: /महाभारत|Mahabharat|अर्जुन|कर्ण|भीष्म|द्रौपदी|अभिमन्यु|पांडव|कौरव|द्रोण|Karna|Arjun|Draupadi/, ramayan: /रामायण|रावण|लक्ष्मण|सीता|Ravan|राम\b|विभीषण|कुंभकर्ण/, garuda_naraka: /गरुड़|गरुण|नरक|यमराज|चित्रगुप्त|Garud|Naraka|यमलोक|पाप और पुण्य/, afterlife_soul: /मृत्यु|मौत|आत्मा|पुनर्जन्म|श्राद्ध|पितृ|Afterlife/, naag_lok: /नाग|Naag|नागलोक|Naglok|शेषनाग|वासुकि|कालिया/, jagannath_temples: /जगन्नाथ|Jagannath|मंदिर|तिरुपति|काशी|उज्जैन|केदार|रहस्यमयी/, devi_shakti: /दुर्गा|काली|देवी|माँ|माता|महिषासुर|शक्ति|Durga|Kali/, ganga_river: /गंगा|Ganga|नदी|यमुना/, shani_remedy: /शनि|Shani|उपाय|राशि|Vidhi|विधि|पूजा|व्रत/, sage_curse_boon: /शाप|श्राप|वरदान|ऋषि|तपस्या|Curse|Boon/, creation_cosmic: /सृष्टि|ब्रह्मा|ब्रह्मांड|युग|कलियुग|समुद्र मंथन|लोक|Creation/, ganesh_kartikeya: /गणेश|गणपति|कार्तिकेय|Ganesh|Kartikeya/, tulsi_vrat: /तुलसी|Tulsi|एकादशी|Ekadashi/, karma_moral: /कर्म|धर्म|न्याय|दान|सच|धोखा|त्याग|भक्त/ };
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const base = f => { const a = out.filter(v => v.format === f); return a.filter(v => v.isOutlier).length / a.length; };
const DEMAND = {}; for (const f of ["short", "long"]) { const b = base(f); for (const [k, re] of Object.entries(THEMES)) { const a = out.filter(v => v.format === f && re.test(v.title)); if (a.length < 15) { DEMAND[k + ":" + f] = { ratio: 1, n: a.length, rate: +(100 * b).toFixed(1), base: +(100 * b).toFixed(1), note: "too few videos to rank (n=" + a.length + "): treated as average" }; continue; } const o = a.filter(v => v.isOutlier), top = a.reduce((m, v) => v.outlierScore > m.outlierScore ? v : m); DEMAND[k + ":" + f] = { ratio: o.length / a.length / b, n: a.length, outliers: o.length, rate: +(100 * o.length / a.length).toFixed(1), base: +(100 * b).toFixed(1), medViews: med(a.map(v => v.views)), top: top.title.slice(0, 48), topViews: top.views }; } }
// ---- the calendar ----
const ev = new Map(); const addEv = e => { const k = e.date; ev.set(k, [...(ev.get(k) || []), { name: e.name, tags: e.tags || [] }]); };
for (const e of J("planner/data/panchang-2026-10-21.json").events) addEv(e); for (const e of J("planner/data/calendar-2026.json").events) addEv(e);
const diwali = [...ev].find(([d, l]) => l.some(x => /Diwali \(Lakshmi/.test(x.name)))?.[0]; if (diwali) { addEv({ date: addDays(diwali, -1), name: "Narak Chaturdashi (derived from Diwali date; confirm)", tags: ["diwali", "krishna", "naraka"] }); addEv({ date: addDays(diwali, 1), name: "Govardhan / Annakut (derived from Diwali date; confirm)", tags: ["krishna", "govardhan"] }); addEv({ date: addDays(diwali, 2), name: "Bhai Dooj (derived from Diwali date; confirm)", tags: ["bhai-dooj", "yama"] }); }
const tagsOn = d => new Set((ev.get(d) || []).flatMap(e => e.tags)), namesOn = d => [...new Set((ev.get(d) || []).map(e => e.name))];
const BIG = new Set(["diwali", "gita-jayanti", "kartik-purnima", "karwa-chauth"]);
// ---- plan ----
const bank = J("planner/data/topic-bank-2026-q4.json").topics, used = new Set(), produced = new Set(fs.readdirSync(path.join(root, "stories")).map(s => s.replace(/^(video|reel)-/, "")));
const days = []; for (let d = FROM; d <= TO; d = addDays(d, 1)) days.push(d);
const fmtOf = d => { const tags = tagsOn(d), w = dow(d); return (w === 4 || w === 0 || [...tags].some(t => BIG.has(t))) ? "long" : "short"; };
const assigned = {};   // date -> { t, s, dm, anchor, teaser }
const scoreOf = (t, d, strict) => {
  const w = dow(d), tags = tagsOn(d), near = new Set([-2, -1, 1, 2].flatMap(k => [...tagsOn(addDays(d, k))])), fmt = fmtOf(d), dm = DEMAND[t.theme + ":" + (t.fmt === "long" ? "long" : fmt)] || DEMAND[t.theme + ":" + fmt] || { ratio: 1 };
  const anchor = (t.tags || []).filter(x => tags.has(x)).length, teaser = (t.tags || []).filter(x => near.has(x) && !tags.has(x)).length;
  let s = dm.ratio + 2.5 * Math.min(anchor, 2) + 0.8 * Math.min(teaser, 1) + (t.primary && anchor ? 2 : 0);   // primary = the story that IS the festival's own katha
  if (t.fmt === fmt) s += 0.6; else if (t.fmt === "short" && fmt === "long") s -= 0.8; else if (t.fmt === "long" && fmt === "short") s -= 2.0;   // a long story is not squeezed into a short
  if (w === 6 && (t.tags || []).includes("shani")) s += 1.5;
  if (!strict) { for (let k = -2; k <= 2; k++) { if (!k) continue; const o = assigned[addDays(d, k)]; if (!o) continue; if (o.t.theme === t.theme) s -= k === 1 || k === -1 ? 1.6 : 0.8; if (Math.abs(k) === 1 && o.t.mood === t.mood) s -= 0.3; if (t.belief && o.t.belief && Math.abs(k) <= 3) s -= 3; } }
  return { t, s, dm, anchor, teaser };
};
// pass 1: festival days first, the day with the fewest fitting stories picks first, so a festival story is never spent on an ordinary day
const SEASONAL = new Set(["dhanteras", "diwali", "bhai-dooj", "karwa-chauth", "govardhan", "kartik-purnima", "dev-diwali", "gita-jayanti", "vaikuntha-ekadashi", "tulsi-vivah"]);   // a festival story is never spent on an ordinary day
const free = () => bank.filter(t => !used.has(t.slug) && !produced.has(t.slug)), fits = d => free().filter(t => (t.tags || []).some(x => tagsOn(d).has(x)));
const festDays = days.filter(d => fits(d).length).sort((a, b) => fits(a).length - fits(b).length || (a < b ? -1 : 1));
for (const d of festDays) { const c = free().map(t => scoreOf(t, d, false)).filter(x => x.anchor).sort((a, b) => b.s - a.s)[0]; if (c) { assigned[d] = c; used.add(c.t.slug); } }
// pass 2: the other days in order, with the rhythm rules against the days already placed on both sides
for (const d of days) { if (assigned[d]) continue; const c = free().filter(t => !(t.tags || []).some(x => SEASONAL.has(x))).map(t => scoreOf(t, d, false)).sort((a, b) => b.s - a.s)[0]; if (!c) break; assigned[d] = c; used.add(c.t.slug); }
const rows = [];
for (const d of days) { const best = assigned[d]; if (!best) continue; const t = best.t, fmt = fmtOf(d), w = dow(d), tags = tagsOn(d), dm = best.dm, why = [];
  if (best.anchor) why.push("Calendar: " + namesOn(d).join(" / ") + " (" + (t.tags || []).filter(x => tags.has(x)).join(", ") + ")"); else if (best.teaser) why.push("Calendar: a festival is within 2 days");
  why.push(dm.top ? `Demand: ${dm.rate}% of ${dm.n} ${t.fmt === "long" ? "long" : fmt} ${t.theme.replace(/_/g, " ")} videos were 3x outliers (all videos: ${dm.base}%); biggest: "${dm.top}" ${(dm.topViews / 1e6).toFixed(1)}M views` : `Demand: ${dm.note || "no theme data"}`);
  rows.push({ date: d, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][w], format: fmt, time: fmt === "long" ? "20:00" : "19:00", slug: t.slug, title: t.title, theme: t.theme, mood: t.mood, source: t.source, belief: !!t.belief, regional: !!t.regional, event: namesOn(d), why: why.join(" | "), score: +best.s.toFixed(2) }); }
fs.writeFileSync(path.join(root, "planner/data/topic-plan-2026-q4.json"), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), from: FROM, to: TO, method: "theme outlier-rate ratio x calendar bonus x rhythm; see header of planner/topic-plan.mjs", demand: DEMAND, days: rows }, null, 1));
for (const r of rows) console.log(r.date, r.dow, r.format.padEnd(5), r.theme.padEnd(18), r.title.slice(0, 46), r.event.length ? "  <" + r.event[0].slice(0, 28) + ">" : "");
console.log(rows.length + " days, " + rows.filter(r => r.format === "long").length + " long, " + rows.filter(r => r.format === "short").length + " short; bank left: " + (bank.length - used.size));
if (process.argv.includes("--apply")) { const F = path.join(root, "content/weekplan.json"), data = JSON.parse(fs.readFileSync(F, "utf8")), now = new Date().toISOString(); let n = 0; for (const r of rows) { if (data.cards.some(c => c.date === r.date)) continue; data.cards.push({ id: "w" + crypto.randomBytes(4).toString("hex"), createdAt: now, updatedAt: now, flags: {}, date: r.date, time: r.time, format: r.format, title: r.title, slug: r.slug, theme: r.theme, mood: r.mood, why: r.why, source: r.source, belief: r.belief, regional: r.regional, planned: true }); n++; } fs.writeFileSync(F, JSON.stringify(data, null, 1)); console.log("added " + n + " cards to content/weekplan.json"); }
