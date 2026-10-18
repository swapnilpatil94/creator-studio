#!/usr/bin/env node
// Posts what is due from content/schedule.json (GitHub Actions runs this at the slot times; locally: node tools/content/post-due.mjs --dry-run).
// For every due entry: re-run QA on the item, render assets (carousel JPEGs), post per kind, record the result in content/posted.json. Idempotent: an entry is marked before it is sent, so a retry never double-posts.
// kinds: fb_text -> Facebook feed text; carousel -> Facebook multi-photo + Instagram carousel (public URLs from the blog site); reel/fb_long -> story videos (downloaded from a GitHub Release asset named <story>.mp4)
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process"; import { run as qa } from "./qa-content.mjs"; import * as meta from "../../studio-ui/meta.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), a = process.argv.slice(2), dry = a.includes("--dry-run"), windowMin = +(a[a.indexOf("--window") + 1] || 20), only = a.includes("--only") ? a[a.indexOf("--only") + 1] : null;
const J = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")), W = (f, o) => fs.writeFileSync(path.join(root, f), JSON.stringify(o, null, 1)), site = J("blog/site.json"), log = (...x) => console.log(...x);
const sched = fs.existsSync(path.join(root, "content/schedule.json")) ? J("content/schedule.json") : []; let changed = false; const now = Date.now();
const itemOf = id => J(`content/items/${id}.json`), caption = it => [it.hook, "", ...(it.body_lines || []), "", it.cta, "", it.source_line, ...(it.disclosure_text ? [it.disclosure_text] : []), "", it.hashtags.join(" ")].filter(x => x !== undefined).join("\n").replace(/\n{3,}/g, "\n\n");
// covers: stories/<s>/output/thumb-9x16.png (Reels) or thumb-16x9.png (long) converted to JPEG; Instagram can use cover_url only from a public address (the blog site: /covers/<story>.jpg once deployed), otherwise it falls back to a frame offset
function coverJpg(d, r) { const src = path.join(d, `output/thumb-${r}.png`), jpg = path.join(root, ".cache", `cover-${path.basename(d)}-${r}.jpg`); if (!fs.existsSync(src)) return null; fs.mkdirSync(path.dirname(jpg), { recursive: true }); spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-q:v", "3", jpg]); return fs.existsSync(jpg) ? jpg : null; }
const coverUrlFor = story => fs.existsSync(path.join(root, "blog/public/covers", story + ".jpg")) ? `${site.domain}/covers/${story}.jpg` : null;
async function head(url) { try { const r = await fetch(url, { method: "HEAD" }); return r.ok; } catch { return false; } }
for (const e of sched) {
  if (e.status !== "queued" || new Date(e.at).getTime() > now + windowMin * 60000 || (only && e.id !== only)) continue; if (new Date(e.at).getTime() < now - 6 * 3600e3) { e.status = "missed"; changed = true; log("MISSED", e.id); continue; }
  log(`\n== ${e.id} (${e.kind}) due ${e.at}${dry ? " [dry run]" : ""}`); const res = {};
  try {
    if (e.item.startsWith("story:")) { const [, story] = e.item.split(":"), d = path.join(root, "stories", story), sj = J(`stories/${story}/social.json`), pf = J(`stories/${story}/publish.json`); let video = path.join(d, pf.video);
      if (!fs.existsSync(video)) { const r = spawnSync("gh", ["release", "download", `video-${story}`, "--pattern", `${story}.mp4`, "--dir", path.join(root, ".cache"), "--clobber"], { encoding: "utf8" }); video = path.join(root, ".cache", `${story}.mp4`); if (r.status !== 0 || !fs.existsSync(video)) throw new Error("video not found locally or in release video-" + story); }
      log("video", video, (fs.statSync(video).size / 1e6).toFixed(0) + " MB"); if (dry) continue; e.status = "sending"; W("content/schedule.json", sched);
      if (e.kind === "reel") { res.facebook = await meta.uploadFacebook(sj.facebook, video, log, { mode: "public", cover: coverJpg(d, "9x16") }); res.instagram = await meta.uploadInstagram(sj.instagram, video, log, { coverUrl: coverUrlFor(story), thumbOffset: 1500 }); } else if (e.kind === "fb_long") res.facebook = await meta.uploadFacebook(sj.facebook, video, log, { mode: "public", cover: coverJpg(d, "16x9") });
    } else {
      const it = itemOf(e.item), q = qa(it), fails = q.filter(x => x.level === "FAIL"); if (fails.length) throw new Error("QA fail: " + fails.map(x => x.code).join(",")); if (it.status !== "approved") throw new Error("item is not approved (status " + it.status + ")");
      if (e.kind === "fb_text") { log(caption(it)); if (dry) continue; e.status = "sending"; W("content/schedule.json", sched); res.facebook = await meta.postFacebookText(caption(it)); }
      else if (e.kind === "carousel") { const out = path.join(root, "content/out", it.slug); const r = spawnSync("node", [path.join(root, "tools/content/carousel.mjs"), path.join(root, `content/items/${e.item}.json`)], { encoding: "utf8" }); if (r.status !== 0) throw new Error("carousel render failed: " + r.stderr.slice(0, 200)); const files = fs.readdirSync(out).filter(f => /^\d\d\.jpg$/.test(f)).sort().map(f => path.join(out, f)); const urls = files.map((f, i) => `${site.domain}/c/${it.slug}/${path.basename(f)}`); log(files.length + " slides"); if (dry) continue;
        for (const u of urls) if (!(await head(u))) throw new Error("slide not public yet: " + u + " (deploy the blog first)"); e.status = "sending"; W("content/schedule.json", sched); const cap = caption(it); res.facebook = await meta.postFacebookCarousel(files, cap, {}, log); res.instagram = await meta.postInstagramCarousel(urls, cap, {}, log); }
    }
    e.status = "posted"; e.result = res; e.posted_at = new Date().toISOString(); log("POSTED", JSON.stringify(res).slice(0, 300));
  } catch (err) { e.status = dry ? "queued" : "failed"; e.error = err.message; log("FAILED", err.message); }
  changed = true;
}
if (changed && !dry) W("content/schedule.json", sched);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### post-due ${dry ? "(dry run)" : ""}\n\n| entry | kind | status |\n|---|---|---|\n${sched.filter(e => e.status !== "queued" || new Date(e.at) <= new Date(now + windowMin * 60000)).map(e => `| ${e.id} | ${e.kind} | ${e.status}${e.error ? ": " + e.error : ""} |`).join("\n")}\n`); log(dry ? "\n(dry run: nothing sent)" : "\ndone");
