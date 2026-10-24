// The daily factory: rotation, queue and schedule rules, writer grounding rules, animation packs. Pure logic, no models.
import test from "node:test"; import assert from "node:assert/strict"; import path from "node:path"; import fs from "node:fs";
import { pickTemplate, pickAnimation, ANIMATIONS } from "../src/rotation.mjs"; import * as Q from "../src/queue.mjs"; import { check } from "../src/writer.mjs"; import { PACKS } from "../src/compose.mjs"; import { TRANSITIONS } from "../src/transitions.mjs"; import { TEMPLATES } from "../templates/index.mjs";
test("templates rotate: all 5 before any repeats, never the same as the last two; animation packs rotate on their own beat", () => {
  const h = [], seq = []; for (let i = 0; i < 10; i++) { const t = pickTemplate(h), a = pickAnimation(h); seq.push(t); h.push({ template: t, animation: a }); }
  assert.equal(new Set(seq.slice(0, 5)).size, Object.keys(TEMPLATES).length); seq.forEach((t, i) => { if (i) assert.notEqual(t, seq[i - 1]); if (i > 1) assert.notEqual(t, seq[i - 2]); });
  const anims = h.map(x => x.animation); anims.forEach((a, i) => i && assert.notEqual(a, anims[i - 1])); assert.ok(new Set(anims).size >= 3);
});
test("every animation pack uses transitions that exist", () => { for (const [k, list] of Object.entries(PACKS)) if (list) for (const t of list) assert.ok(TRANSITIONS[t], k + " -> " + t); assert.ok(ANIMATIONS.length >= 4); });
test("queue: dedupes, needs facts, seeds the starter bank, and the schedule only fires when due", () => {
  const q = { settings: { enabled: true, perDay: 2, hour: 0 }, items: [] }; assert.equal(Q.add(q, [{ title: "a", facts: ["1", "2", "3"] }, { title: "no facts", facts: [] }]), 1);
  assert.equal(Q.seedFrom(q, path.resolve("topics/dark-psychology.json")), 10); assert.equal(Q.seedFrom(q, path.resolve("topics/dark-psychology.json")), 0);
  assert.ok(Q.due(q, new Date(2026, 9, 25, 3))); q.settings.enabled = false; assert.ok(!Q.due(q, new Date(2026, 9, 25, 3))); q.settings.enabled = true; q.settings.hour = 5; assert.ok(!Q.due(q, new Date(2026, 9, 25, 3)));
  q.settings.hour = 0; const now = new Date().toISOString(); q.items.slice(0, 2).forEach(i => { i.status = "done"; i.finished = now; }); assert.ok(!Q.due(q), "quota reached");
});
test("starter topics: every topic has 3+ facts and a verify list", () => { const t = JSON.parse(fs.readFileSync("topics/dark-psychology.json", "utf8")).topics; assert.ok(t.length >= 10); for (const x of t) { assert.ok(x.facts.length >= 3, x.id); assert.ok(x.verify.length >= 1, x.id); } });
const topic = { title: "t", facts: ["जब पैसा खर्च हो जाता है, वह वापस नहीं आता।", "इसे सनक कॉस्ट फ़ॉलेसी कहा जाता है।", "लोग बुरी फ़िल्म आख़िर तक देखते हैं।"] };
const L = (text, fact = null) => ({ text, fact }), good = () => ({ title: "t", lines: [L("आपने कभी बुरी फ़िल्म आख़िर तक देखी है क्या?"), L("जब पैसा खर्च हो जाता है, वह वापस नहीं आता।", 1), L("फिर भी लोग बुरी फ़िल्म आख़िर तक देखते हैं।", 3), L("इसे सनक कॉस्ट फ़ॉलेसी कहा जाता है।", 2), L("तो रुकना मुश्किल क्यों लगता है, यह देखिए।"), L("जो खर्च हो चुका, वह फ़ैसले का हिस्सा नहीं होना चाहिए, पैसा वापस नहीं आता।", 1), L("पर दिमाग़ उसे छोड़ना नहीं चाहता, यही जाल है।"), L("अगली बार सोचिए: क्या आप आगे के लिए चुन रहे हैं, या पीछे के लिए?")] });
test("writer rules: a grounded script passes; digits, invented numbers, ungrounded lines and a statement ending are rejected", () => {
  assert.deepEqual(check(good(), topic).filter(e => !/words in all/.test(e)), []);
  const a = good(); a.lines[1].text += " 99 प्रतिशत"; assert.ok(check(a, topic).some(e => /digits|not in the facts/.test(e)));
  const b = good(); b.lines[2] = L("निन्यानवे प्रतिशत लोग यही करते हैं।", 3); assert.ok(check(b, topic).some(e => /not in the facts/.test(e)));
  const c = good(); c.lines = c.lines.map(l => ({ ...l, fact: null })); assert.ok(check(c, topic).some(e => /not tied to a fact/.test(e)));
  const d = good(); d.lines[7].text = "यह सब बस इतना ही है।"; assert.ok(check(d, topic).some(e => /question/.test(e)));
});
