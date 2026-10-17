#!/usr/bin/env node
// Builds stories/<name>/publish.json (title, description, tags, hashtags, thumbnail path, disclosure flags, checks) from publish.seed.json + competitor tag data.
// Tags = tags used by >=2 of the winning (>=100k views) videos for the topic (from planner/data/outliers-*.json) filtered by the seed's tagRe, plus curated extraTags, capped to 480 characters.
// SEO has no guarantees; the data shows what winners did, not what causes views. usage: node planner/seo.mjs stories/<name>
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.resolve(process.argv[2]), P = f => path.join(dir, f), D = path.join(here, "data");
const seed = JSON.parse(fs.readFileSync(P("publish.seed.json"), "utf8")), story = JSON.parse(fs.readFileSync(P("story.json"), "utf8")), segs = JSON.parse(fs.readFileSync(P(story.segments), "utf8"));
const topicRe = new RegExp(seed.topicQueries, "u"), tagRe = new RegExp(seed.tagRe, "iu"), cnt = {};
for (const f of fs.readdirSync(D).filter(x => /^outliers-.*\.json$/.test(x))) { const J = JSON.parse(fs.readFileSync(path.join(D, f), "utf8")); for (const v of J.videos) if (v.views >= 100000 && v.queries.some(q => topicRe.test(q))) { const brand = new RegExp(v.channel.replace(/[^\p{L}\p{N}]+/gu, ".?"), "iu"); for (const t of v.tags || []) { const k = t.toLowerCase().trim(); if (k.length < 3 || k.length > 40 || brand.test(k) || !tagRe.test(k) || /shooting|spiritual journey|official/.test(k)) continue; cnt[k] = (cnt[k] || 0) + 1; } } }
const mined = Object.entries(cnt).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ t, n }));
const tags = []; let chars = 0; for (const t of [...mined.map(x => x.t), ...seed.extraTags]) { if (tags.includes(t) || chars + t.length + 1 > 480) continue; tags.push(t); chars += t.length + 1; }
const title = seed.titles[seed.chosenTitle].t, dur = Math.round(segs.duration_seconds + (story.lead ?? 0.9) + 1.9);
const description = [seed.summary, "", ...(seed.format === "long" ? ["अध्याय:", ...segs.segments.map(s => `${Math.floor(s.start_seconds / 60)}:${String(Math.floor(s.start_seconds % 60)).padStart(2, "0")} ${s.text.slice(0, 40)}`), ""] : []), seed.disclaimer, "", ...(seed.brandLine ? [seed.brandLine, ""] : []), "आवाज़ और चित्र AI की मदद से बनाए गए हैं (synthetic narration, animated visuals).", "", seed.hashtags.join(" ")].join("\n");
const claims = fs.existsSync(P("claims.json")) ? JSON.parse(fs.readFileSync(P("claims.json"), "utf8")) : null, unchecked = claims ? claims.claims.filter(c => c.needs_check).length : null;
const thumbs = ["thumb-9x16.png", "thumb-16x9.png"].filter(f => fs.existsSync(P("output/" + f)));
const out = path.join(dir, "output"), videoFile = fs.readdirSync(out).find(f => f === story.name + ".mp4");
const checks = [
  ["title <= 100 chars", [...title].length <= 100, [...title].length], ["title <= ~60 chars shown on mobile before cut", [...title.split("|")[0].trim()].length <= 60, [...title.split("|")[0].trim()].length],
  ["description <= 5000 bytes", Buffer.byteLength(description) <= 5000, Buffer.byteLength(description)], ["tags <= 500 chars", chars <= 500, chars], ["format fits Shorts (<= 180 s)", seed.format !== "short" || dur <= 180, dur + " s"],
  ["rendered video exists", !!videoFile, videoFile || "run the pipeline"], ["thumbnail generated", thumbs.length > 0, thumbs.join(", ") || "run tools/thumbnail.mjs"],
  ["synthetic-media disclosure set", true, "containsSyntheticMedia=true"], ["claims verified at source", unchecked === 0, unchecked === null ? "no ledger" : unchecked + " claims still need_check (human must verify or keep the disclaimer)"]
].map(([name, ok, detail]) => ({ name, ok, detail }));
const pub = { story: path.basename(dir), channel: seed.channel, format: seed.format, titleOptions: seed.titles, title, description, tags, hashtags: seed.hashtags, categoryId: seed.categoryId, defaultLanguage: seed.language, defaultAudioLanguage: seed.language, privacyStatus: "private", selfDeclaredMadeForKids: false, containsSyntheticMedia: true,
  video: videoFile ? "output/" + videoFile : null, thumbnails: thumbs.map(f => "output/" + f), tagEvidence: mined.slice(0, 15), thumbnailSeed: seed.thumbnail, checks, generated: new Date().toISOString() };
fs.writeFileSync(P("publish.json"), JSON.stringify(pub, null, 1)); console.log(title + "\n" + tags.length + " tags (" + chars + " chars)\n" + checks.map(c => (c.ok ? "PASS " : "WARN ") + c.name + ": " + c.detail).join("\n"));
