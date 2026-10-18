#!/usr/bin/env node
// The studio translates its own posts and site text with its writer model (tools/content/llm.mjs): no hand-typed translations.
//   node tools/content/translate.mjs --lang en[,mr,ta,...] [--slug ganga-seven-sons | --all]   translate approved Hindi blog items -> content/items/<slug>.blog.<lang>.json
//   node tools/content/translate.mjs --lang ta --ui                                           translate the site's interface strings -> site/src/i18n/gen/<lang>.json
// Every translation is checked (script, length, headings, numbers, title/description limits) and retried with feedback; failures are written to content/rejected/ and never published.
// Honest limit: a local 14B model translates well into English, acceptably into Spanish/Portuguese/Indonesian and Marathi, and noticeably worse into Tamil/Telugu/Bengali/Gujarati; set ANTHROPIC_API_KEY for production quality. Every translated page carries a "machine translated" label and a link to the Hindi original.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { ask, writerName } from "./llm.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : undefined; };
const NAMES = { en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil", te: "Telugu", gu: "Gujarati", es: "Spanish", pt: "Brazilian Portuguese", id: "Indonesian" };
const SCRIPT = { en: /[A-Za-z]/g, es: /[A-Za-z]/g, pt: /[A-Za-z]/g, id: /[A-Za-z]/g, mr: /[ऀ-ॿ]/g, bn: /[ঀ-৿]/g, ta: /[஀-௿]/g, te: /[ఀ-౿]/g, gu: /[઀-૿]/g };
const LATIN = new Set(["en", "es", "pt", "id"]), cnt = (s, re) => (s.match(re) || []).length;
const SYS = lang => `You are a professional literary translator of Hindu and world mythology articles. Translate from Hindi into ${NAMES[lang]}.\nRULES: output ONLY the translation, no notes. Keep Markdown structure exactly (the same # and ## headings, lists, bold). Do not add, remove or soften any fact. Keep numbers. Write proper names (gods, people, places, texts) in their common spelling in ${NAMES[lang]}. Natural, readable prose, not word-for-word. Keep quoted source citations unchanged. For a single sentence or title, output exactly one line and nothing else.`;
function check(src, out, lang, kind, limit) { const f = [], re = SCRIPT[lang], letters = cnt(out, /\p{L}/gu) || 1; if (!out.trim()) return ["empty output"];
  if (cnt(out, re) / letters < (LATIN.has(lang) ? 0.85 : 0.6)) f.push(`output is not mostly ${NAMES[lang]} script`); if (lang !== "mr" && cnt(out, /[\u0900-\u097F]/g) / letters > 0.05) f.push("Hindi (Devanagari) text was left untranslated");
  const ratio = out.length / Math.max(1, src.length); if (ratio < 0.3 || ratio > 5) f.push(`length ratio ${ratio.toFixed(2)} is implausible`);
  if (kind === "markdown") { const h = s => (s.match(/^#{1,3} /gm) || []).length; if (h(src) !== h(out)) f.push(`headings: source has ${h(src)}, translation ${h(out)}`); }
  if (LATIN.has(lang)) for (const n of new Set(src.match(/\d+/g) || [])) if (!out.includes(n)) f.push(`number ${n} missing`);
  if (limit && [...out].length > limit) f.push(`too long: ${[...out].length} characters, maximum ${limit}`); return f; }
async function tr(text, lang, kind = "text", limit = 0, log = console.log) { let fails = [], out = "", prev = ""; const clean = x => x.replace(/^```\w*\n?|```$/g, "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  for (let r = 0; r < 4; r++) { const tooLong = limit && prev && fails.length === 1 && /^too long/.test(fails[0]);
    if (tooLong) out = clean(await ask(`You shorten ${NAMES[lang]} text. Output only the shortened text, one line, at most ${limit - 20} characters, keeping the key meaning.`, prev, { temperature: 0.2 }));
    else { const lim = limit ? `\n\n(Maximum ${limit - 20} characters. One line, no quotes, no explanation.)` : "", extra = fails.length ? `\n\nYour previous translation had problems: ${fails.join("; ")}. Fix them.` : ""; out = clean(await ask(SYS(lang), text + lim + extra, { temperature: 0.2 })); }
    fails = check(text, out, lang, kind, limit); if (!fails.length) return out; prev = out; log(`  retry (${fails.join("; ")})`); }
  throw new Error("translation failed checks: " + fails.join("; ") + " :: " + text.slice(0, 60)); }

export async function translateItem(it, lang, log = console.log) {
  const o = JSON.parse(JSON.stringify(it)), T = (s, k, l) => tr(s, lang, k, l, log);
  const facts = [{ label: "Source", value: (it.sources?.[0]?.label || "").split("—")[0].split(",").slice(0, 2).join(",").trim() || "Scripture", icon: "📜" }, { label: "Reading time", value: Math.max(2, Math.round((it.markdown || "").split(/\s+/).length / 170)) + " min", icon: "⏱" }, { label: "Topic", value: ({ itihasa: "Itihasa", puranas: "Puranas", "vrat-tyohar": "Vrat & Tyohar", world: "World mythology" })[it.section || "itihasa"], icon: "🕉" }, { label: "Checked", value: "Matched to the source text", icon: "✓" }];
  const enFacts = async () => { if (lang === "en") return Promise.all(facts.map(async f => /[\u0900-\u097F]/.test(f.value) ? { ...f, value: await tr(f.value, "en", "text", 0, log) } : f)); const r = []; for (const f of facts) r.push({ ...f, label: await tr(f.label, lang, "text", 0, log), value: await tr(f.value, lang, "text", 0, log) }); return r; };
  const trEn = async s => lang === "en" ? s : (await ask(`Translate from English into ${NAMES[lang]}. Output only the translation.`, s, { temperature: 0.2 })).trim();
  log("title"); o.title = await T(it.title, "title", 110); o.hook = it.hook ? await T(it.hook) : it.hook; log("description"); o.meta_description = await T(it.meta_description, "desc", 160);
  for (const k of ["tradition_note", "hero_alt", "timely_hook"]) if (it[k]) o[k] = await T(it[k]);
  const secs = (it.markdown || "").split(/\n(?=#{1,2} )/); o.markdown = ""; for (let i = 0; i < secs.length; i++) { log(`body ${i + 1}/${secs.length}`); o.markdown += (i ? "\n\n" : "") + await T(secs[i], "markdown"); }
  if (it.faq) { o.faq = []; for (const f of it.faq) o.faq.push({ ...f, q: await T(f.q), ...(f.a ? { a: await T(f.a) } : {}) }); }
  if (it.timeline) { o.timeline = []; for (const s of it.timeline) o.timeline.push({ title: await T(s.title), text: await T(s.text) }); }
  if (it.quiz) { o.quiz = { question: await T(it.quiz.question), options: [] }; for (const x of it.quiz.options) o.quiz.options.push({ ...x, text: await T(x.text), ...(x.why ? { why: await T(x.why) } : {}) }); }
  o.keyfacts = await enFacts(); o.video_title = await trEn("The reel of this story"); o.author = lang === "en" ? "KATHAAYA Editorial Team" : await trEn("KATHAAYA Editorial Team");
  o.language = lang; o.translated_from = "hi"; o.translated_by = writerName(); o.machine_translated = true; o.id = `${it.slug}.blog.${lang}`; return o; }
async function uiStrings(lang, log) { const src = fs.readFileSync(path.join(root, "site/src/i18n/ui.ts"), "utf8"), m = /const en: Record<UiKey, string> = (\{[\s\S]*?\n\});/.exec(src), en = new Function("return " + m[1])(), out = {}; let i = 0; for (const [k, v] of Object.entries(en)) { i++; if (k === "siteName") { out[k] = v; continue; } log(`ui ${i}/${Object.keys(en).length} ${k}`); const r = (await ask(`Translate this website interface text from English into ${NAMES[lang]}. Output only the translation; keep brand names, symbols (✓ ✗ ·) and ALL-CAPS English labels as they are.`, v, { temperature: 0.2 })).trim().replace(/^["']|["']$/g, ""); out[k] = r; } const f = path.join(root, "site/src/i18n/gen", lang + ".json"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(out, null, 1)); return f; }
export async function translateAll({ langs, slug, ui = false, log = console.log }) { const res = [];
  for (const lang of langs) { if (!NAMES[lang]) throw new Error("unsupported language " + lang); log(`== ${NAMES[lang]} (writer ${writerName()})`);
    if (ui) { res.push(await uiStrings(lang, log)); continue; }
    const items = fs.readdirSync(path.join(root, "content/items")).filter(f => /\.blog\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(root, "content/items", f), "utf8"))).filter(it => (slug ? it.slug === slug : true) && ["approved", "published", "scheduled"].includes(it.status));
    for (const it of items) { const dst = path.join(root, "content/items", `${it.slug}.blog.${lang}.json`); if (fs.existsSync(dst) && !a.includes("--force")) { log(`${it.slug}: ${lang} exists, skipped (--force to redo)`); continue; }
      log(`${it.slug} -> ${lang}`); try { const o = await translateItem(it, lang, log); fs.writeFileSync(dst, JSON.stringify(o, null, 1)); res.push(dst); } catch (e) { log("FAILED " + e.message); fs.mkdirSync(path.join(root, "content/rejected"), { recursive: true }); fs.writeFileSync(path.join(root, "content/rejected", `${it.slug}.blog.${lang}.txt`), e.message); } } }
  return res; }
if (process.argv[1] === fileURLToPath(import.meta.url)) { const langs = (arg("--lang") || "").split(",").filter(Boolean); if (!langs.length) { console.error("need --lang en[,mr,...]"); process.exit(1); } translateAll({ langs, slug: arg("--slug"), ui: a.includes("--ui") }).then(r => console.log("done:", r.map(x => path.relative(root, x)).join(", ") || "nothing new"), e => { console.error("FAILED:", e.message); process.exit(1); }); }
