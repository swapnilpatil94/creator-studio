#!/usr/bin/env node
// Renders every approved/published carousel item into <out>/<slug>/NN.jpg (default blog/dist/c) so Instagram can fetch them from the public blog site.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), out = process.argv[2] || path.join(root, "blog/dist/c"), dir = path.join(root, "content/items"); let n = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".carousel.json"))) { const it = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (!["approved", "scheduled", "published", "posted"].includes(it.status)) continue; const r = spawnSync("node", [path.join(root, "tools/content/carousel.mjs"), path.join(dir, f), "--out", out], { encoding: "utf8" }); if (r.status !== 0) { console.error(f, r.stderr); process.exit(1); } n++; }
console.log(`rendered ${n} carousel(s) -> ${out}`);
