#!/usr/bin/env node
// Builds stories/<name>/social.json: Instagram and Facebook packages (caption, hashtags, alt text, cover, checks) from publish.seed.json, beats.json and publish.json.
// Each platform gets its own copy rather than the YouTube description: Instagram search reads the caption (keywords in the first line, few hashtags), Facebook Reels want a short description, a long 16:9 film goes to the Page as a video.
// usage: node planner/social.mjs stories/<name>
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process";
const dir = path.resolve(process.argv[2]), P = f => path.join(dir, f), J = f => fs.existsSync(P(f)) ? JSON.parse(fs.readFileSync(P(f), "utf8")) : null;
const seed = J("publish.seed.json"), pub = J("publish.json"), beats = J("beats.json") || [], up = J("upload.json"), story = J("story.json"), social = (seed && seed.social) || {};
if (!seed) { console.error("publish.seed.json missing"); process.exit(1); }
const long = seed.format === "long", firstLine = (beats.find(b => b.text && b.text.trim()) || {}).text || "", cut = (s, n) => { const a = [...s]; return a.length <= n ? s : a.slice(0, n - 1).join("") + "…"; };
const title = (pub && pub.title) || seed.titles[seed.chosenTitle].t, shortTitle = title.replace(/\s*\|\s*KATHAAYA\s*$/i, ""), ytUrl = up && up.url ? up.url : null, handle = social.igHandle || null;
const kw = social.keywords || ["दुर्गा का जन्म", "देवी महात्म्य", "महिषासुर", "नवरात्रि कथा"], tag = n => seed.hashtags.filter(h => !/^#shorts$/i.test(h)).concat(["#Kathaaya"]).filter((h, i, a) => a.indexOf(h) === i).slice(0, n);
const vfile = pub && pub.video ? P(pub.video) : null, probe = vfile && fs.existsSync(vfile) ? spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration,size", "-of", "json", vfile], { encoding: "utf8" }) : null, pj = probe && probe.status === 0 ? JSON.parse(probe.stdout) : null, vw = pj && pj.streams[0].width, vh = pj && pj.streams[0].height, vdur = pj && Number(pj.format.duration), vmb = pj && Number(pj.format.size) / 1e6;
const disc = cut(seed.disclaimer.split("।")[0] + "।", 130), ai = "आवाज़ और चित्र AI की मदद से बने हैं।";
const out = { story: path.basename(dir), format: long ? "long" : "short", generated: new Date().toISOString(), note: "Copy is generated from the same seed as YouTube; edit publish.seed.json `social` {hook, igHandle, keywords} to override." };
const checks = (name, c) => c.map(([n, ok, d]) => ({ platform: name, name: n, ok: !!ok, detail: String(d) }));
// ---- Instagram (Reels) ----
if (!long) {
  const hook = social.hook || cut(firstLine, 110), caption = [hook, "", cut(seed.summary, 230), "", `🔎 ${kw.join(" · ")}`, "", handle ? `फ़ॉलो करें ${handle} — हर हफ़्ते नई कथा 🙏` : "सेव करें, शेयर करें, और बताइए — अगली कथा कौन सी सुनें? 🙏", "", disc + " " + ai, "", tag(5).join(" ")].join("\n");
  out.instagram = { type: "REELS", caption, hashtags: tag(5), firstLine: hook, altText: cut(`${shortTitle}. ${seed.summary}`, 100), cover: "output/thumb-9x16.png", shareToFeed: true, shareToFacebook: false, aiLabel: true,
    checks: checks("instagram", [["caption <= 2200 chars", [...caption].length <= 2200, [...caption].length], ["first line <= 125 chars (visible before 'more')", [...hook].length <= 125, [...hook].length], ["hashtags <= 5 (few, relevant)", tag(5).length <= 5, tag(5).length], ["keyword in first line", kw.some(k => hook.includes(k.split(" ")[0])) || /दुर्गा|देवी/.test(hook), hook], ["cover image exists", fs.existsSync(P("output/thumb-9x16.png")), "output/thumb-9x16.png"], ["9:16 video", vw && vh && vw / vh < 0.6, pj ? vw + "x" + vh : "video not rendered yet"], ["length <= 90 s (reel sweet spot)", vdur && vdur <= 90, pj ? vdur.toFixed(0) + " s" : "n/a"], ["AI disclosure in caption and label on", caption.includes("AI"), "set the 'AI label' toggle when publishing"], ["handle for follow CTA", !!handle, handle || "not provided yet: generic CTA used"]]) };
} else out.instagram = { type: "NONE", note: "A 16:9 film is not an Instagram Reel. Cut 3-5 vertical Shorts from it (long-form-playbook: one idea each, new hook line) and publish those with this tool." };
// ---- Facebook ----
if (!long) {
  const desc = [shortTitle, "", cut(seed.summary, 250), ytUrl ? "\n▶️ YouTube पर देखें: " + ytUrl : "", "", disc + " " + ai, "", tag(3).join(" ")].filter(x => x !== null).join("\n");
  out.facebook = { type: "REELS", description: desc, hashtags: tag(3), cover: "output/thumb-9x16.png", checks: checks("facebook", [["description present, <= 2200 chars", [...desc].length > 0 && [...desc].length <= 2200, [...desc].length], ["hashtags <= 5", tag(3).length <= 5, tag(3).length], ["reel length <= 90 s", vdur && vdur <= 90, pj ? vdur.toFixed(0) + " s" : "video not rendered yet"], ["file size <= 1000 MB", vmb && vmb <= 1000, pj ? vmb.toFixed(0) + " MB" : "n/a"], ["link back to YouTube", !!ytUrl, ytUrl || "added after the YouTube upload"]]) };
} else {
  const desc = [shortTitle, "", cut(seed.summary, 300), "", ...(pub ? pub.description.split("\n").filter(l => /^\d+:\d\d /.test(l)) : []), "", disc + " " + ai, "", ytUrl ? "▶️ YouTube: " + ytUrl : "", tag(4).join(" ")].join("\n");
  out.facebook = { type: "VIDEO", title: shortTitle, description: desc, hashtags: tag(4), cover: "output/thumb-16x9.png", checks: checks("facebook", [["title <= 100 chars", [...shortTitle].length <= 100, [...shortTitle].length], ["description <= 5000 chars", [...desc].length <= 5000, [...desc].length], ["link back to YouTube", !!ytUrl, ytUrl || "added after the YouTube upload"]]) };
}
fs.writeFileSync(P("social.json"), JSON.stringify(out, null, 1));
for (const k of ["instagram", "facebook"]) { const o = out[k]; console.log(`\n== ${k} (${o.type}) ==`); if (o.caption || o.description) console.log(o.caption || o.description); (o.checks || []).forEach(c => console.log((c.ok ? "PASS " : "WARN ") + c.name + " — " + c.detail)); if (o.note) console.log(o.note); }
