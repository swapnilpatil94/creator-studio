#!/usr/bin/env node
// Is each planned day READY to post? Reads the Hub's week cards (content/weekplan.json) and the real files; writes content/readiness.json (the Hub and the GitHub issue read it).
// Local mode checks every gate on this Mac; --remote (GitHub Actions, no stories/ folder) trusts content/ship-state.json and verifies the GitHub Release exists.
// Gates: script (checker ok) -> video (built here) -> thumb -> copy (publish.json + social.json) -> shipped (GitHub Release has the mp4) -> scheduled (an entry in content/schedule.json) ; youtube (native scheduled upload) is a warning, not a blocker.
// usage: node tools/content/readiness.mjs [--from YYYY-MM-DD] [--days 14] [--need 7] [--remote] [--no-write]    exit code 1 when a day inside --need is not ready
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const J = (f, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(root, f), "utf8")); } catch { return d; } };
const addDays = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }, todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
export const tagOf = slug => `video-video-${slug}`;   // post-due downloads release "video-<story>" with the asset "<story>.mp4", and story = "video-<slug>"
function releaseHas(slug) { const r = spawnSync("gh", ["release", "view", tagOf(slug), "--json", "assets"], { cwd: root, encoding: "utf8" }); if (r.status !== 0) return false; try { return JSON.parse(r.stdout).assets.some(a => a.name === `video-${slug}.mp4`); } catch { return false; } }
export async function readiness({ from = todayIST(), days = 14, need = 7, remote = false } = {}) {
  const wkm = remote ? null : await import("../../studio-ui/week.mjs"), cards = (J("content/weekplan.json", { cards: [] }).cards || []), sched = J("content/schedule.json", []) || [], ship = J("content/ship-state.json", {}) || {}, out = [];
  for (let i = 0; i < days; i++) { const date = addDays(from, i), list = [];
    for (const c of cards.filter(x => x.date === date).sort((a, b) => (a.time || "").localeCompare(b.time || ""))) {
      const slug = c.slug || "", d = path.join(root, "stories", "video-" + slug), o = path.join(d, "output"), has = f => fs.existsSync(path.join(d, f)), outs = fs.existsSync(o) ? fs.readdirSync(o) : [], pr = []
      const g = { script: remote ? (!!(c.script || "").trim() && !!(c.check && c.check.ok)) : !!wkm.stages(c).script.done };
      if (!g.script) pr.push((c.script || "").trim() ? "the script was rejected by the checker" : "no script yet");
      if (!remote) { g.video = outs.some(f => /-upload\.mp4$/.test(f)); g.thumb = outs.some(f => /^thumb-(9x16|16x9)\.png$/.test(f)); g.copy = has("publish.json") && has("social.json"); if (!g.video) pr.push("video not built on this Mac"); else { if (!g.thumb) pr.push("no thumbnail"); if (!g.copy) pr.push("no publish.json / social.json"); } }
      const sh = ship[slug]; g.shipped = remote ? (slug ? releaseHas(slug) : false) : !!(sh && sh.tag); if (!g.shipped) pr.push("not shipped to GitHub (no release with the mp4)");
      const ents = sched.filter(e => (e.item || "").startsWith(`story:video-${slug}:`) && e.status !== "missed"), fbig = ents.some(e => (e.platforms || []).includes("facebook") || (e.platforms || []).includes("instagram")); g.scheduled = fbig; if (g.shipped && !g.scheduled) pr.push("no Facebook/Instagram entry in the schedule");
      const yt = !remote && has("upload.json") ? J(`stories/video-${slug}/upload.json`) : null, ytOk = remote ? !!(sh && sh.youtube) : !!(yt && yt.url); const warn = []; if (!ytOk) warn.push("YouTube upload not scheduled");
      const failedEntry = ents.find(e => e.status === "blocked" || e.status === "failed"); if (failedEntry) pr.push(`schedule entry ${failedEntry.id} is ${failedEntry.status}: ${String(failedEntry.error || "").slice(0, 100)}`);
      const required = remote ? ["script", "shipped", "scheduled"] : ["script", "video", "thumb", "copy", "shipped", "scheduled"], ready = required.every(k => g[k]) && !failedEntry;
      list.push({ id: c.id, slug, title: c.title, format: c.format || "short", time: c.time || "", gates: g, ready, problems: pr, warnings: warn }); }
    out.push({ date, cards: list, ready: list.some(x => x.ready), empty: !list.length }); }
  const needDates = out.slice(0, need), missing = needDates.filter(x => !x.ready).map(x => x.date);
  return { generated: new Date().toISOString(), mode: remote ? "remote" : "local", from, days, need, summary: { needed: needDates.length, ready: needDates.length - missing.length, missing, ok: !missing.length }, days: out };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const a = process.argv.slice(2), arg = (k, d) => a.includes(k) ? a[a.indexOf(k) + 1] : d, r = await readiness({ from: arg("--from", todayIST()), days: +arg("--days", 14), need: +arg("--need", 7), remote: a.includes("--remote") });
  if (!a.includes("--no-write")) fs.writeFileSync(path.join(root, "content/readiness.json"), JSON.stringify(r, null, 1));
  for (const d of r.days.slice(0, r.need)) { const c = d.cards[0]; console.log(d.date, d.ready ? "READY  " : (d.empty ? "EMPTY  " : "MISSING"), c ? `${c.slug || "-"} | ${c.problems.slice(0, 2).join("; ")}` : "no card planned for this day"); }
  console.log(`${r.summary.ready}/${r.summary.needed} of the next ${r.need} days are ready` + (r.summary.ok ? "" : "; missing: " + r.summary.missing.join(", "))); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Readiness (${r.mode})\n\n${r.summary.ready}/${r.summary.needed} days ready. Missing: ${r.summary.missing.join(", ") || "none"}\n`); process.exit(r.summary.ok ? 0 : 1); }
