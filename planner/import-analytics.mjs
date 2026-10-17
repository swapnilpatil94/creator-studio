#!/usr/bin/env node
// Normalise a CSV export (YouTube Studio / Instagram Insights / manual) into planner/data/analytics.json (merged by id).
// usage: node planner/import-analytics.mjs <file.csv>
import fs from "node:fs"; import path from "node:path"; import { DATA, rj, wj, parseCSV } from "./lib.mjs";
const REQ = ["id", "channel", "format", "views"], NUM = ["duration_s", "views", "avg_view_pct", "hold_3s_pct", "shares", "saves", "subs_gained"];
const file = process.argv[2]; if (!file) { console.error("usage: import-analytics.mjs <file.csv>"); process.exit(2); }
const rows = parseCSV(fs.readFileSync(file, "utf8")); const head = rows[0].map(h => h.trim().toLowerCase());
const miss = REQ.filter(c => !head.includes(c)); if (miss.length) { console.error("missing required column(s): " + miss.join(", ") + "\nexpected: id,title,channel,format,topic,hook_type,published,duration_s,views,avg_view_pct,hold_3s_pct,shares,saves,subs_gained"); process.exit(1); }
const store = rj(path.join(DATA, "analytics.json"), { videos: [] }), byId = new Map(store.videos.map(v => [v.id, v])); let added = 0, updated = 0; const skipped = [];
rows.slice(1).forEach((r, i) => { const o = {}; head.forEach((h, k) => o[h] = (r[k] ?? "").trim()); if (!o.id) { skipped.push("row " + (i + 2) + ": no id"); return; } for (const k of NUM) { const v = o[k] === "" || o[k] === undefined ? NaN : Number(o[k].replace?.(/[%,]/g, "")); o[k] = Number.isFinite(v) ? v : null; } if (o.views === null || o.views < 0) { skipped.push("row " + (i + 2) + " (" + o.id + "): bad views"); return; }
  for (const k of ["avg_view_pct", "hold_3s_pct"]) if (o[k] !== null && (o[k] < 0 || o[k] > 100)) { skipped.push("row " + (i + 2) + " (" + o.id + "): " + k + " outside 0-100"); o[k] = null; }
  o.tags = (o.topic || "").split(/[|;]/).map(s => s.trim().toLowerCase()).filter(Boolean); (byId.has(o.id) ? updated++ : added++); byId.set(o.id, o); });
store.videos = [...byId.values()]; store.imported = new Date().toISOString(); wj(path.join(DATA, "analytics.json"), store);
console.log(`imported ${added} new, ${updated} updated, ${skipped.length} skipped -> ${path.join(DATA, "analytics.json")} (${store.videos.length} videos total)`); skipped.forEach(s => console.log("  skipped " + s));
