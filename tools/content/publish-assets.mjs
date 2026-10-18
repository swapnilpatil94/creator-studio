#!/usr/bin/env node
// Puts the public files Instagram needs onto the website, so Instagram can fetch them over HTTPS (it cannot take uploads for carousels or Reel covers):
//   carousel slides  content/out/<slug>/NN.jpg      -> site/public/c/<slug>/NN.jpg      (https://<domain>/c/<slug>/NN.jpg)
//   Reel/long cover  stories/<story>/output/thumb-*.png -> site/public/covers/<story>.jpg (https://<domain>/covers/<story>.jpg)
// The files are committed and pushed; the blog-deploy workflow then serves them (about 2 minutes). `--check` only tests whether they are live.
// usage: node tools/content/publish-assets.mjs carousel <slug> | cover <story> [9x16|16x9] | check <url...>
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), site = JSON.parse(fs.readFileSync(path.join(root, "blog/site.json"), "utf8")), PUB = path.join(root, "site/public");
export const domain = site.domain;
export function publishCarousel(slug) { const src = path.join(root, "content/out", slug), dst = path.join(PUB, "c", slug); if (!fs.existsSync(src)) throw new Error("render the carousel first: " + src); fs.mkdirSync(dst, { recursive: true }); const files = fs.readdirSync(src).filter(f => /^\d\d\.jpg$/.test(f)).sort(); if (!files.length) throw new Error("no slides in " + src); for (const f of files) fs.copyFileSync(path.join(src, f), path.join(dst, f)); return files.map(f => `${domain}/c/${slug}/${f}`); }
export function publishCover(story, ratio = "9x16") { const src = path.join(root, "stories", story, `output/thumb-${ratio}.png`), dst = path.join(PUB, "covers", story + ".jpg"); if (!fs.existsSync(src)) throw new Error("no cover yet: " + src); fs.mkdirSync(path.dirname(dst), { recursive: true }); const c = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-q:v", "3", dst]); if (c.status) throw new Error("ffmpeg failed"); return `${domain}/covers/${story}.jpg`; }
export async function live(url) { try { const r = await fetch(url, { method: "HEAD" }); return r.ok; } catch { return false; } }
export function commitAndPush(paths, msg, push = true) { const g = a => spawnSync("git", a, { cwd: root, encoding: "utf8" }); g(["add", ...paths]); const cm = g(["commit", "-m", msg, "--", ...paths]); if (!push) return { committed: cm.status === 0 }; const br = g(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim(), p = g(["push", "origin", br]);
  // the blog-deploy workflow only deploys main: when main is an ancestor of this branch (a plain fast-forward, nothing is overwritten) main is moved up too
  g(["fetch", "origin", "main"]); let toMain = false; if (br !== "main" && g(["merge-base", "--is-ancestor", "origin/main", "HEAD"]).status === 0) toMain = g(["push", "origin", "HEAD:main"]).status === 0;
  return { committed: cm.status === 0, pushed: p.status === 0, pushedToMain: toMain, branch: br, out: (p.stderr || p.stdout).slice(-200) }; }
if (process.argv[1] === fileURLToPath(import.meta.url)) { const [cmd, a, b] = process.argv.slice(2); try {
  if (cmd === "carousel") { const urls = publishCarousel(a); console.log(urls.join("\n")); console.log(JSON.stringify(commitAndPush([`site/public/c/${a}`], `Public slides for Instagram: ${a}`))); }
  else if (cmd === "cover") { const u = publishCover(a, b || "9x16"); console.log(u); console.log(JSON.stringify(commitAndPush([`site/public/covers/${a}.jpg`], `Public cover for Instagram: ${a}`))); }
  else if (cmd === "check") { for (const u of process.argv.slice(3)) console.log((await live(u)) ? "LIVE " : "404  ", u); }
  else { console.error("usage: carousel <slug> | cover <story> [ratio] | check <url...>"); process.exit(1); } } catch (e) { console.error(e.message); process.exit(1); } }
