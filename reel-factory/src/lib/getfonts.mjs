// One-time font vendoring (OFL fonts from Google Fonts). Run: node reel-factory/src/lib/getfonts.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fonts");
const FAMS = [["Teko", "wght@700"], ["Kalam", "wght@700"], ["Mukta", "wght@600;800"], ["Tiro Devanagari Hindi", "wght@400"], ["Anton", ""], ["Permanent Marker", ""], ["IBM Plex Mono", "wght@500"]];
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
let css = "", lic = [];
for (const [fam, w] of FAMS) {
  const u = `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, "+")}${w ? ":" + w : ""}&display=block`;
  const txt = await (await fetch(u, { headers: { "user-agent": UA } })).text();
  for (const m of txt.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const [, subset, body] = m; if (!/^(devanagari|latin)$/.test(subset)) continue;
    const url = /url\(([^)]+)\)/.exec(body)[1], weight = /font-weight:\s*(\d+)/.exec(body)[1], range = /unicode-range:\s*([^;]+)/.exec(body)[1];
    const file = `${fam.replace(/ /g, "")}-${weight}-${subset}.woff2`; fs.writeFileSync(path.join(dir, file), Buffer.from(await (await fetch(url)).arrayBuffer()));
    css += `@font-face{font-family:'${fam}';font-weight:${weight};src:url('assets/fonts/${file}') format('woff2');unicode-range:${range};}\n`; lic.push({ family: fam, weight, subset, file, licence: "SIL OFL 1.1", source: "https://fonts.google.com/specimen/" + fam.replace(/ /g, "+") });
  }
}
fs.writeFileSync(path.join(dir, "fonts.css"), css); fs.writeFileSync(path.join(dir, "fonts.json"), JSON.stringify(lic, null, 1)); console.log(lic.length, "font files");
