// The 7-day planner behind the Hub's "Week" tab (owner 2026-10-22): one card per video topic on a date, shorts or long, with the stage it is at
// (topic -> script -> visuals -> video -> published). Cards are stored in content/weekplan.json; the script and visuals answers pasted from other models live on the card,
// so the work survives reloads and is ready to build. Stages are detected from the real files (the card's manual flags only override upward).
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), F = path.join(root, "content/weekplan.json");
const J = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
export const load = () => J(F, { cards: [] }), save = d => fs.writeFileSync(F, JSON.stringify(d, null, 1));
const iso = d => d.toISOString().slice(0, 10), addDays = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export const todayIST = () => iso(new Date(Date.now() + 5.5 * 3600e3));
export function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(new Date(s + "T00:00:00Z")); }

// what is really done for this card: reads the story folder the pack was built into. Nothing is "done" without evidence: a hand mark (flag) is shown as such.
const packOf = d => J(path.join(d, "pack.json"));
export function stages(card, runningJobs = []) {
  const slug = card.slug, d = slug ? path.join(root, "stories", "video-" + slug) : null, fl = card.flags || {}, ck = card.check || null;
  const pack = d && fs.existsSync(d) ? packOf(d) : null, beatsF = d ? J(path.join(d, "beats.json")) : null, planF = d ? J(path.join(d, "plan.json")) : null, scriptHave = !!(card.script || "").trim(), visHave = !!(card.visuals || "").trim();
  const st = (done, why, extra = {}) => ({ done, why, ...extra });
  const script = card.scriptSavedAt && ck && ck.ok ? st(true, "saved here and accepted by the checker") : pack && pack.beats && pack.beats.length ? st(true, "the built video's own pack has " + pack.beats.length + " narration lines") : (beatsF && beatsF.length) ? st(true, "the built video has its script (" + beatsF.length + " narration lines, written by the system from the carousel)") : fl.script ? st(true, "marked by hand", { hand: true }) : scriptHave ? st(false, "pasted but " + (ck && !ck.ok ? "the checker rejected it" : "not saved yet"), { have: true }) : st(false, "nothing yet");
  const visuals = card.visualsSavedAt && ck && ck.ok ? st(true, "saved here and accepted by the checker") : pack && (Object.keys(pack.scenes || {}).length || Object.keys(pack.visuals || {}).length || pack.cast) ? st(true, "the built video's own pack carries " + Object.keys(pack.scenes || {}).length + " scenes") : (planF && planF.length) ? st(true, "the built video has a scene plan (" + planF.length + " beats, planned by the system's director)") : fl.visuals ? st(true, "marked by hand", { hand: true }) : visHave ? st(false, "pasted but not saved/accepted yet", { have: true }) : st(false, "nothing yet");
  let video = fl.video ? { done: true, state: "marked", why: "marked by hand", hand: true } : { done: false, state: "none", why: "no video built yet" };
  if (d && fs.existsSync(d)) {
    const t = J(path.join(d, "timing.json")), od = path.join(d, "output"), mp4 = fs.existsSync(od) ? fs.readdirSync(od).find(f => /-upload\.mp4$/.test(f)) || null : null;
    if (runningJobs.some(j => j.status === "running" && j.name === "video " + slug)) video = { done: false, state: "building", why: "building now" };
    else if (t && t.failed) video = { done: false, state: "failed", why: "the last build stopped at " + t.failed, detail: t.failed };
    else if (mp4) video = { done: true, state: "done", why: t && !t.ended ? "the last rebuild was interrupted; this is the earlier finished video" : "video file exists" };
    else if (t && !t.ended) video = { done: false, state: "partial", why: "a build started but did not finish" };
  }
  // published vs scheduled are different facts: a scheduled post is NOT published
  const pub = { yt: null, fb: null, ig: null }, now = Date.now(), up = d ? J(path.join(d, "upload.json")) : null, su = d ? J(path.join(d, "social-upload.json")) : null, q = (J(path.join(root, "schedule.json"), []) || []).filter(e => slug && e.story === "video-" + slug && e.platform === "instagram").pop();
  if (up && up.url) pub.yt = up.publishAt ? (new Date(up.publishAt) > now ? { s: "scheduled", at: up.publishAt } : { s: "published" }) : up.privacy === "private" ? { s: "private" } : { s: "published" };
  if (su && su.facebook && !su.facebook.skipped) pub.fb = su.mode === "schedule" && su.at && new Date(su.at) > now ? { s: "scheduled", at: su.at } : { s: "published" };
  if (q) pub.ig = q.status === "done" ? { s: "published" } : q.status === "failed" ? { s: "failed", err: String(q.error || "").slice(0, 80) } : new Date(q.at) > now ? { s: "scheduled", at: q.at } : { s: "overdue", at: q.at };
  else if (su && su.instagram && !su.instagram.skipped) pub.ig = su.instagram.id || su.instagram.permalink_url ? { s: "published" } : su.instagram.queued ? (new Date(su.instagram.queued) > now ? { s: "scheduled", at: su.instagram.queued } : { s: "overdue", at: su.instagram.queued }) : null;
  const vals = Object.values(pub).filter(Boolean), published = vals.length && vals.every(v => v.s === "published"), scheduled = vals.some(v => v.s === "scheduled"), problem = vals.some(v => v.s === "failed" || v.s === "overdue");
  const published2 = fl.published && !vals.length ? { done: true, why: "marked by hand", hand: true, platforms: pub } : { done: !!published, scheduled: !!scheduled && !problem && !published, partial: !!vals.length && !published && !scheduled, problem, platforms: pub, why: vals.length ? vals.map((v, i) => ["YouTube", "Facebook", "Instagram"][Object.values(pub).indexOf(v)] + ": " + v.s + (v.at ? " " + new Date(v.at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "")).join(" · ") : "not published or scheduled" };
  return { topic: st(!!(card.title || "").trim(), "the topic is set"), script, visuals, video, published: published2 };
}

// build progress for one card: stages from timing.json (+ canonical pending ones), the job's log tail, art picture count, ETA from this Mac's own past builds
const ORDER = ["script", "prepare", "voice", "director", "coverage", "art", "layers+scene", "camera", "sound", "render+QA", "thumbnail", "package"];
const DEFAULT_SEC = { script: 5, prepare: 20, voice: 600, director: 15, coverage: 2, art: 900, "layers+scene": 240, camera: 600, sound: 30, "render+QA": 420, thumbnail: 150, package: 10 };
const median = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
function history(format) { const by = {}; const sd = path.join(root, "stories"); if (!fs.existsSync(sd)) return by; for (const n of fs.readdirSync(sd)) { if (!n.startsWith("video-")) continue; const st = J(path.join(sd, n, "story.json")), t = J(path.join(sd, n, "timing.json")); if (!t || !t.ended || t.failed || !st) continue; const [w, h] = String(st.format || "1080x1920").split("x").map(Number), fmt = h > w ? "short" : "long"; if (fmt !== format) continue; for (const s of t.stages || []) if (s.status === "done" && s.seconds > 0) (by[s.name] = by[s.name] || []).push(s.seconds); } return by; }
export function progress(card, jobs = []) {
  const slug = card.slug; if (!slug) return { state: "idle", stages: [], note: "no build yet" };
  const d = path.join(root, "stories", "video-" + slug), t = J(path.join(d, "timing.json")), format = card.format === "long" ? "long" : "short", hist = history(format);
  const job = [...jobs].reverse().find(j => j.name === "video " + slug), running = job && job.status === "running", lines = job ? job.log || [] : [];
  const stageRows = (t && t.stages ? t.stages : []).map(s => ({ name: s.name, status: s.status, seconds: s.seconds ?? null, detail: String(s.detail || "").slice(0, 140), start: s.start || null }));
  const seen = new Set(stageRows.map(s => s.name)), rows = [...stageRows, ...ORDER.filter(n => !seen.has(n)).map(n => ({ name: n, status: "pending", seconds: null, detail: "", start: null }))];
  let art = null; for (const l of lines.slice().reverse()) { const m = /image\s+\S+\s+\((\d+)\/(\d+)\)\s+in\s+(\d+)s/.exec(l); if (m) { art = { done: +m[1], total: +m[2], perImage: +m[3] }; break; } }
  const elapsedOf = s => s.start ? Math.round((Date.now() - s.start) / 1000) : 0; let eta = 0;
  for (const r of rows) { if (r.status === "done" || r.status === "cached" || r.status === "failed") continue; const base = median(hist[r.name] || []) ?? DEFAULT_SEC[r.name] ?? 60;
    if (r.status === "running") { r.elapsed = elapsedOf(r); if (r.name === "art" && art) { eta += Math.max(0, art.total - art.done) * (art.perImage || 75); r.eta = Math.max(0, art.total - art.done) * (art.perImage || 75); } else { r.eta = Math.max(30, base - r.elapsed); eta += r.eta; } }
    else if (running || (t && !t.ended && !t.failed)) { r.eta = base; eta += base; } }
  const doneN = rows.filter(r => r.status === "done" || r.status === "cached").length, state = running ? "building" : t && t.failed ? "failed" : t && t.ended ? "done" : t ? "stopped" : "idle";
  return { state, failedAt: t && t.failed || null, stages: rows, doneCount: doneN, total: rows.length, pct: Math.round(100 * doneN / rows.length), etaSeconds: running ? Math.round(eta) : 0, etaAt: running ? new Date(Date.now() + eta * 1000).toISOString() : null, art, elapsedSeconds: t ? Math.round(((t.ended ? new Date(t.ended).getTime() : Date.now()) - new Date(t.started || Date.now()).getTime()) / 1000) : 0, log: lines.slice(-10), slug };
}

// the 7 days from `start` with their cards; days without cards stay empty (the UI offers "add topic")
export function week(start, runningJobs = []) {
  const s = validDate(start) ? start : todayIST(), data = load(), days = [];
  for (let i = 0; i < 7; i++) { const date = addDays(s, i), cards = data.cards.filter(c => c.date === date).sort((a, b) => (a.time || "").localeCompare(b.time || "")).map(c => ({ ...c, script: undefined, visuals: undefined, scriptSaved: undefined, visualsSaved: undefined, scriptChars: (c.script || "").length, visualsChars: (c.visuals || "").length, stages: stages(c, runningJobs) })); days.push({ date, cards }); }
  const all = days.flatMap(d => d.cards), n = f => all.filter(c => f(c.stages)).length;
  return { start: s, prev: addDays(s, -7), next: addDays(s, 7), today: todayIST(), days, counts: { cards: all.length, shorts: all.filter(c => c.format === "short").length, longs: all.filter(c => c.format === "long").length, script: n(x => x.script.done), visuals: n(x => x.visuals.done), video: n(x => x.video.done), published: n(x => x.published.done), scheduled: n(x => x.published.scheduled) } };
}
export const card = id => load().cards.find(c => c.id === id) || null;
export function upsert(c) {
  const data = load(), now = new Date().toISOString(); let cur = c.id ? data.cards.find(x => x.id === c.id) : null;
  if (!cur) { cur = { id: "w" + crypto.randomBytes(4).toString("hex"), createdAt: now, flags: {} }; data.cards.push(cur); }
  for (const k of ["date", "time", "format", "title", "source", "series", "script", "visuals", "slug", "check", "theme", "mood", "why", "belief", "regional", "planned"]) if (c[k] !== undefined) cur[k] = c[k];
  if (c.script !== undefined && c.script !== cur.scriptSaved) { cur.scriptSavedAt = now; cur.scriptSaved = c.script; } if (c.visuals !== undefined && c.visuals !== cur.visualsSaved) { cur.visualsSavedAt = now; cur.visualsSaved = c.visuals; }
  if (c.flags) cur.flags = { ...(cur.flags || {}), ...c.flags };
  if (cur.format !== "long") cur.format = "short"; cur.updatedAt = now; save(data); return cur;
}
export function remove(id) { const data = load(), n = data.cards.length; data.cards = data.cards.filter(c => c.id !== id); save(data); return n !== data.cards.length; }
