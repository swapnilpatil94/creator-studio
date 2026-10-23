#!/usr/bin/env node
// Recurring Hindu lunar-calendar (Panchang) dates for content planning: Ekadashi, Purnima, Amavasya,
// Masik Shivratri, Saturdays (Shani-vaar), plus the named days that land on specific tithis in specific
// lunar months (Tulsi Vivah, Kartik Purnima, Vaikuntha Ekadashi / Gita Jayanti). Computed astronomically
// (hindu-panchang, sunrise-based tithi at a fixed reference location) -- not scraped, so it never disagrees
// with itself the way two web sources do. Sanity-checked against the hand-curated events already in
// data/calendar-2026.json (e.g. Sharad Purnima 2026-10-25) -- this script reproduces them exactly.
// usage: node planner/panchang.mjs [--from YYYY-MM-DD] [--days 90]  -> planner/data/panchang-<from>.json
import path from "node:path"; import { DATA, rj, wj } from "./lib.mjs";
import { HinduPanchang } from "hindu-panchang/dist/index.js";

// Reference point for sunrise-based tithi: New Delhi. Tithi can in principle flip a few hours around
// sunrise depending on location within India, but for editorial planning (which day to post, not which
// exact muhurat) this is well within the precision that matters.
const LAT = 28.6139, LNG = 77.2090;
const p = new HinduPanchang();
const arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d;
const from = arg("--from", new Date(Date.now() + 864e5).toISOString().slice(0, 10)); // default: tomorrow
const days = Number(arg("--days", 90));

const EKADASHI = 10, PURNIMA = 14, SHIVRATRI_TITHI = 13; // in-paksha tithi index (Ekadashi=11th, Purnima/Amavasya=15th, Chaturdashi=14th)
const SHUKLA = 0, KRISHNA = 1;

function dayInfo(dateStr) {
  const dt = new Date(dateStr + "T06:00:00+05:30"); // mid-morning IST, well clear of midnight-rollover edge cases
  const c = p.calendar(dt, LAT, LNG);
  // Tithi.ino from this library is ABSOLUTE across both pakshas (0-14 Shukla, 15-29 Krishna, same 15
  // names reused) -- mod 15 to get the in-paksha index Purnima/Amavasya/Ekadashi/Shivratri actually key off.
  return { date: dateStr, tithi: c.Tithi.ino % 15, tithiName: c.Tithi.name_en_IN, paksha: c.Paksha.ino, masa: c.Masa.name_en_IN, weekday: dt.getUTCDay() };
}

const events = [];
for (let i = 0; i < days; i++) {
  const d = new Date(Date.parse(from) + i * 864e5), dateStr = d.toISOString().slice(0, 10);
  const info = dayInfo(dateStr);
  const push = (id, name, tags, mood) => events.push({ id, name, date: dateStr, tithi: info.tithiName, masa: info.masa, tags, mood });

  if (info.weekday === 6) push("shani-" + dateStr, "Saturday (Shani-vaar)", ["shani", "hanuman", "saturday"], "upay");

  if (info.tithi === EKADASHI) {
    if (info.masa === "Karttika" && info.paksha === SHUKLA) push("tulsi-vivah-" + dateStr, "Tulsi Vivah / Prabodhini (Dev Uthani) Ekadashi", ["tulsi-vivah", "ekadashi", "vishnu", "kartik"], "shrap-prem");
    else if (info.masa === "Margasira" && info.paksha === SHUKLA) push("vaikuntha-ekadashi-" + dateStr, "Vaikuntha Ekadashi / Mokshada Ekadashi / Gita Jayanti", ["vaikuntha-ekadashi", "gita-jayanti", "ekadashi", "krishna", "moksha"], "gyan");
    else push("ekadashi-" + dateStr, (info.paksha === SHUKLA ? "Shukla" : "Krishna") + " Ekadashi", ["ekadashi", "vishnu", "vrat"], "upay");
  }

  if (info.tithi === PURNIMA && info.paksha === SHUKLA) {
    if (info.masa === "Karttika") push("kartik-purnima-" + dateStr, "Kartik Purnima (Dev Diwali)", ["kartik-purnima", "dev-diwali", "shiva", "vishnu"], "ananda");
    else push("purnima-" + dateStr, "Purnima (Full Moon)", ["purnima", "moon", "vrat"], "ananda");
  }

  if (info.tithi === PURNIMA && info.paksha === KRISHNA) push("amavasya-" + dateStr, "Amavasya (No Moon)", ["amavasya", "pitru", "naraka"], "bhay");

  if (info.tithi === SHIVRATRI_TITHI && info.paksha === KRISHNA) {
    if (info.masa === "Phalguna") push("maha-shivratri-" + dateStr, "Maha Shivratri", ["mahashivratri", "shiva", "rahasya"], "rahasya");
    else push("masik-shivratri-" + dateStr, "Masik Shivratri", ["masikshivratri", "shiva", "rahasya"], "rahasya");
  }
}

