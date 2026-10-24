// Writer: topic + facts -> reel script lines, by a local LLM (Ollama), schema-enforced; every line must be grounded in a fact (or be one of at most 4 connective/question lines).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import Ajv from "ajv";
import { numbersIn, digitsOnScreen } from "./hindi-numbers.mjs"; import { toks, wordOk, norm } from "./director.mjs";
const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), MODEL = process.env.REEL_WRITER_MODEL || "qwen3-coder:30b";
export const writerSchema = { type: "object", required: ["title", "lines"], additionalProperties: false, properties: { title: { type: "string", maxLength: 60 }, lines: { type: "array", minItems: 8, maxItems: 11, items: { type: "object", required: ["text", "fact"], additionalProperties: false, properties: { text: { type: "string", minLength: 8, maxLength: 200 }, fact: { type: ["integer", "null"], minimum: 1 } } } } } };
const ajv = new Ajv({ allErrors: true, strict: false }), validate = ajv.compile(writerSchema), words = t => t.trim().split(/\s+/).length;
const ABSOLUTE = /(?:हमेशा|कभी नहीं|सभी कंपनियाँ|हर कंपनी|साज़िश|षड्यंत्र)/;
export function check(out, topic) {
  const errs = validate(out) ? [] : ajv.errors.slice(0, 6).map(e => `schema ${e.instancePath || "/"} ${e.message}`); if (!Array.isArray(out?.lines)) return errs.length ? errs : ["no lines"];
  const factsAll = topic.facts.join(" "), okNums = numbersIn(factsAll), free = out.lines.filter(l => l.fact == null).length;
  if (free > 4) errs.push(`${free} lines are not tied to a fact; at most 4 (hook, connectives, the closing question)`);
  out.lines.forEach((l, i) => { const n = i + 1, w = words(l.text); if (w > 22 || w < 5) errs.push(`line ${n}: ${w} words; keep 8 to 20`);
    if (/[0-9]/.test(l.text)) errs.push(`line ${n}: write numbers as Hindi words, no digits`);
    if (ABSOLUTE.test(l.text)) errs.push(`line ${n}: avoid absolute or conspiratorial wording`);
    const bad = [...numbersIn(l.text)].filter(x => !okNums.has(x)); if (bad.length) errs.push(`line ${n}: the number(s) ${bad.join(", ")} are not in the facts; never add numbers`);
    if (l.fact != null) { const f = topic.facts[l.fact - 1]; if (!f) errs.push(`line ${n}: fact ${l.fact} does not exist (1 to ${topic.facts.length})`); else { const ft = toks(f), content = toks(l.text).filter(x => x.length >= 4); const hit = content.filter(x => wordOk(x, ft)).length; if (content.length && hit / content.length < 0.3) errs.push(`line ${n}: it does not use the words of fact ${l.fact}; stay close to that fact`); } } });
  const total = out.lines.reduce((a, l) => a + words(l.text), 0); if (total > 165) errs.push(`${total} words in all; keep it under 150`); if (total < 70) errs.push(`only ${total} words; aim for 110 to 150`);
  const last = out.lines.at(-1)?.text || ""; if (!/[?？]\s*$/.test(last)) errs.push("the last line must be a question to the viewer, ending with ?");
  return errs;
}
export async function write({ topic, model = MODEL, log = console.log, rounds = 3, ollama = "http://127.0.0.1:11434" }) {
  const sys = fs.readFileSync(path.join(RF, "prompts/writer.md"), "utf8"), msgs = [{ role: "system", content: sys }, { role: "user", content: `TOPIC: ${topic.title}\nFACTS:\n${topic.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nWrite the script JSON now.` }]; let errs = [];
  for (let r = 0; r <= rounds; r++) {
    const t = Date.now(), res = await fetch(ollama + "/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, messages: msgs, stream: false, keep_alive: 0, format: writerSchema, options: { temperature: 0.5, num_ctx: 12288, num_predict: 5000 } }) }); if (!res.ok) throw new Error("ollama " + res.status);
    const j = await res.json(); let out; try { out = JSON.parse(j.message.content); } catch { errs = ["not JSON"]; msgs.push({ role: "assistant", content: j.message.content }, { role: "user", content: "Return only the JSON object." }); continue; }
    errs = check(out, topic); log(`  writer round ${r + 1}: ${errs.length ? errs.length + " problem(s)" : "valid"} (${((Date.now() - t) / 1000).toFixed(0)}s)`);
    if (!errs.length) return { title: out.title, lines: out.lines.map(l => l.text.trim()), grounding: out.lines.map(l => l.fact), rounds: r + 1 };
    msgs.push({ role: "assistant", content: j.message.content }, { role: "user", content: `Fix these problems and return the full corrected JSON only:\n- ${errs.slice(0, 10).join("\n- ")}` });
  }
  throw new Error("Writer could not produce a grounded script: " + errs.slice(0, 4).join("; "));
}
