// The production queue: topics (title + facts) waiting to become videos, plus the daily schedule settings. One JSON file, so it survives restarts.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), QF = path.join(RF, "episodes/_queue.json");
export const load = (f = QF) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return { settings: { enabled: false, perDay: 2, hour: 2 }, items: [] }; } };
export const save = (q, f = QF) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(q, null, 1)); };
const slugify = s => (s || "topic").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "topic";
export const today = () => new Date().toISOString().slice(0, 10);
export function add(q, topics) { const have = new Set(q.items.map(i => i.id)); let n = 0; for (const t of topics) { const id = t.id || slugify(t.title) + "-" + Date.now().toString(36).slice(-4); if (have.has(id) || !t.title || !(t.facts || []).length) continue; q.items.push({ id, title: t.title, topic: { title: t.title, facts: t.facts, verify: t.verify || [] }, template_hint: t.template_hint || null, status: "queued", created: new Date().toISOString() }); have.add(id); n++; } return n; }
export const seedFrom = (q, bankFile) => add(q, JSON.parse(fs.readFileSync(bankFile, "utf8")).topics);
export const next = q => q.items.find(i => i.status === "queued");
export const madeToday = q => q.items.filter(i => i.finished && i.finished.slice(0, 10) === today() || i.started && i.started.slice(0, 10) === today() && i.status === "running").length;
/** is the scheduler allowed to start something now? (enabled, after the start hour, under today's quota, something queued) */
export const due = (q, now = new Date()) => q.settings.enabled && now.getHours() >= q.settings.hour && madeToday(q) < q.settings.perDay && !!next(q);
