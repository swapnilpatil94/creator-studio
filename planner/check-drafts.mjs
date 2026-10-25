#!/usr/bin/env node
// Validates every content/pack-drafts/*.txt with the same parser the Hub uses (tools/video/pack.mjs). usage: node planner/check-drafts.mjs [slug ...]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { parsePack, joinPack } from "../tools/video/pack.mjs";
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../content/pack-drafts"), want = process.argv.slice(2), files = fs.readdirSync(dir).filter(f => f.endsWith(".txt") && (!want.length || want.includes(f.slice(0, -4)))).sort();
let bad = 0; for (const f of files) { const r = parsePack(joinPack(fs.readFileSync(path.join(dir, f), "utf8"), "")), s = r.stats; const probs = [...r.errors.map(e => "ERROR " + e), ...r.warnings.map(w => "warn " + w)]; if (r.errors.length) bad++; console.log((r.errors.length ? "FAIL " : "ok   ") + f.padEnd(46) + `${s.words}w ${s.est_seconds}s ${s.beats}b`); for (const p of probs.slice(0, 6)) console.log("      " + p); }
console.log(files.length + " drafts, " + bad + " with errors"); process.exit(bad ? 1 : 0);
