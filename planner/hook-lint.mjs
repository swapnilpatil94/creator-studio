#!/usr/bin/env node
// Measurable retention + storytelling checks for a script (Devanagari and English). usage: node planner/hook-lint.mjs stories/<name>
// Heuristics: a low score is a reason to look again, a high score is not a promise.
import path from "node:path"; import { rj, words } from "./lib.mjs";
const dir = path.resolve(process.argv[2] || "."), beats0 = rj(path.join(dir, "beats.json"), null), beats = beats0 ? beats0.filter(b => b.text) : null, seg = rj(path.join(dir, "narration/raw.wav.segments.json"), null); if (!beats) { console.error("no beats.json"); process.exit(2); }
const R = []; const add = (lvl, name, msg) => R.push([lvl, name, msg]); const clean = s => s.replace(/[।…—,.?!"'“”]/g, "").trim(); const wc = s => words(s).length;
const first = beats[0].text, w1 = wc(first);
// ---- hook: weakest-link score over five properties ----
const NUMW = /(सौ|हज़ार|हजार|लाख|करोड़|एक|दो|तीन|चार|पाँच|पांच|छह|छः|सात|आठ|नौ|दस|बारह|तेरह|सोलह|बीस|पचास)/, ADDR = /(तुम|तुम्हारे|तुम्हें|आप|आपके|आपको|you|your)/i, STAKE = /(दाँव|दांव|जान|मौत|हार|खो|खतरा|क़ीमत|कीमत|बर्बाद|अकेला|अकेले|तबाह|नाश|lose|cost|burn|danger|never|fail|only)/i, CUR = /([?？]|क्या|क्यों|कैसे|कौन|लेकिन|मगर|पर |नहीं था|…$|why|how|but|until)/i;
const spec = /[0-9०-९]/.test(first) ? 100 : NUMW.test(first) ? 80 : /(हनुमान|अभिमन्यु|अर्जुन|द्रोण|राम|कृष्ण|[A-Z][a-z]{2,})/.test(first) ? 65 : 30;
const addr = ADDR.test(first) ? 100 : /(वो|उस|वह|he |she )/i.test(first) ? 55 : 35, stakes = STAKE.test(first + " " + (beats[1]?.text || "")) ? 85 : 35, curio = CUR.test(first + " " + (beats[1]?.text || "")) ? 90 : 25, brev = w1 <= 8 ? 100 : w1 <= 11 ? 85 : w1 <= 14 ? 65 : w1 <= 18 ? 40 : 15;
const props = { specificity: spec, address: addr, stakes, curiosity: curio, brevity: brev }, vals = Object.values(props), weakest = Math.min(...vals), score = Math.round(0.5 * weakest + 0.5 * vals.reduce((a, b) => a + b, 0) / vals.length), weakName = Object.entries(props).sort((a, b) => a[1] - b[1])[0][0];
add(score >= 72 ? "PASS" : score >= 55 ? "WARN" : "FAIL", "hook strength", `${score}/100 (weakest: ${weakName} ${weakest}; ` + Object.entries(props).map(([k, v]) => k + " " + v).join(", ") + ")");
const clear = /^(welcome|hello|hi |hey|today we|in this video|नमस्कार|नमस्ते|दोस्तों|स्वागत|आज हम|आज के वीडियो)/i; add(clear.test(first.trim()) ? "FAIL" : "PASS", "no throat-clearing", clear.test(first.trim()) ? "line 1 starts with a greeting/intro" : "opens on content");
add(w1 <= 14 ? "PASS" : w1 <= 18 ? "WARN" : "FAIL", "hook length", w1 + " words in line 1 (aim <= 12)");
// ---- but / therefore vs "and then" ----
const AND = /^(और फिर|और|फिर|इसके बाद|उसके बाद|and then|then|and)\b/i, BUT = /(लेकिन|मगर|पर |बल्कि|फिर भी|but|however|yet|still)/i, THERE = /(इसलिए|तभी|नतीजा|नतीजे|तो |तब |therefore|so |that's why|which means)/i;
let and = 0, bt = 0; const trans = beats.length - 1; for (let i = 1; i < beats.length; i++) { const t = beats[i].text.trim(), head = t.slice(0, 40); if (AND.test(t)) and++; if (BUT.test(head) || THERE.test(head) || BUT.test(beats[i - 1].text.slice(-30))) bt++; }
add(and === 0 ? "PASS" : and <= 1 ? "WARN" : "FAIL", "no \"and then\" chain", and + " of " + trans + " beats open with और/फिर/and-then (each is a flat transition; rewrite with लेकिन / इसलिए)");
add(bt / Math.max(1, trans) >= 0.4 ? "PASS" : "WARN", "but / therefore density", bt + " of " + trans + " transitions carry a but/therefore marker (aim >= 40%)");
// ---- turn, loops, ending ----
const turn = beats.slice(1, Math.ceil(beats.length * 0.7)).some(b => BUT.test(b.text) || /तभी|until/.test(b.text)); add(turn ? "PASS" : "WARN", "mid turn / re-hook", turn ? "a reversal marker appears before the climax" : "no reversal between hook and climax");
const lastB = beats[beats.length - 1].text, wl = wc(lastB); add(wl <= 10 ? "PASS" : "WARN", "last line is a short \"last dab\"", wl + " words (aim <= 10, shareable alone)");
const lw = new Set(words(lastB).map(clean)), echo = words(first).map(clean).filter(x => x.length > 2).some(x => lw.has(x)); add(echo ? "PASS" : "INFO", "ending echoes opening", echo ? "shared word(s) with line 1" : "no lexical echo (a visual echo can still work)");
// ---- rhythm: sentence-length variation across the script ----
const sents = beats.flatMap(b => b.text.split(/[।?!]|\.(?=\s|$)/)).map(s => wc(s)).filter(n => n > 0); const m = sents.reduce((a, b) => a + b, 0) / sents.length, sd = Math.sqrt(sents.reduce((a, b) => a + (b - m) ** 2, 0) / sents.length), cv = sd / m;
add(cv >= 0.4 ? "PASS" : cv >= 0.3 ? "WARN" : "FAIL", "rhythm (jagged edge)", `sentence length ${Math.min(...sents)}-${Math.max(...sents)} words, mean ${m.toFixed(1)}, variation ${cv.toFixed(2)} (aim >= 0.4; low = monotone)`);
// ---- pacing from the real narration ----
if (seg) { let worstW = 0, worstB = "", worstC = 0, longest = 0, gap = 0; seg.segments.forEach((s, i) => { const d = Math.max(0.1, s.end_seconds - s.start_seconds), wps = s.words.length / d, cps = s.text.replace(/\s/g, "").length / d; if (wps > worstW) { worstW = wps; worstB = s.beat_id; } worstC = Math.max(worstC, cps); longest = Math.max(longest, d); if (i) gap = Math.max(gap, s.start_seconds - seg.segments[i - 1].end_seconds); });
  add(worstW <= 4.0 ? "PASS" : worstW <= 4.5 ? "WARN" : "FAIL", "speaking rate (our Hindi voice avg ~3.4 w/s)", `fastest beat ${worstB} at ${worstW.toFixed(1)} w/s; peak ${worstC.toFixed(1)} chars/s (>4.0 w/s sounds rushed; split the beat or slow the tempo)`);
  add(longest <= 7 ? "PASS" : "WARN", "no lull", "longest beat " + longest.toFixed(1) + " s"); add(gap <= 1.2 ? "PASS" : "WARN", "gaps between beats", "largest pause " + gap.toFixed(1) + " s (intentional silence before the peak is fine)"); add("INFO", "length", seg.duration_seconds.toFixed(1) + " s narration, " + beats.reduce((a, b) => a + wc(b.text), 0) + " words"); }
const sym = { PASS: "✓", WARN: "!", FAIL: "✗", INFO: "·" }; R.forEach(([l, n, msg]) => console.log(`${sym[l]} ${l.padEnd(4)} ${n.padEnd(36)} ${msg}`)); const f = R.filter(r => r[0] === "FAIL").length, w = R.filter(r => r[0] === "WARN").length; console.log(`\n${f} fail, ${w} warn. Measurable checks only; the rest is in storytelling-hooks / storytelling / retention-psychology.`); process.exit(f ? 1 : 0);
