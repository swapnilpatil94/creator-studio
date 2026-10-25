// The smart picker. After the Director and the re-ground step it looks at what each beat SAYS and swaps in a scene that fits that content, so two videos do not repeat the same scenes in the same order:
//   a share of people            -> DotCrowd (100 figures, n lit; n comes from the narration's own number)
//   something hidden / quiet     -> RedactReveal (key words blacked out, then revealed)
//   "but" / "yet" turn           -> Contrast (belief above, fact below)
//   "changed / swapped" + 2 faces already shown -> SwapDemo (the two pictures trade places)
// It also removes placeholder text ("कारण 1", "विकल्प एक") and never repeats a scene back to back or more than twice (Specimen three times). Everything on screen is built from the beat's own narration.
import { numbersIn } from "./hindi-numbers.mjs"; import { clauses, clean, keyWords, wrapLines, words, len } from "./ground.mjs";
import { rng } from "./lib/rng.mjs";
const JUNK = /^(कारण|विकल्प|option|item|step|point|पॉइंट)\s*(\d+|एक|दो|तीन|चार)?$/i, FRAC = [[/पाँचवें|पांचवें|पाँचवाँ|पांचवां/, 20], [/चौथाई|चौथे हिस्से/, 25], [/तिहाई|तीसरे हिस्से/, 33], [/आधे|आधा|पचास प्रतिशत/, 50]];
const HIDDEN = /चुपचाप|छुपा|छिपा|गुप्त|चुपके|असली|दरअसल|पर्दे|अदृश्य|पहले से तय|बनाकर/, TURN = /\s(पर|लेकिन|मगर|जबकि|बल्कि|फिर भी)\s/, SWAP = /बदल|उलट|की जगह|चुना ही नहीं|दूसरा/;
const cut = (t, max) => { let o = ""; for (const w of words(t)) { if (len(o ? o + " " + w : w) > max) break; o = o ? o + " " + w : w; } return o; };
export function share(nar) { for (const [re, n] of FRAC) if (re.test(nar)) return n; const m = /(.{0,24})\s*प्रतिशत|%/.exec(nar); if (!/प्रतिशत|%/.test(nar)) return null; const ns = [...numbersIn(nar)].filter(x => x >= 1 && x <= 100); return ns.length ? ns[0] : null; }
const CAP = { Specimen: 3, HeadlineStrips: 3, StringBoard: 2, Stamp: 2, Typewriter: 2, RedactReveal: 2, Contrast: 2, ChoiceTree: 1, Checklist: 1, Timeline: 1, SwapDemo: 1, DotCrowd: 1, Narrator: 1, HighlightText: 2, Ledger: 1, CollageWall: 1 }, LIMIT = c => CAP[c] ?? 2;
const COST = /वरदान|वर माँग|शाप|क़ीमत|कीमत|बदले|क़र्ज़|कर्ज़|दाम|सौदा|शर्त/, NAMED = /कहते हैं|कहा जाता है|कहलाता|नाम है|इफ़ेक्ट|इफेक्ट|ब्लाइंडनेस|बायस|effect/;
export function diversify(plan, beats, { log = () => {}, mascot = null } = {}) {
  const n = plan.beats.length, used = {}, changed = [], seenAssets = [], r = rng("diversify:" + (plan.title || "") + n);
  const count = c => used[c] || 0, bump = c => { used[c] = count(c) + 1; };
  plan.beats.forEach((b, i) => { for (const a of b.assets || []) if (a?.id && !seenAssets.some(x => x.id === a.id)) seenAssets.push(a); });
  const set = (b, i, component, patch) => { const was = b.component; for (const k of ["options", "default", "why", "hide", "hl", "tag", "stamp"]) delete b[k]; Object.assign(b, { component, ...patch }); b.assets = patch.assets || (component === "Specimen" || component === "StringBoard" ? b.assets : []); changed.push(`${i + 1}:${was}->${component}`); };
  const options = (b, nar, i, first) => {
    const out = [], cl = clauses(nar).map(clean).filter(c => words(c).length >= 2), sh = share(nar), key = keyWords(nar);
    if (sh) out.push(["DotCrowd", { on_screen: [sh + "%", cut(cl.find(c => /प्रतिशत|हिस्से|पाँचवें|तिहाई|आधे|चौथाई/.test(c)) || cl[0] || "", 36)].filter(Boolean) }]);
    if (HIDDEN.test(nar) && key.length) { const hid = key.filter(w => HIDDEN.test(w) || true).slice(0, 2); out.push(["RedactReveal", { on_screen: wrapLines(clean(nar), 22, 3) || [], hide: hid }]); }
    const m = TURN.exec(" " + clean(nar) + " "); if (m) { const t = " " + clean(nar) + " ", at = t.indexOf(m[0]), a = t.slice(0, at).trim(), c = t.slice(at + m[0].length).trim(); if (len(a) >= 6 && len(c) >= 6 && len(a) <= 40 && len(c) <= 40) out.push(["Contrast", { on_screen: [a, c] }]); }
    const face = seenAssets.find(a => /face|portrait|person|human/i.test(a.subject + a.id)); if (SWAP.test(nar) && face) out.push(["SwapDemo", { assets: [{ id: face.id, subject: face.subject, reuse: true }, { id: face.id + "_other", subject: "a black and white photo of the face of a different person, clearly not the same face, slightly blurred", reuse: false }], on_screen: [cut(clean(nar), 30)] }]);
    if (COST.test(nar)) { const cl = clauses(nar).map(clean).filter(c => words(c).length >= 2).map(c => cut(c, 30)).filter(Boolean).slice(0, 4); if (cl.length >= 2) out.push(["Ledger", { on_screen: cl, stamp: /शाप/.test(nar) ? "CURSE" : /वर/.test(nar) ? "BOON" : "DEBT" }]); }
    { const pics = seenAssets.filter(a => a.id && !/_other$/.test(a.id)).slice(0, 6); if (pics.length >= 3 && /और .+ और|सब |सारे|सभी|अनगिनत|कई /.test(nar) && !SWAP.test(nar)) out.push(["CollageWall", { assets: pics.map(a => ({ id: a.id, subject: a.subject, reuse: true })), on_screen: [cut(clean(nar), 26)] }]); }
    if (mascot && NAMED.test(nar)) { const lines = wrapLines(clean(nar), 24, 2); if (lines) out.push(["Narrator", { assets: [{ id: mascot.id, subject: mascot.subject, reuse: true }], on_screen: lines }]); }
    return out;
  };
  plan.beats.forEach((b, i) => { if (i === 0 || i === n - 1) { bump(b.component); return; } });
  plan.beats.forEach((b, i) => {
    if (i === 0 || i === n - 1) return; const nar = beats[i]?.text || "", prev = plan.beats[i - 1].component, junk = (b.on_screen || []).some(x => JUNK.test(String(x).replace(/^\+\s*/, "").trim())), cur = b.component;
    const ok = c => count(c) < LIMIT(c) && c !== prev, strong = options(b, nar, i).filter(([c]) => ok(c)), over = count(cur) >= LIMIT(cur) || cur === prev;
    if (strong.length) { const [c, patch] = strong[0]; set(b, i, c, patch); }
    else if (junk || over) { const g = clean(nar), key = keyWords(nar), alts = [["RedactReveal", { on_screen: wrapLines(g, 22, 3) || [], hide: key.slice(0, 1) }], ["HighlightText", { on_screen: wrapLines(g, 20, 3) || [], hl: key.slice(0, 2) }], ["HeadlineStrips", { on_screen: wrapLines(g, 24, 3) || [g.slice(0, 24)] }]].filter(([c]) => ok(c) && (c !== "RedactReveal" || (key.length && len(g) <= 66)) && (c !== "HighlightText" || (key.length && len(g) <= 60))); if (alts.length) { const [c, patch] = alts[Math.floor(r() * alts.length)]; set(b, i, c, patch); } }
    bump(b.component);
  });
  // last pass: no scene twice in a row (the Director's repeats become the strongest option left, else headline strips)
  for (let i = 1; i < n - 1; i++) if (plan.beats[i].component === plan.beats[i - 1].component) { const nar = beats[i]?.text || "", alt = options(plan.beats[i], nar, i).find(([c]) => c !== plan.beats[i - 1].component && c !== plan.beats[i + 1]?.component); if (alt) set(plan.beats[i], i, alt[0], alt[1]); else set(plan.beats[i], i, "HeadlineStrips", { on_screen: wrapLines(clean(nar), 24, 3) || [clean(nar).slice(0, 24)] }); }
  if (changed.length) log("  smart picker: " + changed.join(", "));
  return changed;
}
