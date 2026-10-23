#!/usr/bin/env node
// Per-platform FORMAT breakdown for each day already in CONTENT_CALENDAR.csv: what to make as a Facebook/
// Instagram carousel, what to cut as a short vertical, and what the long horizontal YouTube video is --
// for the SAME story/topic each day, matching how content/calendar.json already schedules the week
// (carousel on most days, reel/short daily, fb_long/yt_long on specific days). This does not invent new
// topics: it takes the day's calendar row (which already has a real outlier reference + source) and says
// which asset to cut for which slot.
// usage: node planner/content-calendar.mjs first, then: node planner/format-plan.mjs
// -> FORMAT_PLAN.md (repo root)
import fs from "node:fs"; import path from "node:path"; import { rj, here, parseCSV } from "./lib.mjs";
const root = path.resolve(here, "..");
const csvFile = path.join(root, "CONTENT_CALENDAR.csv");
if (!fs.existsSync(csvFile)) { console.error("run planner/content-calendar.mjs first"); process.exit(1); }
const rows = parseCSV(fs.readFileSync(csvFile, "utf8")); const header = rows[0], data = rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
const slots = rj(path.join(root, "content/calendar.json"), { slots: {} }).slots;
const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const lines = [`# KATHAAYA format plan -- same story, cut per platform (${data[0]?.date} to ${data[data.length - 1]?.date})`, "",
  "Each day's topic comes straight from CONTENT_CALENDAR.csv (real outlier reference + mood already assigned there). This just says which asset to cut for which slot that day, per content/calendar.json's existing weekly schedule.", ""];

for (const r of data) {
  const d = new Date(r.date), dayKinds = (slots[DOW[d.getUTCDay()]] || []).map(s => s.kind);
  lines.push(`## ${r.date} — ${r.festival !== "-" ? r.festival : r.mood}`, "", `Topic: ${r.longTitle}`, "");
  const plan = [];
  plan.push(`- **Long horizontal (YouTube, 8:15am & 11am IST)**: full narration -- ${r.longTitle}`);
  plan.push(`- **Short vertical, ~58s (YouTube Shorts/Reels, 7:30pm IST, same story)**: ${r.shortTitle}`);
  if (dayKinds.includes("carousel")) plan.push(`- **Carousel (Facebook + Instagram, 11am IST)**: 6-8 slide breakdown of the same story's key beats/facts -- thumbnail line "${r.thumbText}", hook slide 1: "${r.hook}"`);
  if (dayKinds.includes("fb_text")) plan.push(`- **Facebook text post (11am IST)**: the hook as a standalone text post -- "${r.hook}"`);
  if (dayKinds.includes("fb_long")) plan.push(`- **Facebook long video (8pm IST)**: same long-form video, re-cut/re-captioned for FB feed`);
  if (dayKinds.includes("yt_long")) plan.push(`- **YouTube long slot (8pm IST, Sunday)**: this IS the Sunday special -- no separate asset needed beyond the long horizontal above`);
  // 3-min mid-form: a deeper cut than the 58s short, shorter than the full long -- useful for Instagram Reels' longer ceiling / YouTube's "long short" zone. Not in content/calendar.json yet (that file only has reel/fb_long/yt_long), so flagged as a manual add until there's demand data to justify a dedicated daily slot.
  plan.push(`- **3-min mid-form cut (optional, not yet a scheduled slot)**: a deeper single-scene cut of "${r.thumbText}" for Instagram Reels' longer ceiling -- add to content/calendar.json as its own kind once there's a reason (a performance signal, not a guess) to run it daily`);
  lines.push(...plan, "");
}
fs.writeFileSync(path.join(root, "FORMAT_PLAN.md"), lines.join("\n"));
console.log(`${data.length} days -> FORMAT_PLAN.md`);
