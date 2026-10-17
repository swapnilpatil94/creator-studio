#!/usr/bin/env node
// Every narrated beat must be covered by the claims ledger; "verified" needs sources; numbers need sources. usage: node planner/claims-check.mjs stories/<name>
import path from "node:path"; import fs from "node:fs"; import { rj } from "./lib.mjs";
const dir = path.resolve(process.argv[2] || "."), beats0 = rj(path.join(dir, "beats.json"), null), beats = beats0 ? beats0.filter(b => b.text) : null, led = rj(path.join(dir, "claims.json"), null); if (!beats) { console.error("no beats.json in " + dir); process.exit(2); } if (!led) { console.error("FAIL no claims.json: every film needs a claims ledger"); process.exit(1); }
const OK = ["verified", "traditional-account", "variant", "interpretation", "omitted"]; let fail = 0, warn = 0; const out = (l, m) => { console.log(l + " " + m); if (l === "FAIL") fail++; if (l === "WARN") warn++; };
for (const b of beats) { const cs = led.claims.filter(c => c.beat === b.id); if (!cs.length) { out("FAIL", b.id + ": no claims entry for \"" + b.text.slice(0, 40) + "…\""); continue; }
  for (const c of cs) { if (!OK.includes(c.status)) out("FAIL", b.id + ": bad status " + c.status); if (c.status === "verified" && !(c.sources || []).length) out("FAIL", b.id + ": 'verified' claim without sources: " + c.claim); if (c.status === "interpretation" && !/(तो|कहा जाता|माना|कुछ|say|some|believe)/i.test(b.text) && c.narrated !== false) out("WARN", b.id + ": interpretation narrated without hedging language"); if (c.needs_check) out("WARN", b.id + ": citation not yet checked against the source text: " + c.claim); }
  if (/[0-9०-९]/.test(b.text) && !cs.some(c => (c.sources || []).length)) out("FAIL", b.id + ": contains a number but no sourced claim"); }
for (const c of led.claims) if (!beats.some(b => b.id === c.beat)) out("WARN", "ledger entry for unknown beat " + c.beat);
console.log(fail ? `\n${fail} FAIL, ${warn} warn` : `\nledger OK for ${beats.length} beats (${warn} warnings)`); process.exit(fail ? 1 : 0);
