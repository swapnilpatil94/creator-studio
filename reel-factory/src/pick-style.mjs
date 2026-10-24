// Style rotation: never the same edit style twice in a row, and not one used in the last 5 episodes, picked from the genre's candidate list.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { rng } from "./lib/rng.mjs";
const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), HIST = path.join(RF, "episodes/_history.json");
export const GENRE_STYLES = {
  mystery: ["desktop", "retro", "parallax", "zoomthrough", "spotlight", "mapflight", "minimal"], mythology: ["scrapbook", "parallax", "matchcut", "kinetic"], science: ["threed", "zoomthrough", "split", "whip", "kinetic"],
  history: ["retro", "parallax", "mapflight", "desktop"], space: ["zoomthrough", "parallax", "threed"], business: ["split", "kinetic", "whip"], "crime-history": ["desktop", "retro", "spotlight", "mapflight"],
  psychology: ["minimal", "matchcut", "kinetic", "spotlight"], geography: ["mapflight", "zoomthrough", "parallax", "split"], biography: ["retro", "parallax", "scrapbook", "kinetic"],
};
export const loadHistory = (f = HIST) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return []; } };
/** pick a style for an episode: candidates of the genre minus the last `window` used; falls back to the least recently used. Pure given (genre, slug, history). */
export function pickStyle({ genre, slug = "", history = loadHistory(), window = 5 }) {
  const cands = GENRE_STYLES[genre] || Object.keys(GENRE_STYLES).flatMap(g => GENRE_STYLES[g]).filter((s, i, a) => a.indexOf(s) === i), recent = history.slice(-window).map(h => h.style);
  let pool = cands.filter(s => !recent.includes(s)); if (!pool.length) { const last = recent.at(-1); pool = cands.filter(s => s !== last); if (!pool.length) pool = cands; pool.sort((a, b) => recent.lastIndexOf(a) - recent.lastIndexOf(b)); pool = pool.slice(0, 1); }
  return pool[Math.floor(rng("style:" + genre + ":" + slug + ":" + history.length)() * pool.length)];
}
export function recordStyle({ slug, style, genre }, f = HIST) { const h = loadHistory(f); h.push({ slug, style, genre }); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(h.slice(-50), null, 1)); }