const out = { source: "computed: hindu-panchang (sunrise tithi, New Delhi reference) -- not scraped", generated_at: new Date().toISOString(), from, days, count: events.length, events };
const file = path.join(DATA, `panchang-${from}.json`);
wj(file, out);
console.log(`${events.length} recurring lunar dates, ${from} + ${days}d -> ${file}`);
console.log(events.map(e => `${e.date}\t${e.name}`).join("\n"));

// Hindi search queries per recurring-event tag, in the same style as the hand-curated entries already
// in calendar-festivals.json (used for the per-pillar proximity boost in outlier-engine.mjs).
const QUERIES_BY_TAG = {
  "tulsi-vivah": ["तुलसी विवाह कथा", "देव उठनी एकादशी कथा"],
  "vaikuntha-ekadashi": ["वैकुंठ एकादशी कथा", "गीता जयंती कथा", "मोक्षदा एकादशी व्रत कथा"],
  ekadashi: ["एकादशी व्रत कथा", "एकादशी की कहानी"],
  "kartik-purnima": ["कार्तिक पूर्णिमा कथा", "देव दीपावली कथा"],
  purnima: ["पूर्णिमा व्रत कथा"],
  amavasya: ["अमावस्या कथा", "पितृ दोष कथा"],
  mahashivratri: ["महाशिवरात्रि कथा", "शिव विवाह कथा"],
  masikshivratri: ["शिवरात्रि कथा", "शिव पूजा कथा"],
  shani: ["शनि देव कथा", "शनि व्रत कथा"],
};
const queriesFor = e => [...new Set(e.tags.flatMap(t => QUERIES_BY_TAG[t] || []))];

// Feed the named events into BOTH calendar files so every tool in planner/ that reads either one picks
// these up: calendar-festivals.json is what the live monthly outlier-engine.mjs actually runs on
// (data/outlier-engine.yml); calendar-2026.json is the lighter one next-topics.mjs reads. Dedup by id,
// keep each file's hand-curated named festivals (Diwali, Navratri, ...) exactly as they already are.
if (process.argv.includes("--merge")) {
  for (const [calId, richSchema] of [["calendar-festivals.json", true], ["calendar-2026.json", false]]) {
    const calFile = path.join(DATA, calId);
    const cal = rj(calFile, { source: "", events: [], queryTags: [] });
    const byId = new Map(cal.events.map(e => [e.id, e]));
    for (const e of events) {
      if (e.tags.includes("saturday") && !richSchema) continue; // calendar-2026.json's own schema has no weekly-recurrence precedent; keep it to named festivals only
      byId.set(e.id, richSchema ? { id: e.id, name: e.name, date: e.date, tags: e.tags, uncertain_days: 0, queries: queriesFor(e) } : { id: e.id, name: e.name, date: e.date, tags: e.tags });
    }
    cal.events = [...byId.values()].sort((a, b) => a.date < b.date ? -1 : 1);
    cal.source = (cal.source || "").replace(/ \+ panchang\.mjs.*$/, "") + ` + panchang.mjs computed lunar dates (astronomical, not scraped) merged ${new Date().toISOString().slice(0, 10)}`;
    wj(calFile, cal);
    console.log(`merged into ${calFile} (${cal.events.length} events total)`);
  }
}
