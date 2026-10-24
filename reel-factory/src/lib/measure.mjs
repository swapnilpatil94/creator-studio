// Text fitting: measure real Devanagari/Latin widths in headless Chrome with the vendored fonts, cached by content. Compose stays deterministic (same fonts, same widths).
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url"; import { hash } from "./rng.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), FONTS = path.resolve(here, "../../fonts"), CACHE = path.resolve(here, "../../.cache/measure.json");
const chromePath = () => { const base = path.join(os.homedir(), ".cache/hyperframes/chrome/chrome-headless-shell"); for (const v of fs.existsSync(base) ? fs.readdirSync(base) : []) { const p = path.join(base, v, "chrome-headless-shell-mac-arm64/chrome-headless-shell"); if (fs.existsSync(p)) return p; } throw new Error("HyperFrames' headless Chrome not found (run `npx hyperframes doctor`)"); };
let cache = null; const load = () => cache || (cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {});
/** items: [{text, family, weight, size, spacing?}] -> widths (px) in the same order */
export async function measure(items) {
  const c = load(), key = it => hash(JSON.stringify([it.text, it.family, it.weight, it.size, it.spacing || 0])).toString(36), todo = items.filter(it => c[key(it)] == null);
  if (todo.length) {
    const { chromium } = await import("playwright-core"); const b = await chromium.launch({ executablePath: chromePath() }), pg = await b.newPage();
    const css = fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8").replace(/url\('assets\/fonts\//g, `url('file://${FONTS}/`);
    const page = path.resolve(path.dirname(CACHE), "measure.html"); fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(page, `<style>${css} span{white-space:nowrap;position:absolute;left:0;top:0}</style><body></body>`); await pg.goto("file://" + page);
    const res = await pg.evaluate(async list => { const out = []; for (const it of list) { await document.fonts.load(`${it.weight} ${it.size}px '${it.family}'`, it.text); const s = document.createElement("span"); s.textContent = it.text; s.style.cssText = `font:${it.weight} ${it.size}px '${it.family}';letter-spacing:${it.spacing || 0}px`; document.body.appendChild(s); out.push(s.getBoundingClientRect().width); s.remove(); } return out; }, todo);
    await b.close(); todo.forEach((it, i) => { c[key(it)] = +res[i].toFixed(1); }); fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(c));
  }
  return items.map(it => c[key(it)]);
}
/** largest font size <= start (down to min) whose rendered width fits maxW */
export async function fitSize(text, { family, weight, start, min = 40, maxW, spacing = 0 }) {
  let [w] = await measure([{ text, family, weight, size: start, spacing }]); if (w <= maxW) return { size: start, width: w };
  const size = Math.max(min, Math.floor(start * maxW / w)); [w] = await measure([{ text, family, weight, size, spacing }]);
  return { size, width: w };
}
