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
const LABELS = ["FORMAT", "SLUG", "PILLAR", "TOPIC", "HOOK", "SLIDES", "BODY", "CTA", "SOURCE_LINE", "HASHTAGS", "TRADITION", "TITLE", "META", "MARKDOWN", "CLAIMS", "SOURCES", "DISCLOSURE", "ART_STYLE", "NARRATION"];
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
  it.claims = many("CLAIMS").map(l => { const [text, en, status, source] = l.replace(/^[-*•]\s*/, "").split("|").map(x => x.trim()); return { text, ...(en ? { en } : {}), status: status || "verified", ...(source ? { source } : {}) }; });
  const refs = [...new Set(it.claims.map(c => c.source).filter(Boolean))]; it.sources = many("SOURCES").length ? many("SOURCES").map(l => { const [label, ref] = l.replace(/^[-*•]\s*/, "").split("|").map(x => x.trim()); return { label, ref }; }) : refs.map(r => ({ label: it.source_line || r, ref: r }));
  return finish(it);
}
function finish(it) { it.id = it.id || `${it.slug}.${it.format}`; it.slug = it.slug || it.id.split(".")[0]; if (!/^[a-z0-9._-]+$/.test(it.id)) throw new Error("slug/id must be lowercase english letters, digits, - and _ (got: " + it.id + ")"); if (it.format === "carousel" && it.slides && !it.cta_slide_last) it.cta_slide_last = true; return it; }
// The instruction to paste into a frontier model. It carries the real source passages from our corpus so the model writes from text, not memory.
export function brief(topic, format = "carousel", query = null, withNarration = false) {
  const writer = fs.readFileSync(path.join(root, "content/prompts/writer_system.txt"), "utf8"), q = query || topic.query || topic.title, hits = search(q, 8).map(h => `[${h.src}:${h.n}] ${h.label}\n${h.text}`).join("\n\n");
  const fmt = { carousel: "5-10 slides. Each slide: `n | Hindi text (<=14 words, slide 1 <=10) | English image prompt`. The English prompt is ONE prose paragraph, 40-60 words, subject first, then action, setting, lighting; describe what you want (no 'no/without'); symbolic and respectful for sacred or painful moments; never include text or Devanagari in the picture. Last slide: one action (save/follow @kathaaya.stories) with no image prompt.", fb_text: "BODY: 2-4 short Hindi lines that withhold the answer; CTA: one open question + invitation to save; no link; <=3 hashtags.", blog: "MARKDOWN: article with an H1, >=3 H2, >=700 words, FAQ lines as **question?** answer; TITLE, META (<=160 chars), TRADITION.", reel_script: "BODY: 6-9 spoken lines of 6-12 words each, hook first." }[format];
  return `${writer}\n\n=== TASK ===\nTopic: ${topic.title}\nFormat: ${format}\nPillar: ${topic.pillar || ""}${topic.note ? "\nManager note: " + topic.note : ""}\n\nReturn ONLY text in this labelled format (no commentary):\nFORMAT: ${format}\nSLUG: ${topic.slug}\nPILLAR: ${topic.pillar || "unsaid-relations"}\nHOOK: ...\n${format === "carousel" ? "SLIDES:\n1 | ... | ...\n" : format === "blog" ? "TITLE: ...\nMETA: ...\nTRADITION: ...\nMARKDOWN:\n# ...\n" : "BODY:\n- ...\n"}CTA: ...\n${withNarration && format === "carousel" ? "NARRATION:\n1 | [hook] spoken Hindi for slide 1 (2-3 sentences)\n2 | spoken Hindi for slide 2\n(one line per slide, about 25-30 spoken words each (total 250-295) so the reel runs 75-90 seconds; use only facts from your claims; optional [intent] = hook, curious, narrate, tense, awe, punch, reveal, reflective)\n" : ""}SOURCE_LINE: स्रोत: <text, section numbers that your claims actually cite> (<translation>)\nHASHTAGS: #kathaaya ...\nTRADITION: ...\nCLAIMS:\n- Hindi claim | English paraphrase using the source's own words | verified | <corpus>:<section>\n- (use status tradition / variant / interpretation, without a source, for anything the text does not say)\n\nFormat rules: ${fmt}\n\n=== SOURCES (the only facts you may use; cite as <corpus>:<section>) ===\n${hits || "(no passages found: do not state facts)"}\n`;
}
// Prompt for a frontier model to write the spoken narration of a REEL (75-90 s) for an existing carousel: one line per slide, only facts that are already in the claims.
export function narrationBrief(item) {
  const claims = (item.claims || []).map(c => `- ${c.text}${c.source ? "  [" + c.source + "]" : ""} (${c.status})`).join("\n"), slides = (item.slides || []).map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `You write the voice-over for a 75-90 second Hindi Instagram/Facebook/YouTube Reel of the KATHAAYA channel. The reel shows the carousel slides below as animated stippled paintings; your lines are spoken over them by a synthetic Hindi voice.\n\nRULES: energetic, punchy, warm plain Hindi in Devanagari; short sentences; about 25-30 spoken words per slide (250-295 words in total; the voice speaks about 3.3 words a second); line 1 is the hook and must restate the question of the carousel's first slide; build suspense, give the answer late; use ONLY the facts in CLAIMS (no new facts, names, numbers or details); beliefs and interpretations must be labelled as such; no invented statistics; no 'comment a word'; the last line invites a save and a follow of @kathaaya.stories; write numbers as words. Optional [intent] per line: hook, curious, narrate, tense, awe, punch, reveal, reflective.\n\nCAROUSEL SLIDES (one narration line per slide, same order):\n${slides}\n\nCLAIMS (the only facts you may use):\n${claims}\n\nSOURCE: ${item.source_line || ""}\n\nReturn ONLY:\nNARRATION:\n1 | [hook] ...\n2 | ...\n(${(item.slides || []).length} lines)`;
}
