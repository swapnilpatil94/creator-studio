// Grounded wording: built from the beat's own narration, whole clauses and words, shaped for the component.
import test from "node:test"; import assert from "node:assert/strict";
import { derive, finalLines, regroundPlan, wrapLines } from "../src/ground.mjs"; import { toks, wordOk } from "../src/director.mjs"; import { planQa } from "../src/plan-qa.mjs";
const NAR = "दिमाग़ दाम को बाएँ से दाएँ पढ़ता है और पहले अंक पर टिक जाता है।";
const whole = (items, nar) => { const nt = toks(nar); return items.every(i => toks(i.replace(/[+\-~!|?]/g, " ")).every(w => wordOk(w, nt))); };
test("derived text uses only whole words of the beat's narration, for every component", () => { for (const c of ["Specimen", "Stamp", "Typewriter", "StringBoard", "ChoiceTree", "HeadlineStrips", "Checklist"]) { const d = derive(c, NAR, "अंक"); assert.ok(d.on_screen.length && whole(d.on_screen, NAR), c + " " + JSON.stringify(d)); } });
test("the closing beat shows the final question whole, once", () => { const nar = "अगली बार जब खरीदारी करें, तो सोचिए: ये दाम आपकी पसंद है… या किसी ने बनाया है?"; const f = finalLines(nar); assert.ok(/\?$/.test(f.at(-1)) && !/\?\?/.test(f.join(" ")) && f.every(l => [...l].length <= 28)); });
test("a checklist or counter without material becomes headline strips; wrapping never exceeds its limits", () => { assert.equal(derive("Checklist", "फ़र्क़ सिर्फ़ एक रुपये का है।").component, "HeadlineStrips"); assert.equal(derive("Counter", "दाम पर असर पड़ता है।").component, "HeadlineStrips"); assert.equal(wrapLines("बहुत लंबी बात जो एक पंक्ति में नहीं आएगी बिल्कुल भी नहीं", 10, 2), null); });
test("regroundPlan repairs fragments, one-word stubs and a closing beat that is not the final question", () => {
  const beats = [{ text: NAR }, { text: "ये दाम आपकी पसंद है… या किसी ने बनाया है?" }], plan = { beats: [{ component: "Typewriter", on_screen: ["दिमाग़"], assets: [], emphasis_word: "अंक" }, { component: "Specimen", on_screen: ["या किसी ने"], assets: [{ id: "x" }], emphasis_word: "पसंद" }] };
  const ch = regroundPlan(plan, beats); assert.deepEqual(ch, [1, 2]); assert.ok(whole(plan.beats[0].on_screen, NAR)); assert.ok(/\?$/.test(plan.beats[1].on_screen.at(-1))); assert.deepEqual(planQa(plan, beats), []);
});
