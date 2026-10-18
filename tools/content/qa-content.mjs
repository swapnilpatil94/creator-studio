#!/usr/bin/env node
// Content QA gate for text posts, carousels, blogs and reel scripts (policy: docs/QA_POLICY.md). Exit 1 on any FAIL; WARN needs a human tick in the dashboard.
// usage: node tools/content/qa-content.mjs content/items/<id>.json [--json]   (or --all)
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { search } from "./corpus.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), W = s => (s || "").split(/\s+/).filter(Boolean), dev = s => (s.match(/[ऀ-ॿ]/g) || []).length, letters = s => (s.match(/[\p{L}]/gu) || []).length;
const SENSITIVE = /द्रौपदी.{0,20}(चीरहरण|वस्त्रहरण|अपमान)|vastraharan|चीरहरण|जाति|दलित|मुस्लिम|धर्मांतर|सती प्रथा|आत्महत्या|बलात्कार/i, BELIEF = /(आज भी|अब भी).{0,30}(जीवित|ज़िंदा|मौजूद|दिखे|देखे)|चिरंजीव|जीवित हैं/;
const BELIEF_OK = /मान्यता|माना जाता|कहा जाता|लोक-?विश्वास|श्रद्धालु|परंपरा के अनुसार|tradition/i;
const FAKE_STAT = /(\d{1,3}\s?%|प्रतिशत|९९|99)\s*(हिंदू|हिन्दू|लोग|भारतीय|लोगों)|\b(99|98|97|95)\s?%/, SUPERLATIVE = /(सबसे बड़ा रहस्य|कोई नहीं जानता|दुनिया हिल गई|आपको चौंका देगा|शर्तिया|100\s?% सच|गारंटी)/;
const BAIT = /(comment|कमेंट|कमेन्ट)\s*(करो|करें|कीजिए|कीजिये|में)?\s*[:\-]?\s*["“]?[A-Z]{3,12}\b|(comment|कमेंट)[^\n]{0,20}(लिखो|लिखें|टाइप)\s*["“]?\S+|\b(tag|टैग)\s*(करो|करें)|शेयर\s*(नहीं|न)\s*(किया|करोगे|करने)|share\s*(this\s*)?(to|or)\s*(get|receive|avoid)|(आशीर्वाद|कृपा)\s*(मिलेगा|पाएं|पाओ)[^\n]{0,20}(शेयर|share)/i;
const SLOP = [/आइए जानते हैं/, /इस लेख में हम/, /निष्कर्ष\s*:/, /सारांश\s*:/, /आज के (डिजिटल )?(युग|दौर) में/, /एक बात (तो )?तय है/, /यह सिर्फ़? .{0,40} नहीं,? बल्कि/, /ना सिर्फ़?.{0,40}बल्कि/, /\bdelve\b|\btapestry\b|\bin conclusion\b/i, /चलिए शुरू करते हैं/];
const CHECKS = []; let item;
const add = (level, code, msg) => CHECKS.push({ level, code, msg });
function hashtagRules(h, max, plat) { if (h.length > max) add("FAIL", "hashtags", `${h.length} hashtags on ${plat}, max ${max}`); if (h.some(x => !/^#\S+$/.test(x))) add("FAIL", "hashtag-format", "malformed hashtag"); }
function shingles(t, n = 6) { const w = W(t.replace(/[।.,?!"'—-]/g, " ")), s = new Set(); for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(" ")); return s; }
function run(it) {
  item = it; CHECKS.length = 0; const f = it.format, all = [it.hook, ...(it.body_lines || []), ...(it.slides || []), it.cta, it.markdown].filter(Boolean).join("\n");
  for (const k of ["id", "format", "pillar", "topic", "hook", "sources", "claims", "hashtags", "language"]) if (it[k] === undefined) add("FAIL", "schema", "missing field: " + k);
  // ---- format ----
  const hookWords = W(it.hook).length;
  if (["fb_text", "carousel", "reel_script"].includes(f)) { if (hookWords > 10) add("FAIL", "hook-length", `hook is ${hookWords} words (max 10)`); if (hookWords < 3) add("FAIL", "hook-length", "hook too short"); if (!/[?？]|क्यों|कैसे|कौन|क्या|कब|कहाँ|\d/.test(it.hook)) add("WARN", "hook-gap", "hook has no question word or number: is there a curiosity gap?"); }
  if (f === "fb_text") { const body = [it.hook, ...(it.body_lines || []), it.cta].join("\n"); if ([...body].length > 900) add("FAIL", "length", "FB text over 900 chars"); if (/https?:\/\//.test(body)) add("FAIL", "link", "no link inside the post (reach): put the blog link in the first comment"); hashtagRules(it.hashtags, 3, "Facebook"); if ((it.body_lines || []).length < 2 || (it.body_lines || []).length > 4) add("WARN", "structure", "body should be 2-4 short lines with the answer withheld"); if (!it.source_line) add("FAIL", "source-line", "source_line missing (every story post cites its text)"); }
  if (f === "carousel") { const s = it.slides || []; if (s.length < 5 || s.length > 10) add("FAIL", "slides", `${s.length} slides (5-10; Instagram max 10)`); s.forEach((x, i) => { const n = W(x).length; if (n > (i === 0 ? 10 : 14)) add("FAIL", "slide-length", `slide ${i + 1} has ${n} words`); }); hashtagRules(it.hashtags, 5, "Instagram/Facebook carousel"); if (!(it.cta_slide_last || /फ़ॉलो|follow|सेव|save/i.test(s[s.length - 1] || ""))) add("WARN", "cta", "last slide should hold one clear action (save or follow)"); if (it.slide1_image && !it.slide1_image.ai_art_disclosed) add("FAIL", "ai-image-disclosure", "slide-1 image must be flagged ai_art_disclosed"); }
  if (f === "blog") { const w = W(it.markdown || "").length; if (w < 700) add("FAIL", "blog-length", `${w} words: thin content (min 700)`); if (!/^#\s/m.test(it.markdown || "")) add("FAIL", "blog-structure", "needs an H1"); if ((it.markdown.match(/^##\s/gm) || []).length < 3) add("WARN", "blog-structure", "fewer than 3 H2 sections"); if (!it.meta_description || [...it.meta_description].length > 160) add("FAIL", "meta-description", "meta_description missing or over 160 chars"); if (!it.tradition_note) add("FAIL", "tradition-note", "blog must state which text/tradition and note variants"); if (!(it.faq || []).length) add("WARN", "faq", "add 3-5 FAQ items (real reader questions)"); }
  if (f === "reel_script" && !it.source_line) add("FAIL", "source-line", "source_line missing");
  // ---- language ----
  const d = dev(all), l = letters(all); if (it.language === "hi" && l && d / l < 0.6) add("WARN", "devanagari", `only ${(100 * d / l).toFixed(0)}% Devanagari letters: mixed script hurts readability and search`);
  // ---- honesty ----
  if (FAKE_STAT.test(all)) add("FAIL", "fake-stat", "invented statistic ('99% लोग नहीं जानते'-style): remove or cite a source");
  if (SUPERLATIVE.test(all)) add("WARN", "hype", "unsupported superlative or hype phrase");
  if (BELIEF.test(all) && !BELIEF_OK.test(all)) add("FAIL", "belief-as-fact", "a belief ('आज भी जीवित', 'देखे गए') is stated as fact: frame it as मान्यता / कहा जाता है");
  if (SENSITIVE.test(all) && !it.human_approved) add("WARN", "sensitive", "sensitive topic: needs the manager's explicit approval (human_approved) and a respectful frame, never a joke or a comparison that trivialises harm");
  if (/(workplace harassment|वर्कप्लेस)/i.test(all) && /(द्रौपदी|draupadi)/i.test(all)) add("FAIL", "trivialise", "do not equate Draupadi's humiliation with a modern workplace case in a hook or meme; discuss it in a long-form, sourced, respectful piece");
  if (/(linkedin|डिग्रियां|डिग्रियाँ).{0,40}रावण|रावण.{0,40}(linkedin|डिग्री)/i.test(all) && !/व्यंग्य|मज़ाक|hum|satire/i.test(all)) add("WARN", "joke-frame", "humour about a sacred figure must be labelled as humour, or cut");
  // ---- engagement bait ----
  if (BAIT.test(all)) add("FAIL", "engagement-bait", "comment-/tag-/share-bait (asking for a specific word, tag, or threatening luck): Facebook demotes this (named 'engagement bait' category). Ask a real question instead");
  // ---- writing quality ----
  for (const p of SLOP) if (p.test(all)) add("WARN", "ai-slop", "stock AI phrase: " + String(p).slice(1, 30));
  if ((all.match(/[\u{1F300}-\u{1FAFF}☀-➿]/gu) || []).length > 3) add("WARN", "emoji", "more than 3 emoji");
  const lines = [it.hook, ...(it.body_lines || []), ...(it.slides || [])].filter(Boolean), starts = lines.map(x => W(x)[0]); if (lines.length > 4 && new Set(starts).size < starts.length * 0.6) add("WARN", "repetition", "many lines start with the same word");
  // ---- sources and claims ----
  const src = it.sources || []; if (!src.length) add("FAIL", "sources", "no sources");
  const clms = it.claims || []; if (!clms.length) add("FAIL", "claims", "no claims listed: every factual line must map to a claim");
  for (const c of clms) {
    if (!c.text || !c.status) { add("FAIL", "claim-schema", "claim needs text and status"); continue; }
    if (c.status === "verified") { if (!c.source) { add("FAIL", "claim-source", `verified claim without source: ${c.text.slice(0, 40)}`); continue; } const m = /^([a-z-]+):([0-9IVXLC]+)$/.exec(c.source); if (!m) { add("WARN", "claim-source-format", `source '${c.source}' is not corpus-resolvable (use <corpus>:<section>); verify by hand`); continue; }
      const hits = search(c.en || c.text, 8); if (!fs.existsSync(path.join(root, "research/index.json"))) { add("WARN", "corpus-missing", "research index not built: claims not machine-verified (run tools/content/corpus.mjs)"); break; }
      const ok = hits.some(h => h.src === m[1] && String(h.n) === m[2]); if (!ok) add("FAIL", "claim-unverified", `claim not found in ${c.source} by retrieval: "${(c.en || c.text).slice(0, 60)}"`);
      // coverage: the distinctive words of the claim's English paraphrase must actually occur in the cited section (a fluent but wrong paraphrase, or a wrong section number, fails here)
      const df = path.join(root, "research/corpus", `${m[1]}-${m[2]}.json`); if (fs.existsSync(df)) { const sec = new Set(JSON.parse(fs.readFileSync(df, "utf8")).text.toLowerCase().replace(/&#\d+;/g, " ").split(/[^a-z']+/)), STOP = new Set("the and was were with from that this have has had for are but not his her their they them she him who whom which when then thus into upon unto thou thee thy shall would could been being also very more most such than there where what while about after before because over under between only some any each other another those these".split(" ")), words = (c.en || "").toLowerCase().split(/[^a-z']+/).filter(w => w.length > 3 && !STOP.has(w)), stem = w => w.replace(/(ing|ed|es|s|ly)$/, ""), secStems = new Set([...sec].map(stem)), hit = words.filter(w => secStems.has(stem(w))).length; if (words.length >= 3 && hit / words.length < 0.6) add("FAIL", "claim-coverage", `only ${hit}/${words.length} distinctive words of the claim occur in ${c.source}: wrong section or an invented detail ("${(c.en || "").slice(0, 60)}")`); } }
    else if (c.status === "tradition" || c.status === "variant" || c.status === "interpretation") { if (!BELIEF_OK.test(all) && !/व्याख्या|कुछ (ग्रंथ|परंपरा)|अन्य|अलग/.test(all)) add("WARN", "label", `${c.status} claim should be labelled in the text`); }
    else add("FAIL", "claim-status", "status must be verified | tradition | variant | interpretation: " + c.status);
  }
  for (const s of src) if (/(पर्व|parva|section)\s*\d+/i.test(s.label || "") && !(it.claims || []).some(c => c.source)) add("WARN", "unchecked-citation", `citation "${s.label}" has no machine-checked claim behind it`);
  // ---- the citation line must be derived from the claims, not free text ----
  if (it.source_line) { const toAscii = t => t.replace(/[०-९]/g, d => String("०१२३४५६७८९".indexOf(d))), cited = new Set((it.claims || []).map(c => /:(\d+)$/.exec(c.source || "")).filter(Boolean).map(m => +m[1])), stray = []; for (const x of toAscii(it.source_line).match(/\d+(?:\s*[–-]\s*\d+)?/g) || []) { const r = x.split(/\s*[–-]\s*/).map(Number); if (r.length === 2) { if (!cited.has(r[0]) || !cited.has(r[1])) stray.push(x); } else if (!cited.has(r[0])) stray.push(x); } if (stray.length) add("FAIL", "source-line-mismatch", `source_line cites ${stray.join(", ")} but no verified claim points there (claims cite: ${[...cited].join(", ") || "none"})`); }
  // ---- Hindi grammar slips common in model drafts ----
  for (const [re, fix] of [[/कौन ने/, "किसने"], [/\bका (\S+) की\b.*\bका\b.*\bका\b.*\bका\b/, "stacked possessives: rewrite"], [/अपने द्वारा जन्मे/, "stilted passive: rewrite"]]) if (re.test(all)) add("FAIL", "hindi-grammar", `suspect phrasing (${String(re).slice(1, 24)}): ${fix}`);
  if (it.writer && /ollama|local/i.test(it.writer)) add("WARN", "llm-draft", "written by a local model: its Hindi and facts need a full human rewrite pass before approval; prefer the Claude API for drafting");
  // ---- originality ----
  const mine = shingles(all); const itemsDir = path.join(root, "content/items");
  for (const g of fs.existsSync(itemsDir) ? fs.readdirSync(itemsDir) : []) { if (!g.endsWith(".json") || g === it.id + ".json") continue; const o = JSON.parse(fs.readFileSync(path.join(itemsDir, g), "utf8")); if (o.format !== f && o.topic !== it.topic) continue; const sh = shingles([o.hook, ...(o.body_lines || []), ...(o.slides || []), o.markdown].filter(Boolean).join("\n")); let inter = 0; for (const x of mine) if (sh.has(x)) inter++; const sim = inter / Math.max(1, Math.min(mine.size, sh.size)); if (o.format === f && sim > 0.5) add("FAIL", "duplicate", `${(100 * sim).toFixed(0)}% overlap with ${g}`); }
  if (fs.existsSync(path.join(root, "research/corpus"))) for (const x of (it.markdown || it.body_lines || []).toString().match(/[A-Za-z' ,]{80,}/g) || []) for (const h of search(x, 1)) if (h.score > 40) add("FAIL", "copied-translation", "a long English passage matches the public-domain translation verbatim: paraphrase it");
  // ---- disclosure and review ----
  if (!it.tradition_note && ["blog", "reel_script"].includes(f)) add("FAIL", "tradition-note", "state the text/tradition and variants");
  if (!it.ai_assisted) add("WARN", "disclosure", "ai_assisted flag missing: disclose AI help on the page/about page");
  return CHECKS.slice();
}
export { run };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), files = a.includes("--all") ? fs.readdirSync(path.join(root, "content/items")).filter(f => f.endsWith(".json")).map(f => path.join(root, "content/items", f)) : a.filter(x => !x.startsWith("--")).map(x => path.resolve(x)); let bad = 0;
  for (const f of files) { const r = run(JSON.parse(fs.readFileSync(f, "utf8"))), fails = r.filter(x => x.level === "FAIL").length, warns = r.filter(x => x.level === "WARN").length; if (fails) bad++; console.log(`${fails ? "FAIL" : warns ? "WARN" : "PASS"} ${path.basename(f)}  (${fails} fail, ${warns} warn)`); for (const x of r) console.log(`   ${x.level} ${x.code}: ${x.msg}`); }
  process.exit(bad ? 1 : 0);
}
