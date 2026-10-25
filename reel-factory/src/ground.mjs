// Grounded on-screen text: when the model's wording for a beat is not from that beat's narration (or is a fragment), the system builds it from the narration itself,
// by clauses and whole words, shaped for the component. Deterministic: same narration, same text.
import { toks, wordOk } from "./director.mjs";
const STOP = new Set("जाता जाती जाते कहा किया गया गई गए रहा रही रहे होती होते करना सकता सकती चाहिए आप यह ये इस उस के में से है हैं और पर कि को का की ही भी तो जब फिर लेकिन इसलिए क्योंकि जबकि कैसे क्या एक वह वो हम था थी थे हो होता होती करता करते कर सकते रहा रहे वाले वाली बहुत सब कुछ तब यानी जैसे".split(" "));
const LEAD = new Set(["और", "लेकिन", "जबकि", "क्योंकि", "इसलिए", "फिर", "यानी", "तो", "भी"]);
const words = t => t.trim().split(/\s+/).filter(Boolean), len = t => [...t].length, clean = t => { let w = words(t.replace(/[।,;:…—?？!"“”]+$/g, "")); while (w.length > 2 && LEAD.has(w[0])) w.shift(); return w.join(" "); };
export const clauses = nar => nar.replace(/\s+(और|लेकिन|जबकि|क्योंकि|इसलिए|फिर भी|यानी)\s+/g, ",$1 ").split(/[,।;:…—]+/).map(s => s.trim()).filter(s => words(s).length >= 2);
/** wrap on word boundaries into at most `maxLines` lines of at most `maxLen` characters; returns null if it does not fit */
export function wrapLines(text, maxLen, maxLines) { const out = []; let cur = ""; for (const w of words(text)) { const nx = cur ? cur + " " + w : w; if (len(nx) <= maxLen) cur = nx; else { if (cur) out.push(cur); cur = w; } } if (cur) out.push(cur); return out.length <= maxLines && out.every(l => len(l) <= maxLen) ? out : null; }
const headWords = (t, max) => { const w = words(t), o = []; for (const x of w) { if (len([...o, x].join(" ")) > max) break; o.push(x); } return o.join(" "); };
const tailWords = (t, max) => { const w = words(t), o = []; for (let i = w.length - 1; i >= 0; i--) { if (len([w[i], ...o].join(" ")) > max) break; o.unshift(w[i]); } return o.join(" "); };
const salient = (nar, emph, max = 34) => { const cl = clauses(nar).map(clean).filter(c => words(c).length >= 2); if (!cl.length) return clean(nar); const fit = cl.filter(c => len(c) <= max), pool = fit.length ? fit : cl, withE = emph ? pool.find(c => c.includes(emph.split(/\s+/)[0])) : null; return withE || pool.slice().sort((a, b) => Math.abs(len(a) - 24) - Math.abs(len(b) - 24))[0]; };
const longClause = (nar, emph) => { const cl = clauses(nar).map(clean).filter(c => words(c).length >= 2 && len(c) <= 80), withE = emph ? cl.find(c => c.includes(emph.split(/\s+/)[0])) : null; return cl.slice().sort((a, b) => len(b) - len(a))[0] || clean(nar); };
const keyWords = nar => [...new Set(words(nar.replace(/[।,?!:;…"“”()]/g, " ")).filter(w => len(w) >= 4 && len(w) <= 12 && !STOP.has(w)))];
export function derive(component, nar, emph = "", last = false) {
  const cl = clauses(nar), sal = salient(nar, emph), final = last ? finalLines(nar) : null;
  switch (component) {
    case "Specimen": { if (final) return { on_screen: final.slice(0, 2) }; const rest = cl.map(clean).filter(c => c !== sal); return { on_screen: [sal, rest.find(c => len(c) <= 44) || ""].filter(Boolean) }; }
    case "Stamp": { const k = keyWords(nar).filter(w => len(w) <= 14).sort((a, b) => len(b) - len(a))[0] || tailWords(sal, 14), head = wrapLines(longClause(nar, emph), 30, 2) || [sal]; return { on_screen: [...head, k].filter((x, i, a) => x && a.indexOf(x) === i).slice(-3) }; }
    case "Checklist": { const items = cl.map(clean).map(c => headWords(c, 26)).filter(Boolean).slice(0, 3); return items.length >= 2 ? { on_screen: items.map(i => "+ " + i) } : { component: "HeadlineStrips", on_screen: wrapLines(sal, 24, 3) || [headWords(sal, 24)] }; }
    case "Typewriter": { if (final) return { on_screen: [final.join(" ").length <= 46 ? final.join(" ") : final.at(-1)] }; const one = clean(nar); return { on_screen: [len(one) <= 44 ? one : sal] }; }
    case "StringBoard": { const k = keyWords(nar).slice(0, 3); return { on_screen: k.map(w => headWords(w, 14)) }; }
    case "ChoiceTree": return { on_screen: [sal.length <= 28 ? sal + "?" : headWords(sal, 26) + "?"] };
    case "Counter": return { component: "HeadlineStrips", on_screen: wrapLines(sal, 24, 3) || [headWords(sal, 24)] };
    default: { if (final) return { on_screen: final }; return { on_screen: wrapLines(sal, 24, 3) || [headWords(sal, 24)] }; }   // HeadlineStrips, Cutout, QuoteCard, Timeline fallback
  }
}
/** the closing line shown whole (the final clause or question), at most 2 lines of 28 characters */
export function finalLines(nar) { const t = clean(nar), tail = clauses(nar).map(clean).at(-1) || t, q = /[?？]\s*$/.test(nar.trim()) ? "?" : ""; const c = [tail + q, t + q].find(x => wrapLines(x, 28, 2)); return wrapLines(c || tail + q, 28, 2) || [headWords(tail, 26) + q]; }
const fragmentary = (b, nar) => { const items = (b.on_screen || []).filter(Boolean), text = items.join(" "), nt = toks(nar); if (!items.length) return b.component !== "Parallax" && !(b.assets || []).length; if (toks(text.replace(/\d+/g, " ")).some(w => w.length <= 2 && !nt.includes(w))) return true; if (b.component === "Typewriter" && len(text) < 12) return true; if (b.component === "Checklist" && items.length < 2) return true; if (b.component === "Counter" && !/\d/.test(text)) return true; const bad = toks(text.replace(/[|!+\-~]/g, " ").replace(/\d+/g, " ")).filter(w => !wordOk(w, nt)); return bad.length > 1 || (words(text).length === 1 && !["Specimen", "Stamp", "StringBoard", "Timeline"].includes(b.component)); };
/** re-ground the beats whose wording is not usable; returns the beat numbers changed */
export function regroundPlan(plan, beats) { const changed = []; plan.beats.forEach((b, i) => { const nar = beats[i]?.text; if (!nar || b.component === "Timeline" || b.component === "Parallax") return; const lastBeat = i === plan.beats.length - 1, closingBad = lastBeat && !(b.on_screen || []).length; if (fragmentary(b, nar) || closingBad || (lastBeat && !/[?？]\s*$/.test((b.on_screen || []).at(-1) || "") && /[?？]\s*$/.test(nar.trim()))) { const d = derive(b.component, nar, b.emphasis_word, lastBeat); if (d.component) b.component = d.component; b.on_screen = d.on_screen; changed.push(i + 1); } }); return changed; }
export { clean, salient, keyWords, words, len };
