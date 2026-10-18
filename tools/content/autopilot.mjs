#!/usr/bin/env node
// One-click content run, done by the studio's own writer model and tools (no hand-typed output):
//   topic -> sourced carousel draft (write-item + QA repair loop) -> model-written reel narration (QA-checked)
// The Hub continues with images (Flux), carousel render and the reel; a human approves before anything is scheduled.
// usage: node tools/content/autopilot.mjs [--slug s] [--query "english search words"] [--note "optional guidance"]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawn } from "node:child_process";
import { ask, writerName } from "./llm.mjs"; import { narrationBrief, parse } from "./paste.mjs"; import { run as qa } from "./qa-content.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), J = f => JSON.parse(fs.readFileSync(f, "utf8"));
export function nextTopic() { const t = J(path.join(root, "content/queue/topics.json")).topics; return t.find(x => ["idea", "qa_passed"].includes(x.status) && (x.formats || []).includes("carousel") && x.sensitivity !== "hold" && !fs.existsSync(path.join(root, "content/items", x.slug + ".carousel.json"))); }
const sh = (args, log) => new Promise((ok, no) => { const c = spawn("node", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: process.env }); let out = ""; const on = d => { out += d; d.toString().split("\n").filter(Boolean).forEach(l => log(l.slice(0, 200))); }; c.stdout.on("data", on); c.stderr.on("data", on); c.on("close", code => code === 0 ? ok(out) : no(new Error(path.basename(args[0]) + " exited " + code + ": " + out.slice(-300)))); });
export async function autopilot({ slug, query, note, log = console.log } = {}) {
  const topics = J(path.join(root, "content/queue/topics.json")).topics; let t = slug ? topics.find(x => x.slug === slug) : nextTopic(); if (!t) throw new Error(slug ? "unknown topic " + slug : "no topic is waiting: add topics in the Topics tab");
  if (note) { t.note = [t.note, note].filter(Boolean).join(" | "); const f = path.join(root, "content/queue/topics.json"), all = J(f); all.topics.find(x => x.slug === t.slug).note = t.note; fs.writeFileSync(f, JSON.stringify(all, null, 1)); }
  const file = path.join(root, "content/items", t.slug + ".carousel.json");
  if (!fs.existsSync(file)) { log(`writer ${writerName()} drafts the carousel "${t.title}" from the source passages`); await sh([path.join(root, "tools/content/write-item.mjs"), "--slug", t.slug, "--format", "carousel", "--query", query || t.query || t.title], log); } else log("carousel item exists, reusing it");
  const it = J(file); let fails = [];
  for (let round = 0; round < 3; round++) { log(`narration round ${round + 1}: writer ${writerName()} writes the 75-90 s voice-over`);
    const extra = fails.length ? `\n\nYour previous answer failed these checks, fix them:\n${fails.map(x => "- " + x).join("\n")}` : "";
    const raw = await ask("", narrationBrief(it) + extra); let r; try { r = parse("FORMAT: carousel\nSLUG: x\nNARRATION:\n" + raw.replace(/^[\s\S]*?(?=\n?\s*\d+[.)]|^\S)/, "").replace(/^\s*NARRATION:\s*/i, "")); } catch (e) { fails = ["format: " + e.message + " (one numbered line per slide, Devanagari only)"]; continue; }
    it.narration = r.narration; const q = qa(it).filter(x => x.level === "FAIL"), words = it.narration.reduce((a, x) => a + x.text.split(/\s+/).filter(Boolean).length, 0);
    fails = q.map(x => `${x.code}: ${x.msg}`); if (it.narration.length !== (it.slides || []).length) fails.push(`need exactly ${it.slides.length} lines, got ${it.narration.length}`); if (words < 230 || words > 310) fails.push(`${words} words; need 250-295`);
    if (!fails.length) { it.status = "draft"; fs.writeFileSync(file, JSON.stringify(it, null, 1)); log(`narration ok: ${words} words, about ${Math.round(words / 3.3)} s`); return { id: it.id, slug: it.slug, words }; } log("narration failed: " + fails.join("; ")); }
  fs.writeFileSync(file, JSON.stringify(it, null, 1)); throw new Error("narration did not pass after 3 rounds: " + fails.join("; ")); }
if (process.argv[1] === fileURLToPath(import.meta.url)) { const a = process.argv.slice(2), g = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : undefined; }; autopilot({ slug: g("--slug"), query: g("--query"), note: g("--note") }).then(r => console.log("done", r), e => { console.error("FAILED:", e.message); process.exit(1); }); }
