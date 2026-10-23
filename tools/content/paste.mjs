// Turns text pasted from a frontier model (Claude, GPT, Gemini...) into a content item, and builds the brief you give those models.
// Accepts (1) a JSON item, or (2) the labelled text format below. Missing facts are NOT invented: they show up as QA failures.
//
//   FORMAT: carousel            (carousel | fb_text | blog | reel_script)
//   SLUG: ganga-seven-sons      (english, lowercase, hyphens)
//   PILLAR: unsaid-relations
//   HOOK: गंगा ने सात पुत्रों को क्यों बहाया?
//   SLIDES:
//   1 | हिंदी स्लाइड टेक्स्ट | English prose image prompt (optional)
//   2 | ...
//   BODY:                       (fb_text: one line per row)
//   - line one
//   CTA: सेव करें · फ़ॉलो करें
//   SOURCE_LINE: स्रोत: महाभारत, आदि पर्व, खंड ९८–९९ (गांगुली अनुवाद)
//   HASHTAGS: #kathaaya #गंगाकथा #महाभारत
//   TRADITION: कथा महाभारत (आदि पर्व) के अनुसार; ...
//   TITLE / META / FAQ lines for blog; MARKDOWN: then the article until the next label
//   CLAIMS:
//   - हिंदी दावा | english paraphrase using the source's words | verified | mahabharata-adi:98
//   - व्याख्या वाला दावा | | interpretation
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { search } from "./corpus.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LABELS = ["FORMAT", "SLUG", "PILLAR", "TOPIC", "HOOK", "SLIDES", "BODY", "CTA", "SOURCE_LINE", "HASHTAGS", "TRADITION", "TITLE", "META", "MARKDOWN", "CLAIMS", "SOURCES", "DISCLOSURE", "ART_STYLE", "NARRATION", "YOUTUBE", "KEYWORDS", "SECTION", "PEG", "HERO_ALT", "AUTHOR", "KEYFACTS", "TIMELINE", "COVER_PROMPT", "FIGURES"];
export function parse(text) {
  const t = text.trim(); if (t.startsWith("{")) { const it = JSON.parse(t); return finish(it); }
  const secs = {}; let cur = null; for (const line of t.split("\n")) { const m = /^\s*([A-Z_]{3,12})\s*:\s*(.*)$/.exec(line); if (m && LABELS.includes(m[1])) { cur = m[1]; secs[cur] = [m[2]]; } else if (cur) secs[cur].push(line); }
  const one = k => (secs[k] || [""])[0].trim(), many = k => (secs[k] || []).slice(1).map(x => x.trim()).filter(Boolean), it = { language: "hi", ai_assisted: true, status: "draft", created: new Date().toISOString().slice(0, 10) };
  it.format = one("FORMAT") || "carousel"; it.slug = one("SLUG"); it.pillar = one("PILLAR") || "unsaid-relations"; it.topic = one("TOPIC") || it.slug; it.hook = one("HOOK"); it.cta = one("CTA"); it.source_line = one("SOURCE_LINE"); it.tradition_note = one("TRADITION");
  it.hashtags = (one("HASHTAGS").match(/#[^\s#]+/g) || []); it.id = `${it.slug}.${it.format}`;
  if (secs.SLIDES) { const rows = many("SLIDES").map(l => l.split("|").map(x => x.trim())); it.slides = rows.map(r => r[1] !== undefined ? r[1] : r[0].replace(/^\d+[.)]\s*/, "")); const art = rows.map((r, i) => r[2] ? { slide: i + 1, prompt: r[2], medium: "photoreal" } : null).filter(Boolean); if (art.length) { it.art = art; it.ai_art_disclosed = true; it.disclosure_text = one("DISCLOSURE") || "चित्र: AI-निर्मित"; } }
  if (secs.NARRATION) { const rows = many("NARRATION").map(l => /^(\d+)\s*[|:.)-]\s*(?:\[(\w+)\]\s*)?(.+)$/.exec(l)).filter(Boolean), n = Math.max(0, ...rows.map(m => +m[1])); it.narration = Array.from({ length: n }, (_, i) => { const m = rows.find(r => +r[1] === i + 1); return m ? { text: m[3].trim(), ...(m[2] ? { intent: m[2] } : {}) } : { text: "" }; }); }
  if (secs.BODY) it.body_lines = many("BODY").map(x => x.replace(/^[-*•]\s*/, ""));
  if (secs.MARKDOWN) { it.markdown = (secs.MARKDOWN.slice(1).join("\n")).trim(); it.title = one("TITLE") || (/^#\s+(.+)$/m.exec(it.markdown) || [])[1] || it.hook; it.meta_description = one("META"); it.faq = [...it.markdown.matchAll(/\*\*([^*]+\?)\*\*/g)].map(m => ({ q: m[1] })); }
  // blog extras (Google News / SEO): the YouTube video to embed, search keywords, the section, the news peg (why now), the author, the hero picture's alt text, key facts and a timeline
  if (secs.YOUTUBE) { const m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})|^([\w-]{11})$/.exec(one("YOUTUBE")); if (m) it.video_id = m[1] || m[2]; }
  if (secs.KEYWORDS) it.hinglish_keywords = one("KEYWORDS").split(/[,;|]/).map(x => x.trim()).filter(Boolean).slice(0, 8);
  if (secs.SECTION && ["itihasa", "puranas", "vrat-tyohar", "world"].includes(one("SECTION"))) it.section = one("SECTION");
  if (secs.PEG) it.timely_hook = one("PEG"); if (secs.HERO_ALT) it.hero_alt = one("HERO_ALT"); if (secs.AUTHOR) it.author = one("AUTHOR");
  if (secs.KEYFACTS) it.keyfacts = many("KEYFACTS").map(l => { const [label, value, icon] = l.replace(/^[-*•]\s*/, "").split("|").map(x => x.trim()); return { label, value, icon: icon || "📜" }; }).filter(k => k.label && k.value);
  if (secs.TIMELINE) it.timeline = many("TIMELINE").map(l => { const [title, text] = l.replace(/^[-*•]\s*/, "").split("|").map(x => x.trim()); return { title, text: text || "" }; }).filter(x => x.title);
  // pictures the model plans (the Blog tab shows them pre-filled: paste/generate the prompt with FLUX or attach your own file): COVER_PROMPT + HERO_ALT, and FIGURES lines  after=<n> | illustration|infographic | prompt or infographic brief | alt | caption
  { const imgs = []; if (secs.COVER_PROMPT) imgs.push({ id: "cover", role: "hero", prompt: one("COVER_PROMPT"), alt: one("HERO_ALT"), caption: "", after: 0, path: "" });
    if (secs.FIGURES) many("FIGURES").forEach((l, i) => { const [a, role, prompt, alt, caption] = l.replace(/^[-*•]\s*/, "").split("|").map(x => x.trim()), n = /after\s*=\s*(\d+)/i.exec(a || ""); if (!n || !prompt) return; imgs.push({ id: "fig" + (i + 1), role: /info/i.test(role || "") ? "infographic" : "illustration", prompt, alt: alt || "", caption: caption || "", after: +n[1], path: "" }); });
    if (imgs.length) it.images = imgs; }
  it.claims = many("CLAIMS").map(l => { const [text, en, status, source] = l.replace(/^[-*•]\s*/, "").split("|").map(x => x.trim()); return { text, ...(en ? { en } : {}), status: status || "verified", ...(source ? { source } : {}) }; });
  const refs = [...new Set(it.claims.map(c => c.source).filter(Boolean))]; it.sources = many("SOURCES").length ? many("SOURCES").map(l => { const [label, ref] = l.replace(/^[-*•]\s*/, "").split("|").map(x => x.trim()); return { label, ref }; }) : refs.map(r => ({ label: it.source_line || r, ref: r }));
  return finish(it);
}
function finish(it) { it.id = it.id || `${it.slug}.${it.format}`; it.slug = it.slug || it.id.split(".")[0]; if (!/^[a-z0-9._-]+$/.test(it.id)) throw new Error("slug/id must be lowercase english letters, digits, - and _ (got: " + it.id + ")"); if (it.format === "carousel" && it.slides && !it.cta_slide_last) it.cta_slide_last = true; return it; }
// The blog brief (owner 2026-10-23: write the SAME story as the video as an article that can qualify for Google News / Discover and rank in search, with the YouTube video embedded).
// Every rule below is either a Google News / Search guideline or one of our own QA checks (tools/content/news-readiness.mjs), so a post written to this brief passes the gate.
export const BLOG_RULES = `ROLE: you are the senior Hindi editor of KATHAAYA, a mythology publication. You turn a finished video story into a researched article. It is an article, never a transcript of the video.

STRUCTURE (Google News and Search favour this; the QA gate checks it)
- TITLE: Hindi, about 60-70 characters (hard maximum 110), the main search phrase in the first half, one specific promise. No clickbait, no ALL CAPS, no emoji, no trailing "...". The article must deliver exactly what the title says.
- META: one Hindi sentence, 120-155 characters, with the main phrase and the hook; no quotation marks.
- LEDE (first paragraph, at most 60 words): inverted pyramid. In the first 100 words answer who, what, where and why it matters NOW (use PEG: the festival, tithi or occasion that makes today the right day; state a date only if PEG gives it). Keep one real question for the body to answer.
- Put the line [[VIDEO]] on its own line right after the lede. The system turns it into the embedded YouTube video (a privacy-friendly player) with a one-line caption.
- H1 only once (the title). Then 5-8 H2 sections, each a clear phrase or question a reader might search ("शंखचूड़ कौन था?", "तुलसी का श्राप क्या था?"). Paragraphs of 2-4 sentences, at most 90 words. A numbered timeline or a small comparison where it helps.
- Length 900-1500 words (700 is the hard minimum; padding is worse than short).
- Last H2: "पूछे जाने वाले प्रश्न": 4-6 real reader questions as **Question?** then a 20-50 word answer.
- End with a 2-sentence takeaway and 3 related story titles (as a plain list under "आगे पढ़ें"); no hard sell, one soft line pointing to the video.

TRUST (this is what separates a publication from a content farm)
- Every factual claim names its text and place ("देवी भागवत पुराण, नवम स्कंध, अध्याय २२"). Where tellings differ, say so and name both. Beliefs and interpretation are labelled "मान्यता" or "व्याख्या". Never invent a quote, a verse number, a date or a statistic. Quote at most 25 words from any translation and name the translator.
- First mention of each Sanskrit name: Devanagari with the Roman spelling in brackets once (तुलसी (Tulsi)), because readers search in both scripts.
- At least 2 distinct sources (listed under SOURCES) and 2-4 internal link suggestions in the text as {{link: slug | anchor text}}; external links only to real, authoritative pages you were given.
- PICTURES (plan them; the editor paints or attaches them): one COVER_PROMPT and 2-4 FIGURES. Each picture prompt is ONE English paragraph of 40-80 words: subject first, then action, setting and light; cinematic photorealistic movie still; era-correct and culture-correct for the story; at most two clearly visible figures; hands hidden or doing one clear action; NO text, letters or logos in the picture. Add an infographic only when the source gives real structure (a timeline, a family tree, a journey, a comparison of two tellings, a list such as the fourteen jewels): its entry is an INFOGRAPHIC BRIEF instead of a painting prompt: the title, 4-7 items with the exact Hindi text for each, and the suggested layout (vertical timeline, tree, two columns). Never put a fact in an infographic that is not in the article. Place each figure with after=<n>: 0 = after the intro and video, n = after section n; spread them, never two in a row.
- Respectful of every faith; no mockery, no fear-mongering, no medical, legal or money claims; no sectarian attacks.

SEO WITHOUT STUFFING
- One main phrase in the title, the lede, one H2 and the META; natural variants elsewhere. Density stays under 2%. Write for a person who is curious tonight.
- KEYWORDS: 4-8 Hinglish search phrases people really type (for example "tulsi vivah katha in hindi").
- HERO_ALT: one factual sentence describing the cover picture for a screen reader; it does not repeat the title.

OUTPUT: only the labelled block (no commentary, no code fences):
FORMAT: blog
SLUG: <lowercase-latin-dashes>
TITLE:
META:
SECTION: <itihasa | puranas | vrat-tyohar | world>
PEG: <the occasion that makes it timely, in Hindi, with the date if given>
KEYWORDS: <comma separated>
YOUTUBE: <the video URL given below>
HERO_ALT:
COVER_PROMPT: <English paragraph for the cover picture, 16:9, text-free>
AUTHOR: <a real byline if given, else leave out>
TRADITION: <one sentence: which text this follows and that other tellings differ>
KEYFACTS:
- <label> | <value> | <emoji>      (3-5 lines: स्रोत, पात्र, स्थान, पर्व, पढ़ने का समय)
TIMELINE:
- <short step title> | <one line>     (4-7 steps, optional)
FIGURES:
- after=<0..n> | illustration | <English painting prompt> | <Hindi alt text> | <Hindi caption>
- after=<n> | infographic | <INFOGRAPHIC BRIEF: title, 4-7 items with exact Hindi text, layout> | <Hindi alt text> | <Hindi caption>
MARKDOWN:
# <title>
...the article...
SOURCES:
- <text, section, translator> | <corpus ref>
CLAIMS:
- <Hindi claim> | <English paraphrase using the source's words> | verified | <corpus>:<section>`;
// The instruction to paste into a frontier model. It carries the real source passages from our corpus so the model writes from text, not memory.
export function brief(topic, format = "carousel", query = null, withNarration = false) {
  const writer = fs.readFileSync(path.join(root, "content/prompts/writer_system.txt"), "utf8"), q = query || topic.query || topic.title, hits = search(q, 8).map(h => `[${h.src}:${h.n}] ${h.label}\n${h.text}`).join("\n\n");
  const fmt = { carousel: "5-10 slides. Each slide: `n | Hindi text (<=14 words, slide 1 <=10) | English image prompt`. The English prompt is ONE prose paragraph, 40-60 words, subject first, then action, setting, lighting; describe what you want (no 'no/without'); symbolic and respectful for sacred or painful moments; never include text or Devanagari in the picture. Last slide: one action (save/follow @kathaaya.stories) with no image prompt.", fb_text: "BODY: 2-4 short Hindi lines that withhold the answer; CTA: one open question + invitation to save; no link; <=3 hashtags.", blog: BLOG_RULES, reel_script: "BODY: 6-9 spoken lines of 6-12 words each, hook first." }[format];
  return `${writer}\n\n=== TASK ===\nTopic: ${topic.title}\nFormat: ${format}\nPillar: ${topic.pillar || ""}${topic.note ? "\nManager note: " + topic.note : ""}${format === "blog" ? "\nVIDEO SCRIPT (the narration of the matching video: expand it into an article, never copy it): [paste the narration lines here]\nYOUTUBE LINK: [paste the video link]\nPEG (why this is timely): [festival / tithi / anniversary, with the date if you have it]\nAUTHOR (real byline, optional): [name]" : ""}\n\nReturn ONLY text in this labelled format (no commentary):\nFORMAT: ${format}\nSLUG: ${topic.slug}\nPILLAR: ${topic.pillar || "unsaid-relations"}\nHOOK: ...\n${format === "carousel" ? "SLIDES:\n1 | ... | ...\n" : format === "blog" ? "TITLE: ...\nMETA: ...\nSECTION: ...\nPEG: ...\nKEYWORDS: ...\nYOUTUBE: ...\nHERO_ALT: ...\nTRADITION: ...\nKEYFACTS:\n- ...\nMARKDOWN:\n# ...\n" : "BODY:\n- ...\n"}CTA: ...\n${withNarration && format === "carousel" ? "NARRATION:\n1 | [hook] spoken Hindi for slide 1 (2-3 sentences)\n2 | spoken Hindi for slide 2\n(one line per slide, about 25-30 spoken words each (total 250-295) so the reel runs 75-90 seconds; use only facts from your claims; optional [intent] = hook, curious, narrate, tense, awe, punch, reveal, reflective)\n" : ""}SOURCE_LINE: स्रोत: <text, section numbers that your claims actually cite> (<translation>)\nHASHTAGS: #kathaaya ...\nTRADITION: ...\nCLAIMS:\n- Hindi claim | English paraphrase using the source's own words | verified | <corpus>:<section>\n- (use status tradition / variant / interpretation, without a source, for anything the text does not say)\n\nFormat rules: ${fmt}\n\n=== SOURCES (the only facts you may use; cite as <corpus>:<section>) ===\n${hits || "(no passages found: do not state facts)"}\n`;
}
// Prompt for a frontier model to write the spoken narration of a REEL (75-90 s) for an existing carousel: one line per slide, only facts that are already in the claims.
export function narrationBrief(item) {
  const claims = (item.claims || []).map(c => `- ${c.text}${c.source ? "  [" + c.source + "]" : ""} (${c.status})`).join("\n"), slides = (item.slides || []).map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `You write the voice-over for a 75-90 second Hindi Instagram/Facebook/YouTube Reel of the KATHAAYA channel. The reel shows the carousel slides below as animated stippled paintings; your lines are spoken over them by a synthetic Hindi voice.\n\nRULES: energetic, punchy, warm plain Hindi in Devanagari; short sentences; about 25-30 spoken words per slide (250-295 words in total; the voice speaks about 3.3 words a second); line 1 is the hook and must restate the question of the carousel's first slide; build suspense, give the answer late; use ONLY the facts in CLAIMS (no new facts, names, numbers or details); beliefs and interpretations must be labelled as such; no invented statistics; no 'comment a word'; the last line invites a save and a follow of @kathaaya.stories; write numbers as words. Optional [intent] per line: hook, curious, narrate, tense, awe, punch, reveal, reflective.\n\nCAROUSEL SLIDES (one narration line per slide, same order):\n${slides}\n\nCLAIMS (the only facts you may use):\n${claims}\n\nSOURCE: ${item.source_line || ""}\n\nReturn ONLY:\nNARRATION:\n1 | [hook] ...\n2 | ...\n(${(item.slides || []).length} lines)`;
}
