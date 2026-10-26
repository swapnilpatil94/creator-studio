#!/usr/bin/env node
// Ships one READY video to GitHub so GitHub Actions can post it on time (post-due.yml reads content/schedule.json at the slot times).
//   1. GitHub Release "video-video-<slug>" gets the share mp4 (named video-<slug>.mp4) + the thumbnail,
//   2. content/schedule.json gets a queued entry (reel for shorts, fb_long for long films) at the card's date and time (IST),
//   3. content/ship-state.json records it, and the small files post-due needs (stories/video-<slug>/publish.json, social.json) are committed.
// Dry run by default: it prints exactly what it would upload. --yes does it; --push also pushes the commit (that is what makes GitHub aware of it).
// usage: node tools/content/ship.mjs <slug> [--yes] [--push] [--platforms facebook,instagram]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process"; import { tagOf } from "./readiness.mjs"; import { qtCheck } from "../../reel-factory/src/mix.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), a = process.argv.slice(2), slug = a.find(x => !x.startsWith("--")), yes = a.includes("--yes"), push = a.includes("--push"), plats = (a.includes("--platforms") ? a[a.indexOf("--platforms") + 1] : "facebook,instagram").split(",");
const J = (f, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(root, f), "utf8")); } catch { return d; } }, W = (f, o) => fs.writeFileSync(path.join(root, f), JSON.stringify(o, null, 1)), sh = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
const die = m => { console.error("ship: " + m); process.exit(2); };
if (!slug) die("usage: ship.mjs <slug> [--yes] [--push]");
const story = "video-" + slug, d = path.join(root, "stories", story), pub = J(`stories/${story}/publish.json`), soc = J(`stories/${story}/social.json`);
if (!pub || !soc) die(`stories/${story}/publish.json and social.json are missing: the build has not finished`);
const mp4 = path.join(d, pub.video || ""), thumbF = ["thumb-9x16.png", "thumb-16x9.png"].map(f => path.join(d, "output", f)).find(f => fs.existsSync(f));
if (!fs.existsSync(mp4)) die("the share video is missing: " + mp4); if (!thumbF) die("no thumbnail in " + path.join(d, "output"));
const card = (J("content/weekplan.json", { cards: [] }).cards || []).find(c => c.slug === slug); if (!card) die("no Hub card has slug " + slug + " (add the topic to the week first)");
const kind = card.format === "long" ? "fb_long" : "reel", istTime = card.time || (kind === "long" ? "20:00" : "19:00"), at = new Date(`${card.date}T${istTime}:00+05:30`).toISOString();
if (new Date(at) < new Date(Date.now() + 15 * 60000)) die(`the slot ${card.date} ${istTime} IST is in the past or less than 15 minutes away`);
const tag = tagOf(slug), assetName = `${story}.mp4`, entry = { id: `${story}.${kind}.${at.slice(0, 13)}`, item: `story:${story}:${kind}`, kind, platforms: plats, at, status: "queued", mode: "post-due" };
const sched = J("content/schedule.json", []), dupe = sched.find(e => e.id === entry.id);
console.log(`${yes ? "SHIPPING" : "DRY RUN"}: ${slug} (${kind}) for ${card.date} ${istTime} IST`); console.log(`  release  ${tag}: ${assetName} (${(fs.statSync(mp4).size / 1e6).toFixed(0)} MB), ${path.basename(thumbF)}`); console.log(`  schedule ${entry.id} -> ${plats.join(", ")} at ${at}${dupe ? " (already in the schedule, left as is)" : ""}`); console.log(`  commit   stories/${story}/publish.json, social.json, content/schedule.json, content/ship-state.json${push ? ", then push" : " (no push: run again with --push or push yourself)"}`);
if (!yes) process.exit(0);
const tmp = path.join(root, ".cache", "ship"); fs.mkdirSync(tmp, { recursive: true }); const up = path.join(tmp, assetName), th = path.join(tmp, `${story}-thumb${path.extname(thumbF)}`); fs.copyFileSync(thumbF, th);
const qt = qtCheck(mp4); if (qt.ok) fs.copyFileSync(mp4, up); else { console.log("  re-encoding for QuickTime/phones (" + qt.problems.join("; ") + ")"); const e = sh("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p", "-color_range", "tv", "-tag:v", "avc1", "-c:a", "aac", "-ar", "48000", "-b:a", "192k", "-movflags", "+faststart", up]); if (e.status !== 0) die("re-encode failed: " + (e.stderr || "").slice(0, 200)); }
const has = sh("gh", ["release", "view", tag]).status === 0, r = has ? sh("gh", ["release", "upload", tag, up, th, "--clobber"]) : sh("gh", ["release", "create", tag, up, th, "--title", `${card.title || slug}`, "--notes", `Ready item for ${card.date} ${istTime} IST. Posted by the post-due workflow.`]);
if (r.status !== 0) die("gh release failed: " + (r.stderr || "").slice(0, 300));
if (!dupe) { sched.push(entry); W("content/schedule.json", sched); }
const state = J("content/ship-state.json", {}); state[slug] = { tag, asset: assetName, kind, at, platforms: plats, shippedAt: new Date().toISOString(), youtube: !!(J(`stories/${story}/upload.json`) || {}).url }; W("content/ship-state.json", state);
const files = [`stories/${story}/publish.json`, `stories/${story}/social.json`, "content/schedule.json", "content/ship-state.json"], add = sh("git", ["add", ...files]); if (add.status !== 0) die("git add failed: " + add.stderr);
const cm = sh("git", ["commit", "-m", `ship: ${slug} for ${card.date}`, "--", ...files]); console.log((cm.stdout || cm.stderr).trim().split("\n")[0]);
if (push) { const p = sh("git", ["push"]); if (p.status !== 0) die("git push failed: " + (p.stderr || "").slice(0, 300)); console.log("pushed"); }
console.log("shipped");
