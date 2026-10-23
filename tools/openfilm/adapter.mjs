// Deterministic adapter: wraps an existing longform story page (window.renderAt(t) / window.getDuration())
// so it also satisfies OpenFilm's page contract (window.film = {frame(t), duration}).
// Pure file transform -- never edits engine/longform/core.js or the story's own build/index.html.
// usage: node tools/openfilm/adapter.mjs <built-index.html> <out.html>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHIM = `<script>
  // injected by tools/openfilm/adapter.mjs -- bridges the existing renderAt(t)/getDuration() contract
  // to OpenFilm's frame(t)/duration page contract. The picture itself is untouched: same canvas, same frame().
  window.film = {
    frame(t) { return window.renderAt(t); },
    get duration() { return window.getDuration(); },
  };
</script>`;

export function wrapPageForOpenFilm(builtHtmlPath, outHtmlPath) {
  const html = fs.readFileSync(builtHtmlPath, "utf8");
  if (!/window\.renderAt\s*=/.test(html) || !/window\.getDuration\s*=/.test(html)) {
    throw new Error(`${builtHtmlPath}: does not set window.renderAt/window.getDuration -- not a longform-engine page`);
  }
  if (!/<\/body>/i.test(html)) throw new Error(`${builtHtmlPath}: no </body> tag to inject the adapter shim before`);
  const wrapped = html.replace(/<\/body>/i, `${SHIM}\n</body>`);
  fs.mkdirSync(path.dirname(outHtmlPath), { recursive: true });
  fs.writeFileSync(outHtmlPath, wrapped);
  return outHtmlPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [inp, out] = process.argv.slice(2);
  if (!inp || !out) { console.error("usage: node tools/openfilm/adapter.mjs <built-index.html> <out.html>"); process.exit(2); }
  wrapPageForOpenFilm(path.resolve(inp), path.resolve(out));
  console.log(`wrapped -> ${out}`);
}
