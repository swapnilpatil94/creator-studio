#!/usr/bin/env node
// Posts what is due from content/schedule.json (GitHub Actions runs this at the slot times; locally: node tools/content/post-due.mjs --dry-run).
// For every due entry: re-run QA on the item, render assets (carousel JPEGs), post per kind, record the result in content/posted.json. Idempotent: an entry is marked before it is sent, so a retry never double-posts.
// kinds: fb_text -> Facebook feed text; carousel -> Facebook multi-photo + Instagram carousel (public URLs from the blog site); reel/fb_long -> story videos (downloaded from a GitHub Release asset named <story>.mp4)
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process"; import { run as qa } from "./qa-content.mjs"; import * as meta from "../../studio-ui/meta.mjs";
import { block as linkBlock } from "./links.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), a = process.argv.slice(2), dry = a.includes("--dry-run"), windowMin = +(a[a.indexOf("--window") + 1] || 20), only = a.includes("--only") ? a[a.indexOf("--only") + 1] : null;
const J = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")), W = (f, o) => fs.writeFileSync(path.join(root, f), JSON.stringify(o, null, 1)), site = J("blog/site.json"), log = (...x) => console.log(...x);
const sched = fs.existsSync(path.join(root, "content/schedule.json")) ? J("content/schedule.json") : []; let changed = false; const now = Date.now();
// Retry classification (social-scheduling tools converge on this: retry per destination -- already true
// above via `once` -- classify before retrying, and don't hammer a broken credential or a QA failure that
// will fail identically every time). Matches: expired/invalid token or permission (the single most common
// real cause of a stuck scheduler), and our own QA/approval gates, which only change when a human acts.
const PERMANENT = /token|oauth|permission|unauthorized|invalid.*(credential|client)|access.*denied|account.*not.*found|QA fail|not approved/i;
const itemOf = id => J(`content/items/${id}.json`), caption = it => [it.hook, "", ...(it.body_lines || []), "", it.cta, "", it.source_line, ...(it.disclosure_text ? [it.disclosure_text] : []), "", linkBlock("facebook"), "", it.hashtags.join(" ")].filter(x => x !== undefined).join("\n").replace(/\n{3,}/g, "\n\n");
// covers: stories/<s>/output/thumb-9x16.png (Reels) or thumb-16x9.png (long) converted to JPEG; Instagram can use cover_url only from a public address (the blog site: /covers/<story>.jpg once deployed), otherwise it falls back to a frame offset
function coverJpg(d, r) { const src = path.join(d, `output/thumb-${r}.png`), jpg = path.join(root, ".cache", `cover-${path.basename(d)}-${r}.jpg`); if (!fs.existsSync(src)) return null; fs.mkdirSync(path.dirname(jpg), { recursive: true }); spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-q:v", "3", jpg]); return fs.existsSync(jpg) ? jpg : null; }
const coverUrlFor = story => fs.existsSync(path.join(root, "site/public/covers", story + ".jpg")) ? `${site.domain}/covers/${story}.jpg` : null;
async function head(url) { try { const r = await fetch(url, { method: "HEAD" }); return r.ok; } catch { return false; } }
for (const e of sched) {
  // a "failed" entry (not "blocked") is automatically eligible again next run -- the 3x/day cron is the
  // backoff (hours apart, not a retry storm) -- up to 3 attempts total, then it's marked "blocked" and
  // left for a human; "blocked" is never picked up here again.
  const retrying = e.status === "failed" && (e.retries || 0) < 3;
  if (!(e.status === "queued" || retrying) || (only && e.id !== only)) continue;
  const atMs = new Date(e.at).getTime();
  if (e.status === "queued") { if (atMs > now + windowMin * 60000) continue; if (atMs < now - 6 * 3600e3) { e.status = "missed"; changed = true; log("MISSED", e.id); continue; } }
  else if (atMs < now - 3 * 864e5) { e.status = "blocked"; e.error = (e.error || "") + " (gave up retrying automatically after 3 days; fix it and retry by hand)"; changed = true; log("GIVING UP", e.id, e.error); continue; }
  log(`\n== ${e.id} (${e.kind}) due ${e.at}${retrying ? ` [retry ${(e.retries || 0) + 1}/3]` : ""}${dry ? " [dry run]" : ""}`);
  // res starts from whatever already succeeded on a prior, partially-failed attempt (e.result), never from
  // scratch -- a retry must only touch platforms it has not already posted to. Each successful platform call
  // is written to schedule.json immediately (not just once at the end), so a crash or throw between two
  // platform calls still leaves the first one recorded and un-repeatable.
  const res = { ...(e.result || {}) }, save = () => { e.result = res; W("content/schedule.json", sched); };
  const once = async (platform, label, fn) => { if (res[platform]) { log(`${platform} already posted (${label}), skipping`); return; } res[platform] = await fn(); save(); };
  try {
    if (e.item.startsWith("story:")) { const [, story] = e.item.split(":"), d = path.join(root, "stories", story), sj = J(`stories/${story}/social.json`), pf = J(`stories/${story}/publish.json`); let video = path.join(d, pf.video);
      if (!fs.existsSync(video)) { const r = spawnSync("gh", ["release", "download", `video-${story}`, "--pattern", `${story}.mp4`, "--dir", path.join(root, ".cache"), "--clobber"], { encoding: "utf8" }); video = path.join(root, ".cache", `${story}.mp4`); if (r.status !== 0 || !fs.existsSync(video)) throw new Error("video not found locally or in release video-" + story); }
      log("video", video, (fs.statSync(video).size / 1e6).toFixed(0) + " MB"); if (dry) continue; e.status = "sending"; W("content/schedule.json", sched);
      if (e.kind === "reel") { await once("facebook", e.id, () => meta.uploadFacebook(sj.facebook, video, log, { mode: "public", cover: coverJpg(d, "9x16") })); await once("instagram", e.id, () => meta.uploadInstagram(sj.instagram, video, log, { coverUrl: coverUrlFor(story), thumbOffset: 0 })); } else if (e.kind === "fb_long") await once("facebook", e.id, () => meta.uploadFacebook(sj.facebook, video, log, { mode: "public", cover: coverJpg(d, "16x9") }));
    } else {
      const plats = e.platforms || ["facebook", "instagram"], it = itemOf(e.item), q = qa(it), fails = q.filter(x => x.level === "FAIL"); if (fails.length) throw new Error("QA fail: " + fails.map(x => x.code).join(",")); if (it.status !== "approved") throw new Error("item is not approved (status " + it.status + ")");
      if (e.kind === "fb_text") { log(caption(it)); if (dry) continue; e.status = "sending"; W("content/schedule.json", sched); if (plats.includes("facebook")) await once("facebook", e.id, () => meta.postFacebookText(caption(it))); }
      else if (e.kind === "carousel") { const out = path.join(root, "content/out", it.slug); const r = spawnSync("node", [path.join(root, "tools/content/carousel.mjs"), path.join(root, `content/items/${e.item}.json`)], { encoding: "utf8" }); if (r.status !== 0) throw new Error("carousel render failed: " + r.stderr.slice(0, 200)); const files = fs.readdirSync(out).filter(f => /^\d\d\.jpg$/.test(f)).sort().map(f => path.join(out, f)); const urls = files.map((f, i) => `${site.domain}/c/${it.slug}/${path.basename(f)}`); log(files.length + " slides"); if (dry) continue;
        if (plats.includes("instagram") && !res.instagram) for (const u of urls) if (!(await head(u))) throw new Error("slide not public yet: " + u + " (run: node tools/content/publish-assets.mjs carousel " + it.slug + ", push to main and wait for blog-deploy; or set platforms: [\"facebook\"])"); e.status = "sending"; W("content/schedule.json", sched); const cap = caption(it); if (plats.includes("facebook")) await once("facebook", e.id, () => meta.postFacebookCarousel(files, cap, {}, log)); if (plats.includes("instagram")) await once("instagram", e.id, () => meta.postInstagramCarousel(urls, cap, {}, log)); }
    }
    e.status = "posted"; e.posted_at = new Date().toISOString(); save(); log("POSTED", JSON.stringify(res).slice(0, 300));
  } catch (err) {
    e.retries = (e.retries || 0) + 1; const permanent = PERMANENT.test(err.message), outOfRetries = e.retries >= 3;
    e.status = dry ? "queued" : (permanent || outOfRetries) ? "blocked" : "failed"; e.error = err.message; save();
    log(e.status === "blocked" ? `BLOCKED (${permanent ? "looks permanent" : "out of retries"}; needs a human)` : "FAILED (will retry automatically)", err.message, "(kept: " + Object.keys(res).join(",") + ")");
  }
  changed = true;
}
if (changed && !dry) W("content/schedule.json", sched);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### post-due ${dry ? "(dry run)" : ""}\n\n| entry | kind | status |\n|---|---|---|\n${sched.filter(e => e.status !== "queued" || new Date(e.at) <= new Date(now + windowMin * 60000)).map(e => `| ${e.id} | ${e.kind} | ${e.status}${e.error ? ": " + e.error : ""} |`).join("\n")}\n`); log(dry ? "\n(dry run: nothing sent)" : "\ndone");
// a "failed" entry auto-retries on its own (no need to wake anyone up for it); a "blocked" one has given up
// and genuinely needs a human -- exit non-zero so the workflow's own "open an issue on failure" step fires,
// but only the first time (blockedNotified), or every run would re-open/spam the same issue forever.
const blockedNow = sched.filter(e => e.status === "blocked" && !e.blockedNotified);
if (!dry && blockedNow.length) { log(`\n${blockedNow.length} entr${blockedNow.length === 1 ? "y" : "ies"} blocked, needs a human: ` + blockedNow.map(e => e.id).join(", ")); blockedNow.forEach(e => e.blockedNotified = true); W("content/schedule.json", sched); process.exitCode = 1; }
