#!/usr/bin/env node
// The overnight factory for KATHAAYA: look ahead bufferDays, build what is missing (every stage resumes from its cache), ship what is built, free disk for what is safe, flag every gap.
//   1. readiness for the next N days (script ok? video built? shipped? scheduled?)
//   2. a day with a script but no video is BUILT now (make-video resumes from its cache after a crash or a closed lid)
//   3. a built video that is not shipped is SHIPPED (Release + schedule entry; pushed only when ship.push is true)
//   4. cleanup of videos that are safe elsewhere
//   5. any day with no script, a failed build, or a failed platform is written to content/factory-state.json and shown as a macOS notification
// DRY RUN unless --run (and settings.enabled). usage: node tools/content/factory.mjs [--run] [--force]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), a = process.argv.slice(2), run = a.includes("--run"), force = a.includes("--force"), J = (f, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(root, f), "utf8")); } catch { return d; } }, W = (f, o) => fs.writeFileSync(path.join(root, f), JSON.stringify(o, null, 1));
const S = J("content/factory.json", {}), log = (...x) => console.log(new Date().toLocaleTimeString("en-GB"), ...x), lock = path.join(root, ".cache/autopilot.lock");
if (run && !S.enabled && !force) { log("autopilot is switched off in content/factory.json (enabled:false); nothing done"); process.exit(0); }
fs.mkdirSync(path.dirname(lock), { recursive: true }); if (run && fs.existsSync(lock) && Date.now() - fs.statSync(lock).mtimeMs < 12 * 3600e3) { log("another autopilot run is active (lock file younger than 12 h)"); process.exit(0); }
if (run) fs.writeFileSync(lock, String(process.pid)); const done = () => { try { fs.unlinkSync(lock); } catch {} };
const { readiness } = await import("./readiness.mjs"), pk = await import("../video/pack.mjs"), { makeVideo } = await import("../video/make-video.mjs"), wk = await import("../../studio-ui/week.mjs");
const busy = () => spawnSync("pgrep", ["-f", "make-video.mjs|reel-factory/src/cli.mjs|scripts/render.mjs"]).status === 0 && !a.includes("--ignore-busy");
const r0 = await readiness({ need: S.bufferDays || 7, days: S.bufferDays || 7 }), plan = r0.days.flatMap(d => d.cards.map(c => ({ ...c, date: d.date }))).filter(c => c.format !== undefined), gaps = [], actions = [];
for (const d of r0.days) if (d.empty) gaps.push(`${d.date}: no topic planned`);
for (const c of plan) { if (!c.gates.script) { gaps.push(`${c.date}: "${c.title}" has no script (write or paste one on the card)`); continue; } if (!c.gates.video) actions.push({ do: "build", c }); else if (!c.gates.shipped && S.ship && S.ship.enabled) actions.push({ do: "ship", c }); }
log(`${plan.length} cards in the next ${S.bufferDays} days; ${actions.filter(x => x.do === "build").length} to build, ${actions.filter(x => x.do === "ship").length} to ship, ${gaps.length} gap(s)`); for (const g of gaps) log("GAP", g); for (const x of actions) log(run ? "PLAN" : "WOULD", x.do, x.c.date, x.c.slug);
const t0 = Date.now(); let built = 0, shipped = 0; const errors = [];
if (run) {
  for (const x of actions.filter(x => x.do === "build")) { if ((Date.now() - t0) / 3600e3 > (S.maxBuildHours || 9)) { log("time budget used up; the rest continues on the next run"); break; } if (busy()) { log("another heavy job is running; stopping here"); break; }
    const c = wk.card(x.c.id), r = pk.parsePack(pk.joinPack(c.script, c.visuals || "")); if (!r.ok) { errors.push(`${c.date} ${c.slug}: script rejected: ${r.errors[0]}`); continue; } if (c.culture && !r.pack.culture) r.pack.culture = c.culture; const sv = pk.savePack(r.pack); wk.upsert({ id: c.id, slug: sv.slug });
    log("BUILD", c.date, sv.slug); try { await makeVideo(sv.id, { minutes: 3, log: l => process.stdout.write("   " + String(l).slice(0, 140) + "\n") }); built++; } catch (e) { errors.push(`${c.date} ${sv.slug}: build stopped: ${String(e.message).slice(0, 120)} (the next run resumes it)`); } }
  if (S.ship && S.ship.enabled) for (const x of actions.filter(x => x.do === "ship")) { const rr = await readiness({ need: 14, days: 14 }), cur = rr.days.flatMap(d => d.cards).find(q => q.id === x.c.id); if (!cur || !cur.gates.video || cur.gates.shipped) continue; log("SHIP", x.c.slug); const s = spawnSync("node", [path.join(root, "tools/content/ship.mjs"), x.c.slug, "--yes", ...(S.ship.push ? ["--push"] : []), "--platforms", (S.ship.platforms || ["facebook", "instagram"]).join(",")], { cwd: root, encoding: "utf8" }); if (s.status === 0) shipped++; else errors.push(`${x.c.date} ${x.c.slug}: ship failed: ${(s.stderr || s.stdout).trim().slice(-160)}`); }
  if (S.cleanup && S.cleanup.enabled) { const c = spawnSync("node", [path.join(root, "tools/content/cleanup.mjs"), "--yes", "--keep-newest", String(S.cleanup.keepNewest || 2)], { cwd: root, encoding: "utf8" }); log((c.stdout || "").trim().split("\n").pop()); }
  done();
}
const after = await readiness({ need: S.bufferDays || 7, days: S.bufferDays || 7 }), left = after.summary.missing; const state = { at: new Date().toISOString(), dry_run: !run, built, shipped, gaps, errors, days_ready_local: after.summary.ready + "/" + after.summary.needed, missing_days: left };
if (run || force) W("content/factory-state.json", state); log(JSON.stringify(state));
if (run && S.notify && (gaps.length || errors.length)) spawnSync("osascript", ["-e", `display notification "${(gaps.length + errors.length)} problem(s): ${[...gaps, ...errors][0].replace(/["\\]/g, "").slice(0, 120)}" with title "KATHAAYA autopilot"`]);
