// VIDEO INPUT PACK: the one text the owner pastes into the Hub (New video tab) to make a video, and the strict prompt that gets a frontier model to write it.
// Everything the system can use is a labelled field here, and every allowed value is imported from the code that consumes it (effects, components, kinetic styles, backdrops, looks...),
// so a flag the model writes is a flag the engine understands. Only TITLE + NARRATION are required; every other field removes a guess the local models would otherwise make.
//   parsePack(text)  -> { ok, errors[], warnings[], pack }      packPrompt({topic, format, source}) -> the prompt text      savePack(pack) -> content/videos/<slug>.video.json + stories/video-<slug>/{script.txt,pack.json}
//   applyDirections(dir) -> after the director: the owner's SCENES / VISUALS / LOOK are written into plan.json, assets/art/shots.json and look.json
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
import { CATALOG, FX_BY_INTENT } from "../longform/director.mjs"; import { EFFECTS } from "../../engine/longform/fx.js"; import { BG_NAMES } from "../../engine/longform/backdrops.js"; import { makeLook } from "../longform/look.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), J = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } }, W = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1)); };
export const WPS = 3.0;   // spoken words per second with the designed pauses (matches tools/video/script.mjs)
export const INTENTS = { hook: "the opening question/shock (beat 1 only)", curious: "a question or a new thread opens", narrate: "plain storytelling (default)", tense: "danger, conflict, the turn", awe: "wonder, divine light, a boon", punch: "one short blow of a line (<= 6 words)", reveal: "the answer arrives", reflective: "closing thought, the last 2 beats" };
export const KINETIC_STYLES = ["slam", "wave", "mask", "spring", "flip", "stack", "glitch"], MARKS = ["underline", "circle", "box", "highlight", "bracket"], MOVES = ["push", "pull", "panL", "panR"], REVEALS = ["circle", "diamond", "wipe"];
export const GRADES = ["film", "teal", "dream", "leak"], CAPTIONS = ["pop", "box", "karaoke"], TRANSITIONS = ["dissolve", "wipe", "iris", "zoom"], MOTIFS = ["mandala", "flow", "rangoli", "rays", "ink"], MOODS = ["war", "cosmic", "river", "sorrow", "devotion", "neutral"];
export const STICKERS = () => { try { return fs.readdirSync(path.join(root, "engine/longform/lottie")).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)); } catch { return []; } };
export const FORMATS = { short: { label: "short (vertical 9:16 Reel / Short)", size: "1080x1920", minWords: 130, maxWords: 540, minutes: 3, lineWords: [5, 16] }, long: { label: "long (horizontal 16:9 film)", size: "1920x1080", minWords: 540, maxWords: 2160, minutes: 12, lineWords: [6, 20] } };
const LABELS = ["FORMAT", "SLUG", "TITLE", "THUMB", "THUMB_SUPPORT", "THUMB_STYLE", "THUMB_ART", "THUMB_SCENE", "SOURCE_LINE", "TRADITION", "HASHTAGS", "LOOK", "NARRATION", "CHAPTERS", "SCENES", "VISUALS", "CLAIMS"];
const budget = (t, n) => String(t || "").trim().split(/\s+/).filter(Boolean).length <= n;
export function parsePack(text) {
  const errors = [], warnings = [], sec = {}; let cur = null;
  for (const raw of String(text || "").replace(/\r/g, "").split("\n")) { const m = /^\s*([A-Z_]+)\s*:\s*(.*)$/.exec(raw); if (m && LABELS.includes(m[1])) { cur = m[1]; sec[cur] = [m[2]]; continue; } if (cur) sec[cur].push(raw); }
  const one = k => (sec[k] ? sec[k][0].trim() : ""), many = k => (sec[k] || []).slice(k in { NARRATION: 1, SCENES: 1, VISUALS: 1, CLAIMS: 1, CHAPTERS: 1 } ? 1 : 0).map(x => x.trim()).filter(Boolean);
  const format = (one("FORMAT") || "short").toLowerCase(); if (!FORMATS[format]) errors.push(`FORMAT must be short or long (got "${one("FORMAT")}")`);
  const F = FORMATS[format] || FORMATS.short, title = one("TITLE"), slug = one("SLUG") || ""; if (!title) errors.push("TITLE is required (the Hindi question that is also the YouTube title)"); else if ([...title].length > 70) warnings.push(`TITLE is ${[...title].length} characters: YouTube cuts it near 60 on mobile`);
  if (slug && !/^[a-z0-9][a-z0-9-]{2,50}$/.test(slug)) errors.push("SLUG must be lowercase latin letters, digits and dashes (3-50 characters), e.g. karna-kavach-daan");
  // narration: "N | [intent] text" or plain lines; "## Chapter title" starts a chapter (long films)
  const beats = []; let chapterTitle = null;
  for (const line of many("NARRATION")) { let m = /^##\s*(.+)$/.exec(line); if (m) { chapterTitle = m[1].trim(); continue; } let t = line.replace(/^\d+\s*[|.)]\s*/, ""), intent = null; m = /^\[(\w+)\]\s*(.*)$/.exec(t); if (m) { intent = m[1].toLowerCase(); t = m[2]; if (!INTENTS[intent]) { errors.push(`beat ${beats.length + 1}: unknown intent [${m[1]}] (allowed: ${Object.keys(INTENTS).join(", ")})`); intent = null; } }
    const accents = [...t.matchAll(/\*([^*]+)\*/g)].map(x => x[1].trim()), clean = t.replace(/\*/g, "").replace(/\s+/g, " ").trim(); beats.push({ n: beats.length + 1, text: clean, intent, accent: accents[0] || null, chapter: chapterTitle }); chapterTitle = null; }
  if (!beats.length) errors.push("NARRATION is required: one spoken line per row");
  const words = beats.reduce((a, b) => a + b.text.split(/\s+/).filter(Boolean).length, 0), secs = Math.round(words / WPS);
  if (beats.length) { if (words > F.maxWords) errors.push(`NARRATION is ${words} words (about ${secs} s): over the ${format} limit of ${F.maxWords} words (about ${Math.round(F.maxWords / WPS)} s). Cut ${words - F.maxWords} words.`); if (words < F.minWords) errors.push(`NARRATION is only ${words} words (about ${secs} s): a ${format} video needs at least ${F.minWords} words.`); }
  beats.forEach(b => { const w = b.text.split(/\s+/).length; if (w < F.lineWords[0] && b.intent !== "punch") warnings.push(`beat ${b.n}: only ${w} words (aim ${F.lineWords[0]}-${F.lineWords[1]}; use [punch] for deliberate one-liners)`); if (w > F.lineWords[1]) warnings.push(`beat ${b.n}: ${w} words is long for one visual (aim <= ${F.lineWords[1]})`); if (/[A-Za-z]{3,}/.test(b.text)) warnings.push(`beat ${b.n}: Latin letters in a Hindi narration line (the voice may mispronounce them)`); if (/\d/.test(b.text)) warnings.push(`beat ${b.n}: write numbers as Hindi words (digits are read badly)`); });
  if (beats[0] && beats[0].intent && beats[0].intent !== "hook") warnings.push("beat 1 should be [hook]");
  if (format === "long") { const chs = beats.filter(b => b.chapter).length; if (chs < 3) errors.push(`a long film needs at least 3 chapters ("## Chapter title" lines inside NARRATION; YouTube chapters need 3+), found ${chs}`); }
  // scenes: "N | subject | action | setting | light" (English, word budgets from tools/longform/art.mjs)
  const scenes = {}; for (const line of many("SCENES")) { const p = line.split("|").map(x => x.trim()), n = +p[0]; if (!n || n > beats.length) { errors.push(`SCENES: "${line.slice(0, 40)}" does not start with a valid beat number (1-${beats.length})`); continue; } if (p.length < 5) { errors.push(`SCENES ${n}: need 5 parts: N | subject | action | setting | light`); continue; } const [, subject, action, setting, lighting] = p; if (!budget(subject, 9) || !budget(action, 9) || !budget(setting, 8) || !budget(lighting, 6)) errors.push(`SCENES ${n}: word budget is subject<=9, action<=9, setting<=8, light<=6 (the painter rejects longer prompts)`); if (/[ऀ-ॿ]/.test(line)) errors.push(`SCENES ${n}: English only, no Devanagari`); if (/\b(no|without|not)\b/i.test(line)) warnings.push(`SCENES ${n}: describe what you want, never use no/without (the painter ignores negations)`); if (/\b(text|words|letters|logo|caption)\b/i.test(line)) warnings.push(`SCENES ${n}: never ask for text in the picture`); scenes[n] = { subject, action, setting, lighting }; }
  // visuals: "N | key=value key=value" (keys checked against the engine's own lists)
  const visuals = {}, FX = new Set(EFFECTS), ST = new Set(STICKERS()); for (const line of many("VISUALS")) { const [a, ...rest] = line.split("|"), n = +a.trim(); if (!n || n > beats.length) { errors.push(`VISUALS: "${line.slice(0, 40)}" does not start with a valid beat number`); continue; } const v = {}; for (const m of rest.join("|").matchAll(/(\w+)=("([^"]*)"|\S+)/g)) v[m[1]] = m[3] !== undefined ? m[3] : m[2];
    const chk = (k, ok, list) => { if (v[k] !== undefined && !ok) errors.push(`VISUALS ${n}: ${k}=${v[k]} is not allowed (use: ${list})`); };
    chk("comp", ["cinema", "kinetic", "quote", "fx"].includes(v.comp), "cinema, kinetic, quote"); chk("fx", FX.has(v.fx), EFFECTS.join(", ")); chk("style", KINETIC_STYLES.includes(v.style), KINETIC_STYLES.join(", ")); chk("bg", BG_NAMES.includes(v.bg) || v.bg === "classic", BG_NAMES.join(", ") + ", classic"); chk("mark", MARKS.includes(v.mark), MARKS.join(", ")); chk("sticker", ST.has(v.sticker), [...ST].join(", ")); chk("move", MOVES.includes(v.move), MOVES.join(", ")); chk("reveal", REVEALS.includes(v.reveal), REVEALS.join(", "));
    for (const k of Object.keys(v)) if (!["comp", "fx", "style", "bg", "mark", "sticker", "move", "reveal", "label", "behind", "text"].includes(k)) warnings.push(`VISUALS ${n}: unknown key ${k} is ignored`); if (v.behind && v.behind.split(/\s+/).length > 4) errors.push(`VISUALS ${n}: behind= is a 2-4 word headline`); visuals[n] = v; }
  // look
  const look = {}; for (const m of one("LOOK").matchAll(/(\w+)=(\S+)/g)) look[m[1]] = m[2]; const lk = (k, list) => { if (look[k] !== undefined && !list.includes(look[k])) errors.push(`LOOK: ${k}=${look[k]} is not allowed (use: ${list.join(", ")})`); }; lk("grade", GRADES); lk("captions", CAPTIONS); lk("transition", TRANSITIONS); lk("motif", MOTIFS); lk("mood", MOODS); if (look.hue !== undefined && !(Number(look.hue) >= -60 && Number(look.hue) <= 360)) errors.push("LOOK: hue is a number from -60 to 360"); if (look.bg !== undefined && ![...BG_NAMES, "classic"].includes(look.bg)) errors.push(`LOOK: bg=${look.bg} is not allowed (use: ${BG_NAMES.join(", ")}, classic)`);
  const thumb = one("THUMB"), thumbSupport = one("THUMB_SUPPORT"), thumbStyle = one("THUMB_STYLE").toLowerCase(), thumbArt = one("THUMB_ART"), thumbScene = many("THUMB_SCENE").join(" ").trim() || one("THUMB_SCENE"), maxT = format === "long" ? 7 : 5; if (thumb && thumb.replace(/[?？]/g, "").trim().split(/\s+/).length > maxT) errors.push(`THUMB is at most ${maxT} words for a ${format} video`); if (thumb && title && title.includes(thumb.replace(/[?？]/g, "").trim())) warnings.push("THUMB repeats the title: it must carry the OTHER half of the story"); if (thumbStyle && !["gold", "red", "teal", "purple", "parchment"].includes(thumbStyle)) errors.push("THUMB_STYLE must be gold, red, teal, purple or parchment"); if (thumbArt) { const q = thumbArt.split("|").map(x => x.trim()); if (q.length !== 4) errors.push("THUMB_ART needs 4 parts: subject | emotion | symbol | backdrop"); else if (q.some(x => x.split(/\s+/).length > 8) || /[ऀ-ॿ]/.test(thumbArt)) errors.push("THUMB_ART: English, at most 8 words per part"); }
  const claims = many("CLAIMS").map(l => { const [t, en, st, src] = l.replace(/^[-*•]\s*/, "").split("|").map(x => x.trim()); return { text: t, ...(en ? { en } : {}), status: st || "verified", ...(src ? { source: src } : {}) }; });
  if (!one("SOURCE_LINE")) warnings.push("SOURCE_LINE is empty: the description and carousel carry no source line");
  const chapters = beats.filter(b => b.chapter).map(b => ({ n: b.n, title: b.chapter }));
  const pack = { slug: slug || null, format, title, thumb, thumbSupport, thumbStyle: thumbStyle || null, thumbArt: thumbArt || null, thumbScene: thumbScene || null, source_line: one("SOURCE_LINE"), tradition: one("TRADITION"), hashtags: one("HASHTAGS").split(/\s+/).filter(h => h.startsWith("#")), look, beats, scenes, visuals, claims, chapters };
  return { ok: !errors.length, errors, warnings, pack, stats: { beats: beats.length, words, est_seconds: secs, chapters: chapters.length, scenes: Object.keys(scenes).length, visuals: Object.keys(visuals).length, format } };
}
// content/videos/<slug>.video.json is the item the pipeline reads; stories/video-<slug>/ gets the owner's script and the whole pack
export const slugOf = p => p.slug || ("v-" + [...p.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36));
// duplicate-content guard: warns (never blocks) when a very similar story already exists as a video, carousel, or blog post, so the channel does not repeat itself
export function findSimilar(pack) {
  const generic = new Set(["के", "की", "का", "को", "ने", "से", "में", "पर", "और", "है", "हैं", "था", "थी", "थे", "क्यों", "कैसे", "क्या", "कौन", "कथा", "महाभारत", "रामायण", "क्यों?", "story", "shorts"]);
  const words = t => (t || "").replace(/[?？|,।]/g, " ").split(/\s+/).filter(w => w.length > 2 && !generic.has(w));
  const mine = new Set(words(pack.title).concat(words((pack.beats || [])[0]?.text || "")));
  if (mine.size < 2) return [];
  const hits = [];
  const vdir = path.join(root, "content/videos"); if (fs.existsSync(vdir)) for (const f of fs.readdirSync(vdir)) { if (slugOf(pack) + ".video.json" === f) continue; const it = J(path.join(vdir, f)); if (!it) continue; const w = new Set(words(it.title || it.hook)); const overlap = [...mine].filter(x => w.has(x)).length; if (overlap >= Math.min(3, mine.size)) hits.push({ id: it.id, title: it.title || it.hook, overlap, kind: "video" }); }
  const idir = path.join(root, "content/items"); if (fs.existsSync(idir)) for (const f of fs.readdirSync(idir)) { const it = J(path.join(idir, f)); if (!it) continue; const w = new Set(words(it.hook || it.title)); const overlap = [...mine].filter(x => w.has(x)).length; if (overlap >= Math.min(3, mine.size)) hits.push({ id: it.id, title: it.hook || it.title, overlap, kind: it.format }); }
  return hits.sort((a, b) => b.overlap - a.overlap).slice(0, 5);
}
export function savePack(pack) {
  // RESUME: only the fields that change what a beat IS (its words, chapter, which picture/visual it gets) invalidate downstream work. Re-pasting the identical pack (e.g. after the laptop slept, the Hub restarted,
  // or you just click Make again) keeps beats.json/plan.json so script+director are skipped and art/voice/camera pick up exactly where they stopped -- nothing already made is redone.
  const slug = slugOf(pack), id = slug + ".video", it = { id, format: "video", video_format: pack.format, slug, topic: slug, language: "hi", status: "approved", hook: pack.title, title: pack.title, slides: [], art: [], cta: "सेव करें · फ़ॉलो करें", source_line: pack.source_line, tradition_note: pack.tradition, hashtags: pack.hashtags.length ? pack.hashtags : ["#kathaaya"], claims: pack.claims, thumb: { headline: pack.thumb, support: pack.thumbSupport, style: pack.thumbStyle, art: pack.thumbArt, scene: pack.thumbScene }, created: new Date().toISOString().slice(0, 10) };
  W(path.join(root, "content/videos", id + ".json"), it); const d = path.join(root, "stories", "video-" + slug); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "script.txt"), pack.beats.map(b => (b.chapter ? `## ${b.chapter}\n` : "") + (b.intent ? `[${b.intent}] ` : "") + b.text).join("\n") + "\n");
  const contentHash = crypto.createHash("sha1").update(JSON.stringify({ format: pack.format, beats: pack.beats.map(b => [b.text, b.chapter, b.intent]), scenes: pack.scenes, visuals: pack.visuals })).digest("hex"), hashFile = path.join(d, "pack.hash");
  const unchanged = fs.existsSync(hashFile) && fs.readFileSync(hashFile, "utf8").trim() === contentHash && fs.existsSync(path.join(d, "beats.json"));
  W(path.join(d, "pack.json"), pack); fs.writeFileSync(hashFile, contentHash);
  if (!unchanged) for (const f of ["beats.json", "script.json", "plan.json", "plan.report.json", "plan.final.json"]) fs.rmSync(path.join(d, f), { force: true });
  return { id, slug, dir: d, resumed: unchanged };
}
// after the director: the owner's own picture prompts, per-beat visual choices and look are written into the plan
export function applyDirections(dir, log = () => {}) {
  const pack = J(path.join(dir, "pack.json")); if (!pack) return { applied: 0 }; const planF = path.join(dir, "plan.json"), plan = J(planF), beats = J(path.join(dir, "beats.json")), idOf = n => beats[n - 1] && beats[n - 1].id, byId = Object.fromEntries(plan.map(p => [p.id, p])); let applied = 0;
  const shotsF = path.join(dir, "assets/art/shots.json"), shots = J(shotsF, {});
  for (const [n, s] of Object.entries(pack.scenes || {})) { const p = byId[idOf(+n)]; if (!p) continue; const key = "s" + n; shots[key] = { ...s, medium: "ravi-varma" }; const keepFx = p.params && p.params.fx; p.comp = keepFx ? "fx" : "cinema"; p.params = { ...(p.params || {}), img: key, move: (p.params && p.params.move) || "push" }; if (!keepFx) delete p.params.fx; applied++; log(`beat ${n}: owner's picture prompt -> scene ${key}`); }
  for (const [n, v] of Object.entries(pack.visuals || {})) { const b = beats[+n - 1], p = byId[idOf(+n)]; if (!p || !b) continue; const comp = v.comp || p.comp; p.params = p.params || {};
    if (comp === "kinetic") { const acc = (pack.beats[+n - 1] || {}).accent, words = b.text.replace(/[।?!,]/g, "").split(/\s+/).filter(Boolean).slice(0, 7); let line = v.text || words.join(" "); if (acc && line.includes(acc) && !line.includes("*")) line = line.replace(acc, "*" + acc + "*"); p.comp = "kinetic"; p.params = { lines: [line], style: v.style || p.params.style || "slam", ...(v.bg ? { bg: v.bg } : {}), ...(v.mark ? { mark: v.mark } : {}) }; }
    else if (comp === "quote") { p.comp = "quote"; p.params = { text: v.text || b.text, by: "", ...(v.bg ? { bg: v.bg } : {}) }; }
    else { if (v.fx) { p.comp = "fx"; p.params.fx = v.fx; } else if (comp === "cinema") { p.comp = "cinema"; delete p.params.fx; } if (v.move) p.params.move = v.move; if (v.reveal) p.params.reveal = v.reveal; if (v.label) p.params.label = v.label; if (v.behind) p.params.behind = v.behind; }
    if (v.sticker) p.params.sticker = v.sticker; if (v.bg && p.comp !== "kinetic" && p.comp !== "quote") p.params.bg = v.bg; applied++; log(`beat ${n}: owner's visual choice ${JSON.stringify(v).slice(0, 80)}`); }
  // the accent the owner starred in kinetic beats the director chose itself
  pack.beats.forEach(b => { if (!b.accent) return; const p = byId[idOf(b.n)]; if (p && p.comp === "kinetic" && Array.isArray(p.params.lines) && !p.params.lines.join(" ").includes("*") && p.params.lines.join(" ").includes(b.accent)) p.params.lines = p.params.lines.map(l => l.replace(b.accent, "*" + b.accent + "*")); });
  W(planF, plan); if (Object.keys(shots).length) W(shotsF, shots);
  if (pack.look && Object.keys(pack.look).length) { const look = makeLook(dir); Object.assign(look, Object.fromEntries(Object.entries(pack.look).map(([k, v]) => [k, k === "hue" ? Number(v) : v]))); W(path.join(dir, "look.json"), look); log("look overrides: " + JSON.stringify(pack.look)); }
  return { applied };
}
// ---------------------------------------------------------------- the strict prompt
export function packPrompt({ topic = "", format = "short", source = "" } = {}) {
  const F = FORMATS[format] || FORMATS.short, minW = F.minWords, maxW = format === "short" ? 270 : 1500, fx = EFFECTS.filter(x => x !== "map_loka_zoom").join(", "), st = STICKERS().join(", ");
  const fxGuide = Object.entries(FX_BY_INTENT).map(([k, v]) => `   ${k}: ${v.join(", ")}`).join("\n");
  return `You are the script writer and visual director for KATHAAYA, a Hindi Indian-mythology video channel. Produce ONE input pack for our video system, in EXACTLY the labelled format below. Output only the pack: no commentary, no markdown fences. The system voices the NARRATION, paints the pictures, plans every scene and renders the film; every flag you write is read by code, so use only the allowed values.

TOPIC: ${topic || "<write the topic here>"}
FORMAT: ${format}  (${F.label}; ${F.size})
${source ? "SOURCE MATERIAL (use only facts from it):\n" + source + "\n" : "SOURCE: use only facts you can ground in the named scripture section; never invent names, numbers, quotes or details. If tradition differs, say so in a narration line (\"महाभारत के अनुसार…\").\n"}
=== OUTPUT FORMAT (copy these labels exactly) ===
FORMAT: ${format}
SLUG: <lowercase-latin-dashes id, 3-50 chars, e.g. karna-kavach-daan>
TITLE: <Hindi question or promise, <= 60 characters, becomes the YouTube title (before " | KATHAAYA"), opens a curiosity gap, no clickbait the film cannot deliver>
THUMB: <the thumbnail question, ${format === "long" ? "3-7" : "2-5"} Hindi words, ends with ?, the OTHER half of the story, must NOT repeat the title, e.g. कवच का सच क्या है?>
THUMB_SUPPORT: <optional 2-4 Hindi words, small ribbon line>
THUMB_STYLE: <optional palette: gold | red | teal | purple | parchment>
THUMB_SCENE: <optional, English, up to 70 words: the exact story moment for the thumbnail painting (who, what the key object is, the emotion, the setting); when present it replaces THUMB_ART>
THUMB_ART: <optional, English: subject | emotion | symbol | backdrop (each <= 8 words), e.g. Karna in golden armour | grief and resolve | glowing armour in his hands | golden eclipse over a river>
SOURCE_LINE: स्रोत: <text, section/chapter numbers, translator>
TRADITION: <one Hindi sentence: this follows <text>; other tellings differ>
HASHTAGS: #kathaaya #<topic tag> #<topic tag>
LOOK: <optional> mood=<${MOODS.join("|")}> grade=<${GRADES.join("|")}> captions=<${CAPTIONS.join("|")}> transition=<${TRANSITIONS.join("|")}> motif=<${MOTIFS.join("|")}> bg=<${BG_NAMES.join("|")}|classic> hue=<-60..360>   (leave out any you do not care about: the system picks a unique look per film)
NARRATION:
${format === "long" ? "## <Chapter title: 3-6 Hindi words that promise the section>   (a long film needs 3+ chapters, one per ~1.5-3 minutes; the first line of each chapter group follows its ## line)\n" : ""}1 | [hook] <spoken Hindi line>
2 | [curious] <line>
3 | <line, intent defaults to narrate>
...
SCENES:   (optional but strongly recommended: your picture prompts beat the local model's)
<beat number> | <subject, <=9 words> | <action, <=9 words> | <setting, <=8 words> | <light, <=6 words>
VISUALS:  (optional per-beat direction)
<beat number> | comp=<cinema|kinetic|quote> fx=<effect> style=<kinetic style> bg=<backdrop> mark=<mark> sticker=<sticker> move=<move> reveal=<reveal> label="<text>" behind="<2-4 words>" text="<kinetic/quote text>"
CLAIMS:   (optional; the QA gate checks them)
- <Hindi claim> | <short English quote from the source> | verified | <source ref like mahabharata-adi:111>

=== NARRATION RULES (checked by code; the pack is rejected if broken) ===
- Warm, plain, spoken Devanagari Hindi. Short sentences. ${format === "short" ? "About 4-14 words per line" : "About 6-18 words per line"}; one idea per line; each line becomes one visual.
- Total length: ${minW}-${maxW} words (the voice speaks 3 words per second: ${minW} words = ${Math.round(minW / WPS)} s, ${maxW} words = ${Math.round(maxW / WPS)} s). ${format === "short" ? "Aim for 190-260 words (65-90 s): Facebook Reels allow 90 s." : "Aim for the length the story needs; chapters of 150-400 words."}
- Line 1 is [hook]: restate the TITLE's question in a way that pulls. The last 2 lines are [reflective]; the very last line invites save/follow (no "comment a word" bait).
- Intents (optional, in [brackets] at the start): ${Object.entries(INTENTS).map(([k, v]) => `${k} = ${v}`).join("; ")}. They drive voice emotion, pacing and the effects chosen.
- Mark ONE punch word per important line with *asterisks* (e.g. उसने *कवच* उतार दिया); the system draws a hand-made mark around it in kinetic scenes.
- Write numbers as words (सात, सौ), never digits. No Latin letters in Hindi lines. No stats the source does not state. No mockery of faith; belief and interpretation are labelled as such.
- Only facts from the source. Never add dialogue the source does not give.

=== SCENES RULES (read by the picture generator) ===
- One scene per beat that deserves its own picture (aim for a new picture every 2-3 beats; the others reuse pictures and use text scenes). Budgets are hard limits (subject<=9, action<=9, setting<=8, light<=6 words).
- English, concrete and visual. Respectful traditional iconography for deities. Describe what IS there; NEVER use "no", "without" or "not" (the painter ignores negations). NEVER ask for text, letters, logos or captions in the picture. One or two figures. Painterly Ravi Varma style is added by the system. For painful or sacred moments use symbolic images (a crown on the grass, a lamp, a river), never gore or nudity.

=== VISUALS RULES (every value is checked against the engine) ===
- comp: cinema (a painting with a camera move), kinetic (big animated words, max 7 words, on an animated backdrop), quote (a typed line). Omit to let the director decide. Use kinetic for punchlines, 3-6 times per minute at most.
- fx (cinematic effect on a painting; ONLY these): ${fx}.
  Good fits by intent:
${fxGuide}
- style (kinetic): ${KINETIC_STYLES.join(", ")} (glitch for shocks, slam for blows, mask/spring/flip for reveals).
- bg (animated backdrop behind kinetic/quote words): ${BG_NAMES.join(", ")}, classic. Vary it: no two neighbouring text scenes share one. ink-clouds = grief/mystery, nebula = cosmic/divine, embers = war/fire, temple-jali = temple/devotion, yantra = sacred/power, water-ripples = river/calm, mountain-mist = journeys/distance, storm = fury/curses, gold-bokeh = boons/wealth/joy, kolam = festival/auspicious.
- mark: ${MARKS.join(", ")} (hand-drawn mark on the starred word). sticker: ${st} (a short Lottie pop near a corner, use rarely). move: ${MOVES.join(", ")}. reveal: ${REVEALS.join(", ")} (use at chapter starts). behind="…" puts a 2-4 word headline BEHIND the subject (hook and big reveals only, at most 3 per film).
- The system already guarantees: no effect three times in a row, at least 5 scene types a minute, subtitles hidden on text scenes, Ken Burns, grain, light leaks, living layers. Do not try to micromanage; direct only the beats that matter (about one in four).

=== THUMBNAIL RULES (a dedicated Flux painting is generated from these, in the palette you choose) ===
- THUMB_STYLE picks the palette: gold = Gold & Obsidian (warriors, gods, sacred weapons, epic moments); red = Red & Charcoal (betrayal, war, tragedy, sacrifice, turning points); teal = Teal & Gold (secrets, curses, hidden truths, mysteries, what-if); purple = Purple & Gold (cosmic events, avatars, divine realms); parchment = Parchment & Ink (explainers, origins, ancient texts, source-based stories). Leave it out and the system chooses from the story's mood, never repeating the last two.
- THUMB_SCENE (optional, <= 70 words, English) describes the exact moment instead; use it when you know the picture you want. The house style (obsidian black, antique gold, ivory, deep crimson, bronze; golden backlight; mature dignified Indian epic characters) is locked by the system; do not describe style, only the story.
- THUMB_ART describes ONE main figure with a strong facial emotion, one symbolic object that carries the story, and a dramatic backdrop that matches the palette. It must match what the narration is about (the thumbnail promises exactly what the film delivers).
- THUMB is a question or tension line that opens a gap the film answers; it shows as 2-3 lines on brush strokes with a red "?".

=== SELF-CHECK BEFORE ANSWERING ===
Word count in range; every beat line has a number; SCENES numbers exist; every fx/style/bg/mark value is spelled exactly as allowed; TITLE and THUMB do not repeat each other; no digits, no Latin letters in narration.`;
}
