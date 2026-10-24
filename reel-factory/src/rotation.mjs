// Daily variety: never the same template as the last two videos, cycle through all of them before repeating, and rotate the animation pack on a different beat.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { TEMPLATES } from "../templates/index.mjs"; import { PACKS } from "./compose.mjs";
const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), HIST = path.join(RF, "episodes/_history.json");
export const ANIMATIONS = Object.keys(PACKS).filter(k => PACKS[k]);
export const history = (f = HIST) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return []; } };
const leastRecent = (names, used, avoid) => { const pool = names.filter(n => !avoid.includes(n)); const c = (pool.length ? pool : names).slice().sort((a, b) => used.lastIndexOf(a) - used.lastIndexOf(b)); return c[0]; };
export function pickTemplate(h = history(), hint) { const used = h.map(x => x.template).filter(Boolean), names = Object.keys(TEMPLATES); if (hint && names.includes(hint) && !used.slice(-2).includes(hint)) return hint; return leastRecent(names, used, used.slice(-2)); }
export function pickAnimation(h = history()) { const used = h.map(x => x.animation).filter(Boolean); return leastRecent(ANIMATIONS, used, used.slice(-1)); }
export function recordRun(e, f = HIST) { const h = history(f); h.push({ ...e, at: new Date().toISOString() }); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(h.slice(-200), null, 1)); }
