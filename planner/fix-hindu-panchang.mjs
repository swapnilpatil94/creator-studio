// hindu-panchang@1.0.1 ships dist/*.js with relative imports missing the .js extension
// (works under bundlers/CJS, fails under Node's strict ESM resolver). This patches the
// installed copy; wired as package.json "postinstall" so `npm install` stays reproducible.
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "node_modules/hindu-panchang/dist");
if (!fs.existsSync(dir)) { console.log("hindu-panchang/dist not found, skipping patch"); process.exit(0); }

let patched = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".js"))) {
  const p = path.join(dir, f);
  const src = fs.readFileSync(p, "utf8");
  const fixed = src.replace(/from (['"])(\.\/[^'".]+)\1/g, (m, q, p) => `from ${q}${p}.js${q}`);
  if (fixed !== src) { fs.writeFileSync(p, fixed); patched++; }
}
console.log(`patched ${patched} file(s) in ${dir}`);
