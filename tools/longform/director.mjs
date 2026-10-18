#!/usr/bin/env node
// Long-form DIRECTOR: reads a story's beats (narration lines with intent and chapter) and writes plan.json, one visual per beat, chosen from the component catalog in engine/longform/core.js.
// The writer model (tools/content/llm.mjs) proposes the plan; a deterministic validator enforces pacing rules and replaces anything invalid with a rule-based pick, so the film is never blocked by a bad model answer.
// PACING RULES are well-known retention heuristics (visual change every few seconds, pattern interrupts, a variety of formats, an early hook, re-hooks, a strong ending / the peak-end rule). They are heuristics from creator practice, NOT measured results for this channel: the Hub's insights should confirm them.
// usage: node tools/longform/director.mjs stories/<name> [--no-llm]    -> stories/<name>/plan.json, plan.report.json
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { ask, writerName } from "../content/llm.mjs";
export const CATALOG = {
  cinema: "a full-screen painting with a slow camera move. params: {img: <scene key>, move: push|pull|panL|panR, label?: short caption}. Use for story moments (people, places, action).",
  kinetic: "big animated words on the beat. params: {lines: [short strings], style: slam|wave|stack}. Mark ONE accent word with *asterisks*. Use for punchlines, shocks, a hook, rhetorical questions. Max 7 words total.",
  stat: "a counter with a progress ring. params: {value: number, suffix?: string, label: string, ring?: 0..1}. Use only when the narration states a number (100 years, 7 sons).",
  bars: "animated horizontal bars comparing quantities. params: {title, unit?, items: [{label, value}]} (2-5 items). Use only for real stated quantities.",
  timeline: "a line that draws with nodes. params: {steps: [{title, text?}]} (3-5 steps). Use when the narration lists a sequence of events.",
  graph: "relationship graph (who is whose). params: {nodes: [{id,label,x,y}], edges: [[idA,idB,label?]], focus: [ids in order]} with x,y in 0.1..0.9. Use for family or alliance explanations (3-6 nodes).",
  versus: "two panels compared. params: {left:{title,points[]}, right:{title,points[]}} (2-4 points each, short). Use for 'text says X, tradition says Y' or two sides.",
  quote: "a spoken line or scripture quote typed out. params: {text, by?}. Use for a famous or key line.",
  chapter: "a title card for a new chapter. params: {kicker, title}. Use at the start of a chapter, only when the beat is short.",
  orb: "a 3D Three.js layer. params: {kind: yantra|galaxy, label?: short}. Use for cosmic or divine moments (creation, the gods' combined light, a boon), at most once every 40 seconds.",
  mandala: "a quiet generative mandala breath. params: {} . Use rarely, for a silent pause beat.",
};
const TEXTY = new Set(["kinetic", "quote", "chapter", "mandala"]), MIN_TYPES_PER_60S = 5, MAX_SAME_RUN = 1;
const J = f => JSON.parse(fs.readFileSync(f, "utf8"));
const digits = s => s.replace(/[०-९]/g, d => "०१२३४५६७८९".indexOf(d));
const NUMW = { "सौ": 100, "हज़ार": 1000, "हजार": 1000, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "पाँच": 5, "पांच": 5, "तीन": 3, "चार": 4, "बारह": 12, "सौ साल": 100 };
function numberIn(text) { const m = digits(text).match(/\d+/); if (m) return +m[0]; for (const [w, v] of Object.entries(NUMW)) if (new RegExp(`(^|\\s)${w}(\\s|$|[,।])`).test(text)) return v; return null; }
export function ruleBased(beats, segs) { // deterministic fallback: never fails, decent variety
  let scene = 0, run = 0; const plan = []; let lastChapter = null;
  beats.forEach((b, i) => { const dur = (segs[b.id]?.end_seconds ?? 0) - (segs[b.id]?.start_seconds ?? 0), words = b.text.split(/\s+/).length, prev = plan[i - 1]?.comp, num = numberIn(b.text); let comp, params;
    if (b.chapter !== lastChapter && dur < 4.5 && i > 0) { comp = "chapter"; params = { kicker: b.chapter, title: b.text.slice(0, 40) }; }
    else if (i === 0 || b.intent === "hook") { comp = "kinetic"; params = { lines: [b.text.split(/[,।?]/)[0].trim()], style: "slam" }; }
    else if (words <= 5 && prev !== "kinetic") { comp = "kinetic"; params = { lines: [b.text.replace(/[।?!]/g, "").trim()], style: i % 2 ? "slam" : "wave" }; }
    else if (num && prev !== "stat" && words > 6) { comp = "stat"; params = { value: num, label: b.text.split(/[,।]/)[0].slice(0, 40) }; }
    else { comp = "cinema"; run = run + 1; params = { img: "scene" + scene, move: ["push", "pull", "panL", "panR"][i % 4] }; if (run >= 2) { scene++; run = 0; } }
    lastChapter = b.chapter; plan.push({ id: b.id, chapter: b.chapter, comp, params }); });
  return plan; }
