#!/usr/bin/env node
// Puts the ready narration (content/pack-drafts/<slug>.txt) on each planned Hub card, so the owner only presses "Build video".
// The closing "next story" line is filled from the next day's card title. Cards that already have a script are left alone unless --force.
// usage: node planner/apply-scripts.mjs [--force] [--from 2026-10-29]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { parsePack, joinPack, slugOf } from "../tools/video/pack.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), F = path.join(root, "content/weekplan.json"), force = process.argv.includes("--force"), fi = process.argv.indexOf("--from"), FROM = fi > 0 ? process.argv[fi + 1] : "2026-10-29";
const data = JSON.parse(fs.readFileSync(F, "utf8")), byDate = new Map(); for (const c of data.cards) if (!byDate.has(c.date)) byDate.set(c.date, c);
const NUM = { 16: "सोलह", 900: "नौ सौ", 100: "सौ", 12: "बारह" };
const tease = t => { t = (t || "").replace(/[A-Za-z]+/g, ""); for (const [k, v] of Object.entries(NUM)) t = t.replace(new RegExp(k, "g"), v); t = t.replace(/\d+/g, ""); if (t.includes(":") && t.split(/\s+/).length > 12) t = t.split(":")[0].trim(); const w = t.split(/\s+/); if (w.length > 13) t = w.slice(0, 13).join(" "); return t.trim().replace(/[।.]+$/, ""); };
const dates = [...byDate.keys()].sort().filter(d => d >= FROM); let n = 0, skipped = 0, bad = 0; const now = new Date().toISOString();
for (const [i, d] of dates.entries()) { const c = byDate.get(d), f = path.join(root, "content/pack-drafts", (c.slug || "") + ".txt"); if (!c.slug || !fs.existsSync(f)) continue; if ((c.script || "").trim() && !force) { skipped++; continue; }
  const next = byDate.get(dates[i + 1]), line = next ? `अगली कथा में, ${tease(next.title)}। फ़ॉलो कीजिए।` : "अगली कथा में, एक और अनसुनी कथा। फ़ॉलो कीजिए।";
  const script = fs.readFileSync(f, "utf8").replace("अगली कथा में, @@NEXT@@ फ़ॉलो कीजिए।", line), r = parsePack(joinPack(script, c.visuals || ""));
  if (!r.ok) { bad++; console.log("ERRORS in", c.slug, r.errors.slice(0, 2)); continue; }
  c.script = script; c.scriptSaved = script; c.scriptSavedAt = now; c.check = { ok: r.ok, errors: r.errors, warnings: r.warnings.slice(0, 12), stats: r.stats, slug: r.pack.slug || null, at: now }; c.slug = slugOf(r.pack); c.updatedAt = now; c.draft = "pack-drafts: written from memory of the source, needs the owner's check against the named text"; n++; }
fs.writeFileSync(F, JSON.stringify(data, null, 1)); console.log(`scripts applied to ${n} cards, ${skipped} already had one, ${bad} with errors`);
