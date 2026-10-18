#!/usr/bin/env node
// Runs every check the studio depends on and returns [{area, check, level: OK|WARN|FAIL, detail}]. Used by the Hub System tab and CLI. Read-only; no secrets are printed.
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), P = (...x) => path.join(root, ...x), J = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const sh = (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: "utf8", cwd: root, timeout: 120000, ...o });
const get = async (u, o = {}) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(15000), ...o }); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; } catch (e) { return { ok: false, status: 0, err: e.message }; } };
export async function systemCheck({ deep = false } = {}) {
  const out = [], add = (area, check, level, detail = "") => out.push({ area, check, level, detail: String(detail).slice(0, 300) });
  // tools
  for (const [n, c, a] of [["node", "node", ["-v"]], ["ffmpeg", "ffmpeg", ["-version"]], ["gh", "gh", ["--version"]], ["ollama", "ollama", ["--version"]]]) { const r = sh(c, a); add("tools", n, r.status === 0 ? "OK" : "FAIL", r.status === 0 ? (r.stdout || r.stderr).split("\n")[0] : "not installed"); }
  const gha = sh("gh", ["auth", "status"]); add("github", "gh logged in", gha.status === 0 ? "OK" : "FAIL", gha.status === 0 ? "" : "run gh auth login");
  const sec = sh("gh", ["secret", "list"]); const names = sec.stdout.split("\n").map(l => l.split("\t")[0]);
  for (const s of ["META_PAGE_TOKEN", "META_PAGE_ID", "META_IG_USER_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]) add("github", "secret " + s, names.includes(s) ? "OK" : "FAIL", names.includes(s) ? "" : "missing");
  add("github", "secret ANTHROPIC_API_KEY", names.includes("ANTHROPIC_API_KEY") ? "OK" : "WARN", names.includes("ANTHROPIC_API_KEY") ? "" : "not set: the writer uses the local Ollama model (weaker Hindi)");
  const def = sh("gh", ["repo", "view", "--json", "defaultBranchRef", "-q", ".defaultBranchRef.name"]).stdout.trim(), cur = sh("git", ["branch", "--show-current"]).stdout.trim();
  add("github", "workflows run on the default branch", def === cur ? "OK" : "WARN", `default=${def || "?"}, working branch=${cur}: scheduled workflows (post-due, weekly-plan, blog cron) only run from the default branch`);
  const runs = JSON.parse(sh("gh", ["run", "list", "--limit", "15", "--json", "name,conclusion,headBranch,createdAt"]).stdout || "[]"); const latest = {}; for (const r of runs) if (!latest[r.name]) latest[r.name] = r;
  for (const r of Object.values(latest)) add("github", "latest run " + r.name, r.conclusion === "success" ? "OK" : r.conclusion === "cancelled" || !r.conclusion ? "WARN" : "FAIL", `${r.conclusion || "running"} on ${r.headBranch}`);
  // local writer / art / voice
  const tags = await get("http://127.0.0.1:11434/api/tags"); add("writer", "Ollama running", tags.ok ? "OK" : "FAIL", tags.ok ? (tags.json.models || []).map(m => m.name).slice(0, 4).join(", ") : "start `ollama serve`");
  if (process.env.ANTHROPIC_API_KEY) add("writer", "Anthropic key (local env)", "OK"); else add("writer", "Anthropic key (local env)", "WARN", "not set: writer = local Ollama");
  const m = path.join(os.homedir(), "Documents/ComfyUI/models"); for (const f of ["diffusion_models/flux-2-klein-4b.safetensors", "text_encoders/qwen_3_4b.safetensors", "vae/flux2-vae.safetensors"]) add("images", "FLUX model " + path.basename(f), fs.existsSync(path.join(m, f)) ? "OK" : "FAIL", "");
  const py = path.join(os.homedir(), ".pyenv/versions/3.12.0/bin/python"); add("voice", "Chatterbox python", fs.existsSync(py) ? "OK" : "FAIL", py);
  add("voice", "Hindi voice cache", fs.existsSync(P("audio")) ? "OK" : "FAIL", "");
  const disk = sh("df", ["-k", root]).stdout.split("\n")[1].split(/\s+/); const freeGb = (+disk[3]) / 1048576; add("disk", "free space", freeGb > 30 ? "OK" : freeGb > 10 ? "WARN" : "FAIL", freeGb.toFixed(0) + " GB free (a long render needs 20 GB)");
  // meta
  const env = Object.fromEntries((fs.existsSync(P(".env.local")) ? fs.readFileSync(P(".env.local"), "utf8") : "").split("\n").map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, "")]));
  const tok = env.FB_PAGE_ACCESS_TOKEN || env.META_PAGE_TOKEN; if (!tok) add("meta", "page token (local)", "FAIL", "FB_PAGE_ACCESS_TOKEN missing in .env.local");
  else { const pg = await get(`https://graph.facebook.com/v25.0/${env.FB_PAGE_ID || "1354404841091894"}?fields=name&access_token=${tok}`); add("meta", "Facebook Page token", pg.ok ? "OK" : "FAIL", pg.ok ? pg.json.name : JSON.stringify(pg.json?.error?.message || pg.err)); const ig = await get(`https://graph.facebook.com/v25.0/${env.IG_USER_ID || "17841466674893791"}/content_publishing_limit?fields=quota_usage,config&access_token=${tok}`); add("meta", "Instagram publishing quota", ig.ok ? "OK" : "FAIL", ig.ok ? JSON.stringify(ig.json.data?.[0]) : JSON.stringify(ig.json?.error?.message || ig.err)); }
  const yt = ["yt-token.json", "studio-ui/yt-token.json"].map(f => P(f)).find(f => fs.existsSync(f)); add("youtube", "OAuth token file", yt ? "OK" : "WARN", yt ? "present (uploads of unaudited API projects stay private until Google audits the project)" : "no token file found: connect in /dash");
  // cloudflare + site
  const site = await get("https://kathaaya.getbyterush.com/"); add("site", "kathaaya.getbyterush.com live", site.ok ? "OK" : "FAIL", site.ok ? "" : "not serving yet (status " + site.status + "): the old kathaaya CNAME must be removed so the Worker domain can attach, then run blog-deploy");
  const wk = await get("https://kathaaya.66e3a32a28b258dbfc5f5f782de6718f.workers.dev/"); add("site", "stray workers.dev deploy", wk.status === 200 ? "WARN" : "OK", wk.status === 200 ? "a Worker 'kathaaya' exists from wrangler's auto-setup; it is replaced by the static deploy" : "");
  const sb = sh("npm", ["run", "build", "--prefix", P("site")]); add("site", "Astro build", sb.status === 0 ? "OK" : "FAIL", sb.status === 0 ? (/(\d+) page/.exec(sb.stdout) || [])[0] : sb.stderr.slice(-200));
  // content
  const t = sh("node", [P("tests/content-qa.test.mjs")]); add("content", "QA policy tests", t.status === 0 ? "OK" : "FAIL", t.status === 0 ? "" : (t.stdout + t.stderr).slice(-200));
  const t2 = sh("node", [P("tests/hub.test.mjs")]); add("content", "Hub backend tests", t2.status === 0 ? "OK" : "FAIL", t2.status === 0 ? "" : (t2.stdout + t2.stderr).slice(-200));
  const corp = fs.existsSync(P("research/corpus")) ? fs.readdirSync(P("research/corpus")).length : 0; add("content", "source corpus", corp ? "OK" : "FAIL", corp + " files");
  const q = sh("node", [P("tools/content/qa-content.mjs"), "--all"]); add("content", "QA gate on every item", q.status === 0 ? "OK" : "FAIL", (q.stdout + q.stderr).split("\n").filter(l => /FAIL/.test(l)).slice(0, 3).join(" | "));
  const sched = J(P("content/schedule.json"), []); const bad = sched.filter(e => ["failed", "missed"].includes(e.status)); add("schedule", "failed or missed posts", bad.length ? "FAIL" : "OK", bad.map(e => `${e.item}: ${e.error || e.status}`).slice(0, 3).join(" | "));
  const empty = (J(P("content/calendar.json"), {}).slots ? 1 : 0); add("schedule", "calendar loaded", empty ? "OK" : "FAIL", "");
  const qd = sched.filter(e => e.status === "queued").length; add("schedule", "queued posts", qd ? "OK" : "WARN", qd + " queued: " + (qd ? "" : "nothing is scheduled; the feeds will stay empty"));
  return out; }
if (process.argv[1] === fileURLToPath(import.meta.url)) { const r = await systemCheck(); if (process.argv.includes("--json")) { console.log(JSON.stringify(r)); process.exit(0); } for (const x of r) console.log(`${x.level.padEnd(4)} ${x.area}/${x.check}${x.detail ? "  " + x.detail : ""}`); const f = r.filter(x => x.level === "FAIL").length; console.log(`\n${r.length} checks, ${f} FAIL, ${r.filter(x => x.level === "WARN").length} WARN`); process.exit(f ? 1 : 0); }