export function validate(plan, segs) { // returns {plan (fixed), report}
  const rep = { fixed: [], warnings: [], stats: {} }, out = plan.map(p => ({ ...p }));
  out.forEach((p, i) => { if (!CATALOG[p.comp]) { rep.fixed.push(`${p.id}: unknown component ${p.comp} -> kinetic`); p.comp = "kinetic"; p.params = { lines: [segs[p.id]?.text?.slice(0, 40) || ""] }; }
    const q = p.params || (p.params = {}); const bad = (msg) => { rep.fixed.push(`${p.id}: ${msg} -> cinema`); p.comp = "cinema"; p.params = { img: "scene0", move: "push" }; };
    if (p.comp === "kinetic") { if (!Array.isArray(q.lines) || !q.lines.length || q.lines.some(x => typeof x !== "string")) bad("kinetic lines invalid"); else { const w = q.lines.join(" ").split(/\s+/); if (w.length > 7) { q.lines = [w.slice(0, 7).join(" ")]; rep.fixed.push(`${p.id}: kinetic trimmed to 7 words`); } } }
    if (p.comp === "stat" && !(typeof q.value === "number" && q.label)) bad("stat needs value and label");
    if (p.comp === "bars" && !(Array.isArray(q.items) && q.items.length >= 2 && q.items.every(x => typeof x.value === "number"))) bad("bars need 2+ numeric items");
    if (p.comp === "timeline" && !(Array.isArray(q.steps) && q.steps.length >= 2)) bad("timeline needs 2+ steps");
    if (p.comp === "graph" && !(Array.isArray(q.nodes) && q.nodes.length >= 2 && Array.isArray(q.edges) && q.nodes.every(n => n.id && n.label && n.x > 0 && n.x < 1 && n.y > 0 && n.y < 1))) bad("graph nodes/edges invalid");
    if (p.comp === "versus" && !(q.left?.points?.length && q.right?.points?.length)) bad("versus needs both sides");
    if (p.comp === "quote" && !q.text) bad("quote needs text"); });
  // no immediate repeats of the same non-cinema component; no run of more than 2 text-only beats
  for (let i = 1; i < out.length; i++) { if (out[i].comp === out[i - 1].comp && out[i].comp !== "cinema") { rep.fixed.push(`${out[i].id}: repeated ${out[i].comp} -> cinema`); out[i].comp = "cinema"; out[i].params = { img: out[i - 1].params?.img || "scene0", move: "pull" }; }
    if (i >= 2 && TEXTY.has(out[i].comp) && TEXTY.has(out[i - 1].comp) && TEXTY.has(out[i - 2].comp)) { rep.fixed.push(`${out[i].id}: 3 text-only beats in a row -> cinema`); out[i].comp = "cinema"; out[i].params = { img: out[i - 1].params?.img || "scene0", move: "push" }; } }
  // scene keys: a new key whenever the model changed it, a text beat intervened, or one painting would be used for more than 3 beats in a row
  let key = -1, run = 0, last = null; out.forEach(p => { if (p.comp !== "cinema") return; const orig = p.params?.img; if (orig !== last || run >= 3) { key++; run = 0; } last = orig; run++; p.params.img = "scene" + key; if (!p.params.move) p.params.move = ["push", "pull", "panL", "panR"][key % 4]; }); rep.stats.scenes = key + 1;
  // variety per 60 s window
  const T = out.map(p => segs[p.id]?.start_seconds ?? 0); let bad60 = 0; for (let i = 0; i < out.length; i++) { const w = out.filter((_, j) => T[j] >= T[i] && T[j] < T[i] + 60); if (w.length >= 8 && new Set(w.map(x => x.comp)).size < MIN_TYPES_PER_60S) bad60++; }
  rep.stats.comps = out.reduce((a, p) => (a[p.comp] = (a[p.comp] || 0) + 1, a), {}); rep.stats.beats = out.length; rep.stats.windows_low_variety = bad60;
  const dur = i => (segs[out[i].id]?.end_seconds ?? 0) - (segs[out[i].id]?.start_seconds ?? 0); const long = out.map((p, i) => [p.id, dur(i)]).filter(x => x[1] > 9); if (long.length) rep.warnings.push(`beats longer than 9 s keep one visual (split the narration line): ${long.map(x => x[0] + "=" + x[1].toFixed(0) + "s").join(", ")}`);
  if (out[0] && !["cinema", "kinetic"].includes(out[0].comp)) rep.warnings.push("the film should open on a picture or a hook line");
  const total = T[T.length - 1] || 1; for (const f of [0.25, 0.5, 0.75]) { const i = T.findIndex(t => t >= total * f), near = out.slice(Math.max(0, i - 2), i + 3).map(p => segs[p.id]?.text || "").join(" "); if (!/[?]|क्यों|कैसे|लेकिन|पर |तभी|मगर/.test(near)) rep.warnings.push(`no re-hook (question or turn) near ${f * 100}% of the film`); }
  if (bad60) rep.warnings.push(`${bad60} one-minute windows have fewer than ${MIN_TYPES_PER_60S} visual types`);
  return { plan: out, report: rep }; }
