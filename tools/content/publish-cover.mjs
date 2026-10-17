#!/usr/bin/env node
// Copies a story's 9:16 cover to blog/public/covers/<story>.jpg (committed) so the deployed blog serves it at https://<domain>/covers/<story>.jpg: Instagram's cover_url must be a public address.
// usage: node tools/content/publish-cover.mjs <story> [9x16|16x9]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), [story, r = "9x16"] = process.argv.slice(2), src = path.join(root, "stories", story, `output/thumb-${r}.png`), dst = path.join(root, "blog/public/covers", story + ".jpg");
if (!story || !fs.existsSync(src)) { console.error("usage: publish-cover.mjs <story> [9x16|16x9]; missing " + src); process.exit(1); }
fs.mkdirSync(path.dirname(dst), { recursive: true }); const c = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-q:v", "3", dst]); if (c.status) process.exit(1); console.log("wrote", path.relative(root, dst), (fs.statSync(dst).size / 1024).toFixed(0) + " KB");
