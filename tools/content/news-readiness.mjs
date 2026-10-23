// Google News / Discover / Search readiness of one blog item (owner 2026-10-23: "have the blog check that it qualifies for everything Google News needs before posting").
// Called from tools/content/qa-content.mjs for format "blog": FAIL blocks publishing, WARN is shown in the Blog tab. Each rule is a Google publisher guideline, a Search Essentials rule or one of our own trust rules; the post-build counterpart (site/scripts/verify-seo.mjs) checks the BUILT page.
// Honest limit: these checks make a post ELIGIBLE and well formed. Google decides inclusion; Google News is built for timely reporting, so an evergreen mythology piece is most likely to appear when it has a real news peg (a festival, tithi or anniversary) and, more reliably, in Search and Discover.
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const words = t => String(t || "").split(/\s+/).filter(Boolean), len = t => [...String(t || "")].length;
export function newsChecks(it) {
  const out = [], add = (level, name, detail) => out.push({ level, name, detail }), md = it.markdown || "", title = it.title || "", meta = it.meta_description || "";
  // headline
  if (len(title) > 110) add("FAIL", "news-headline", `${len(title)} characters: Google News/NewsArticle headlines stay under 110`); else if (len(title) < 20) add("FAIL", "news-headline", "headline under 20 characters is too thin to be a promise"); else if (len(title) > 75) add("WARN", "news-headline", `${len(title)} characters: titles over about 70 get cut in search results`);
  if (/(\.\.\.|…)\s*$/.test(title) || /[!！]{2,}/.test(title) || /[A-Z]{6,}/.test(title) || /\p{Extended_Pictographic}/u.test(title)) add("FAIL", "news-headline-style", "no trailing ellipsis, repeated exclamation marks, SHOUTING or emoji in the headline (Google News editorial guidance on misleading or sensational titles)");
  if (meta && len(meta) < 90) add("WARN", "news-meta", `meta description is ${len(meta)} characters; 120-155 uses the space well`);
  // lede and structure
  const first = md.replace(/^#\s.*\n+/, "").split(/\n\n+/).find(p => p.trim() && !/^(#|\[\[|<|\*\*)/.test(p.trim())) || "";
  if (words(first).length > 70) add("WARN", "news-lede", `the first paragraph is ${words(first).length} words: answer who/what/why-now in under 60 (inverted pyramid)`);
  const h2 = (md.match(/^##\s/gm) || []).length; if (h2 < 5 || h2 > 9) add("WARN", "news-structure", `${h2} H2 sections: 5-8 reads best and ranks best`);
  const longP = md.split(/\n\n+/).filter(p => !/^(#|-|\d+\.|\||\[\[|<)/.test(p.trim()) && words(p).length > 120).length; if (longP) add("WARN", "news-paragraphs", `${longP} paragraph(s) over 120 words: split them for phone reading`);
  // trust: sources, byline, tradition
  const nsrc = (it.sources || []).length; if (nsrc < 1) add("FAIL", "news-sources", "no sources listed: a publication cites what it reports"); else if (nsrc < 2) add("WARN", "news-sources", "only one source: two or more distinct sources make the piece verifiable");
  if (!/अध्याय|श्लोक|स्कंध|पर्व|सर्ग|खंड|अनुच्छेद|chapter|canto|book|verse|section|\d+\.\d+/i.test(md)) add("WARN", "news-citation", "no chapter, verse or section reference in the text: name where each claim comes from");
  if (!it.author || /संपादकीय टीम|editorial team/i.test(it.author)) add("WARN", "news-byline", "a named author (with a bio on /about) is a stronger trust signal than 'editorial team'; add AUTHOR");
  // timeliness, video, keywords
  if (!it.timely_hook) add("WARN", "news-peg", "no PEG: Google News favours timely pieces, name the festival, tithi or anniversary that makes this the right day");
  if (!it.video_id) add("WARN", "news-video", "no YOUTUBE link: the embedded video lifts watch time and earns a VideoObject listing"); else if (!/\[\[VIDEO\]\]/.test(md)) add("WARN", "news-video", "put [[VIDEO]] on its own line right under the lede so the video sits near the top");
  const kws = it.hinglish_keywords || []; if (kws.length < 3) add("WARN", "news-keywords", "add 4-8 KEYWORDS (the Hinglish phrases people actually search)");
  else { const k = kws[0].toLowerCase().split(/\s+/)[0], n = (md.toLowerCase().match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, dens = n / Math.max(1, words(md).length) * 100; if (dens > 3) add("WARN", "news-stuffing", `"${k}" is ${dens.toFixed(1)}% of the words: that reads as keyword stuffing`); }
  // pictures: a cover at least 1200 px wide (Discover), alt text on everything, AI pictures disclosed
  const pics = it.images || [], heroP = pics.find(x => x.role === "hero");
  if (!heroP && !it.hero_image) add("WARN", "news-hero", "no cover picture: Google Discover and News cards need a large image (at least 1200 px wide)"); else if (heroP && heroP.w && heroP.w < 1200) add("WARN", "news-hero", `the cover is ${heroP.w} px wide; Discover wants at least 1200`);
  for (const x of pics) { if (!x.alt || len(x.alt) < 8) add("FAIL", "news-alt", `a ${x.role || "picture"} has no alt text (accessibility and image search): describe what it shows`); if (x.role === "infographic" && x.w && x.w < 800) add("WARN", "news-infographic", `an infographic is only ${x.w} px wide: text will not be readable on a phone`); }
  if (pics.some(x => x.ai) && !it.ai_art_disclosed) add("FAIL", "news-ai-art", "a picture was painted by AI: it must be disclosed (the site labels it automatically once ai_art_disclosed is set)");
  const links = (md.match(/\{\{link:|\]\(\/blog\//g) || []).length; if (links < 2) add("WARN", "news-links", "add 2-4 internal links to related stories ({{link: slug | anchor}})");
  if (it.hero_image && !it.hero_alt) add("WARN", "news-alt", "the cover picture needs HERO_ALT (accessibility and image search)");
  const dates = md.match(/\b\d{1,2}\s*(?:जनवरी|फ़रवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)\b/g) || []; if (dates.length && !it.timely_hook) add("WARN", "news-dates", "the text states a date but PEG is empty: confirm every date against a panchang for the reader's city");
  // site-level: the pages a news publisher must have, and a usable logo
  for (const f of ["about", "contact", "editorial-policy", "corrections", "privacy"]) if (!fs.existsSync(path.join(root, "site/src/pages", f + ".astro"))) add("FAIL", "news-site", `site/src/pages/${f}.astro is missing: Google News expects about, contact, editorial policy, corrections and privacy pages`);
  const logo = path.join(root, "site/public/logo.png"); if (!fs.existsSync(logo)) add("FAIL", "news-logo", "site/public/logo.png is missing (publisher logo for NewsArticle)"); else { const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", logo], { encoding: "utf8" }), [w, h] = (r.stdout || "").trim().split(",").map(Number); if (w && (w < 112 || h < 112)) add("FAIL", "news-logo", `logo is ${w}x${h}; at least 112x112 (512x512 recommended)`); }
  return out;
}
