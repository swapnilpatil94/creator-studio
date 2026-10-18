#!/usr/bin/env node
// Builds the research corpus used to verify every story/blog/post claim (RAG without hallucination): public-domain English translations from Wikisource via the MediaWiki API.
//   node tools/content/corpus.mjs fetch mahabharata-adi 1 236     # K. M. Ganguli, Mahabharata Book 1 sections 1..236 (public domain)
//   node tools/content/corpus.mjs build                          # (re)build research/index.json (BM25) from research/corpus/*.json
//   node tools/content/corpus.mjs search "ganga shantanu vasus" [k]   # top passages with citation labels
// Polite: 1 request/second, cached on disk. research/corpus and research/index.json are not committed (CI rebuilds them, cached).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), dir = path.join(root, "research/corpus"), idxFile = path.join(root, "research/index.json");
const roman = n => { let r = ""; for (const [v, c] of [[100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { r += c; n -= v; } return r; };
const SOURCES = {
  "mahabharata-sabha": { title: n => `The_Mahabharata/Book_2:_Sabha_Parva/Section_${roman(n)}`, label: n => `Mahabharata, Sabha Parva, Section ${n} (Ganguli tr.)` },
  "mahabharata-adi": { title: n => `The_Mahabharata/Book_1:_Adi_Parva/Section_${n}`, label: n => `Mahabharata, Adi Parva, Section ${n} (Ganguli tr.)`, strip: /^[\s\S]*?Section [LXVI]+\s*\.?\s*(\([^)]*\))?/ },
};
// prefix sources: every subpage under a Wikisource title prefix (Griffith's Ramayana, one canto per page)
const PREFIX = { "ramayana-aranya": { prefix: "The_Ramayana/Book_III/", book: "Ramayana (Griffith tr.), Book III Aranya" }, "ramayana-sundara": { prefix: "The_Ramayana/Book_V/", book: "Ramayana (Griffith tr.), Book V Sundara" } };
async function fetchPrefix(src) { const P0 = PREFIX[src], titles = []; let cont = ""; do { const j = await (await fetch(`https://en.wikisource.org/w/api.php?action=query&list=allpages&apprefix=${encodeURIComponent(P0.prefix)}&aplimit=500&format=json${cont}`, { headers: { "User-Agent": "KathaayaStudio/1.0 (swapnilp576p@gmail.com)" } })).json(); titles.push(...j.query.allpages.map(x => x.title)); cont = j.continue ? "&apcontinue=" + encodeURIComponent(j.continue.apcontinue) : ""; } while (cont);
  let ok = 0; for (const t of titles) { const m = /Canto ([IVXLC]+)/.exec(t); if (!m) continue; const f = path.join(dir, `${src}-${m[1]}.json`); if (fs.existsSync(f)) { ok++; continue; } const r = await (await fetch(`https://en.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(t)}&prop=text&format=json&formatversion=2&redirects=1`, { headers: { "User-Agent": "KathaayaStudio/1.0 (swapnilp576p@gmail.com)" } })).json(); if (!r.parse) continue; let text = clean(r.parse.text); const i = text.search(/Canto [IVXLC]+\./); if (i > -1) text = text.slice(i); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, JSON.stringify({ src, n: m[1], label: `${P0.book}, ${t.split("/").pop()}`, source: "wikisource.org " + t, text })); ok++; await sleep(1000); } return ok; }
const sleep = ms => new Promise(r => setTimeout(r, ms)), clean = t => t.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<sup[\s\S]*?<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#160;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
async function fetchSection(src, n) {
  const f = path.join(dir, `${src}-${n}.json`); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const S = SOURCES[src], url = `https://en.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(S.title(n))}&prop=text&format=json&formatversion=2&redirects=1`;
  for (let t = 0; t < 4; t++) { const r = await fetch(url, { headers: { "User-Agent": "KathaayaStudio/1.0 (swapnilp576p@gmail.com) research corpus" } }); if (r.ok) { const j = await r.json(); if (j.parse) { let text = clean(j.parse.text); const m = text.search(/Section [LXVI]+\s*\.?\s*(\([^)]*\))?\s/); if (m > -1) text = text.slice(m).replace(/^Section [LXVI]+\s*\.?\s*(\([^)]*\))?\s*/, ""); const o = { src, n, label: S.label(n), source: "wikisource.org " + S.title(n), text }; fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, JSON.stringify(o)); return o; } return null; } await sleep(3000 * (t + 1)); }
  return null;
}
const tok = s => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9ऀ-ॿ ]+/g, " ").split(/\s+/).filter(w => w.length > 2);
const decode = t => t.replace(/&#(\d+);/g, (m, c) => +c === 8203 ? "" : String.fromCharCode(+c)).replace(/\u200b/g, "").replace(/^[\s\S]{0,700}?Section [IVXLC]+\s*\.\s*(\([^)]*\)\s*)?/, m => /Calcutta|translated by|←/.test(m) ? "" : m).replace(/\s+/g, " ").trim();
function chunk(doc, size = 120) { const w = decode(doc.text).split(/\s+/), out = []; for (let i = 0; i < w.length; i += size) out.push({ label: doc.label, src: doc.src, n: doc.n, at: i, text: w.slice(i, i + size + 20).join(" ") }); return out; }
export function build() { const chunks = []; for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) chunks.push(...chunk(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))); const df = {}, docs = chunks.map(c => { const t = tok(c.text), tf = {}; t.forEach(w => tf[w] = (tf[w] || 0) + 1); Object.keys(tf).forEach(w => df[w] = (df[w] || 0) + 1); return { tf, len: t.length }; }); const avg = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length); fs.writeFileSync(idxFile, JSON.stringify({ chunks, docs, df, avg, N: docs.length })); return { chunks: chunks.length }; }
export function search(q, k = 5) { if (!fs.existsSync(idxFile)) return []; const I = JSON.parse(fs.readFileSync(idxFile, "utf8")), qs = tok(q), k1 = 1.4, b = 0.75; return I.docs.map((d, i) => { let s = 0; for (const w of qs) { const f = d.tf[w] || 0; if (!f) continue; const idf = Math.log(1 + (I.N - (I.df[w] || 0) + 0.5) / ((I.df[w] || 0) + 0.5)); s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * d.len / I.avg)); } return { score: s, ...I.chunks[i] }; }).filter(x => x.score > 0).sort((a, b2) => b2.score - a.score).slice(0, k); }
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === "fetch-all") { for (const [src, from, to] of [["mahabharata-adi", 1, 236], ["mahabharata-sabha", 1, 81]]) { let ok = 0; for (let n = from; n <= to; n++) { if (await fetchSection(src, n)) ok++; if (!fs.existsSync(path.join(dir, `${src}-${n}.json`))) await sleep(0); else if (n % 40 === 0) console.log(src, "through", n); await sleep(250); } console.log(src, ok, "sections"); } console.log(build()); }
  else if (cmd === "fetch-prefix") { console.log("fetched", await fetchPrefix(a), "cantos"); console.log(build()); }
  else if (cmd === "fetch") { let ok = 0; for (let n = +b; n <= +c; n++) { const d = await fetchSection(a, n); if (d) ok++; if (n % 20 === 0) console.log(`fetched through ${n} (${ok} ok)`); await sleep(1000); } console.log(`done: ${ok} sections`); console.log(build()); }
  else if (cmd === "build") console.log(build());
  else if (cmd === "search") for (const r of search(a, +b || 5)) console.log(`[${r.score.toFixed(1)}] ${r.label}\n   ${r.text.slice(0, 260)}…`);
  else console.log("usage: fetch <source> <from> <to> | build | search <query> [k]");
}
