// Regression test for the content QA gate: the owner's own planning-doc example MUST fail, the corrected exemplar items MUST pass. Run: node tests/content-qa.test.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { run } from "../tools/content/qa-content.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")); let bad = 0;
const must = (name, ok, d = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (d ? " — " + d : "")); if (!ok) bad++; };
const codes = r => r.filter(x => x.level === "FAIL").map(x => x.code);
const pdf = codes(run(J("content/fixtures/pdf-original-ganga.json")));
for (const c of ["fake-stat", "engagement-bait", "hashtags", "hook-length", "claim-unverified"]) must("planning-doc example is rejected for " + c, pdf.includes(c), pdf.join(","));
for (const f of fs.readdirSync(path.join(root, "content/items")).filter(x => x.endsWith(".json"))) { const r = run(J("content/items/" + f)); must("exemplar passes: " + f, codes(r).length === 0, codes(r).join(",")); }
const base = J("content/items/ganga-seven-sons.fb_text.json");
must("belief stated as fact is rejected", codes(run({ ...base, id: "t1", body_lines: ["हनुमान जी आज भी जीवित हैं और लोगों ने उन्हें देखा है।", ...base.body_lines.slice(1)] })).includes("belief-as-fact"));
must("belief framed as मान्यता passes that rule", !codes(run({ ...base, id: "t2", body_lines: ["मान्यता है कि हनुमान जी आज भी जीवित हैं।", ...base.body_lines.slice(1)] })).includes("belief-as-fact"));
must("Draupadi workplace hook is rejected", codes(run({ ...base, id: "t3", hook: "द्रौपदी चीरहरण आज का workplace harassment case?" })).includes("trivialise"));
must("link inside a Facebook text post is rejected", codes(run({ ...base, id: "t4", cta: "पढ़ें https://example.com" })).includes("link"));
must("AI slop phrase is flagged", run({ ...base, id: "t5", cta: "आइए जानते हैं पूरी कथा।" }).some(x => x.code === "ai-slop"));
console.log(bad ? `\n${bad} FAILED` : "\nALL PASSED"); process.exit(bad ? 1 : 0);