async function llmPlan(beats, segs, log) { const sys = `You are the visual director of a Hindi mythology documentary channel. For each narration beat choose ONE visual component from the catalog and fill its params from the beat's own words only (never invent facts, numbers or names). Return ONLY a JSON object {"beats":[{"id":"d001","comp":"...","params":{...}}]} with one entry per beat, same order and ids.\n\nCATALOG:\n${Object.entries(CATALOG).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n\nRULES: vary components (aim for 5+ different types per minute); never the same non-cinema component twice in a row; at most 2 text-only beats (kinetic, quote, chapter, mandala) in a row; open on a cinema or kinetic hook; for cinema beats use img keys "scene0","scene1",... where consecutive beats of the same story moment share a key (max 3 beats per key) and every new moment gets the next key; all text in Devanagari Hindi, short.`; const plan = [];
  for (let i = 0; i < beats.length; i += 10) { const chunk = beats.slice(i, i + 10), prompt = `Beats (id | chapter | intent | seconds | text):\n${chunk.map(b => `${b.id} | ${b.chapter} | ${b.intent} | ${((segs[b.id]?.end_seconds ?? 0) - (segs[b.id]?.start_seconds ?? 0)).toFixed(1)} | ${b.text}`).join("\n")}\n\nPrevious beat component: ${plan.at(-1)?.comp || "none"}. Return the JSON object now.`;
    log(`director: beats ${i + 1}-${i + chunk.length} of ${beats.length}`); let got = null; for (let r = 0; r < 2 && !got; r++) { try { const raw = await ask(sys, prompt, { temperature: 0.4, json: true }), o = JSON.parse(raw.match(/[\[{][\s\S]*[\]}]/)[0]), arr = Array.isArray(o) ? o : o.beats; if (Array.isArray(arr) && arr.length === chunk.length && arr.every((x, k) => x.id === chunk[k].id)) got = arr; else log("  director answer did not match the beats, retrying"); } catch (e) { log("  director answer unreadable: " + e.message.slice(0, 80)); } }
    chunk.forEach((b, k) => plan.push(got ? { ...got[k], chapter: b.chapter } : null)); }
  return plan; }
export async function direct(dir, { llm = true, log = console.log } = {}) {
  const beats = J(path.join(dir, "beats.json")), segsArr = J(path.join(dir, "narration/voice/segments.json")).segments, segs = Object.fromEntries(segsArr.map(s => [s.beat_id, s]));
  const fallback = ruleBased(beats, segs); let proposed = llm ? await llmPlan(beats, segs, log).catch(e => { log("director model failed: " + e.message); return []; }) : [];
  const merged = beats.map((b, i) => proposed[i] || { ...fallback[i], from: "rules" }), { plan, report } = validate(merged, segs); report.writer = llm ? writerName() : "rules"; report.from_rules = merged.filter(x => x.from === "rules").length;
  fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(plan, null, 1)); fs.writeFileSync(path.join(dir, "plan.report.json"), JSON.stringify(report, null, 1)); return { plan, report }; }
if (process.argv[1] === fileURLToPath(import.meta.url)) { const dir = path.resolve(process.argv[2] || ""); direct(dir, { llm: !process.argv.includes("--no-llm") }).then(({ report }) => console.log(JSON.stringify(report, null, 1)), e => { console.error("FAILED:", e.message); process.exit(1); }); }
