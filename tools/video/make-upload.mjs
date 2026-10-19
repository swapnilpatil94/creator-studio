#!/usr/bin/env node
// The file every platform uploader sends: stories/<name>/output/<name>-upload.mp4 = the full-quality master when its bitrate is sane (<= 12 Mbps), else the master re-encoded to H.264 high at ~10-12 Mbps (1080 wide, AAC 192k).
// The 720p "-share.mp4" (about 0.4-2.6 Mbps) is only for quick previews and chat: it must never be uploaded (it was, once: Durga 8:17 went out at 720x406).
// usage: node tools/video/make-upload.mjs stories/<name>
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process";
const dir = path.resolve(process.argv[2] || "."), name = path.basename(dir), out = path.join(dir, "output"), master = path.join(out, name + ".mp4"), up = path.join(out, name + "-upload.mp4");
if (!fs.existsSync(master)) { console.error("no master video: " + master); process.exit(1); }
const pr = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=bit_rate,width,height:format=bit_rate", "-of", "json", master], { encoding: "utf8" }), j = JSON.parse(pr.stdout), br = Number(j.streams[0].bit_rate || j.format.bit_rate || 0);
if (fs.existsSync(up) && fs.statSync(up).mtimeMs >= fs.statSync(master).mtimeMs) { console.log("upload copy is current:", path.relative(dir, up)); process.exit(0); }
fs.rmSync(up, { force: true });
if (br && br <= 12e6) { try { fs.linkSync(master, up); } catch { fs.copyFileSync(master, up); } console.log(`master is ${(br / 1e6).toFixed(1)} Mbps: used as the upload copy`); }
else { const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", master, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", up], { encoding: "utf8" }); if (r.status !== 0) { console.error(r.stderr.slice(-300)); process.exit(1); } console.log(`master was ${(br / 1e6).toFixed(0)} Mbps: re-encoded to ${(fs.statSync(up).size / 1e6).toFixed(0)} MB (${j.streams[0].width}x${j.streams[0].height})`); }
