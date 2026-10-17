// YouTube upload via OAuth 2.0 (loopback + PKCE). An API key can READ public data but CANNOT upload: videos.insert needs a user's OAuth consent.
// Needs in .env.local: YT_OAUTH_CLIENT_ID, YT_OAUTH_CLIENT_SECRET (Google Cloud console > Credentials > OAuth client "Desktop app" or "Web" with redirect http://127.0.0.1:4180/oauth2callback; enable YouTube Data API v3; add your Google account as a test user).
// Tokens are stored in .yt-token.json (gitignored, mode 600). Nothing here ever returns secrets to the browser.
// Uploads are private/unlisted only from this tool: projects created after 2020-07-28 that have not passed Google's API audit are restricted to private by YouTube anyway; make public in YouTube Studio.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), TOKEN = path.join(root, ".yt-token.json");
const env = () => { const f = path.join(root, ".env.local"); const t = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : ""; const g = n => process.env[n] || (t.match(new RegExp("^" + n + "=(\\S+)", "m")) || [])[1]; return { id: g("YT_OAUTH_CLIENT_ID"), secret: g("YT_OAUTH_CLIENT_SECRET") }; };
export const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];
let pending = null; // { verifier, state }
export const configured = () => { const e = env(); return !!(e.id && e.secret); };
export function authUrl(redirect) {
  const e = env(); if (!e.id) throw new Error("YT_OAUTH_CLIENT_ID missing in .env.local"); const verifier = crypto.randomBytes(48).toString("base64url"), state = crypto.randomBytes(16).toString("hex");
  pending = { verifier, state, redirect }; const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  for (const [k, v] of Object.entries({ client_id: e.id, redirect_uri: redirect, response_type: "code", scope: SCOPES.join(" "), access_type: "offline", prompt: "consent", state, code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" })) u.searchParams.set(k, v);
  return u.toString();
}
const saveTok = t => { fs.writeFileSync(TOKEN, JSON.stringify(t), { mode: 0o600 }); try { fs.chmodSync(TOKEN, 0o600); } catch {} };
const loadTok = () => fs.existsSync(TOKEN) ? JSON.parse(fs.readFileSync(TOKEN, "utf8")) : null;
async function tokenCall(body) { const e = env(); const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: e.id, client_secret: e.secret, ...body }) }); const j = await r.json(); if (!r.ok) throw new Error("oauth: " + (j.error_description || j.error)); return j; }
export async function exchange(code, state) {
  if (!pending || state !== pending.state) throw new Error("OAuth state mismatch (start the connection again from the dashboard)");
  const j = await tokenCall({ code, code_verifier: pending.verifier, grant_type: "authorization_code", redirect_uri: pending.redirect }); pending = null;
  saveTok({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in - 60) * 1000, scope: j.scope }); return true;
}
export const disconnect = () => { fs.rmSync(TOKEN, { force: true }); };
export async function accessToken() { const t = loadTok(); if (!t) throw new Error("not connected to YouTube"); if (Date.now() < t.expires_at) return t.access_token; if (!t.refresh_token) throw new Error("no refresh token; reconnect"); const j = await tokenCall({ grant_type: "refresh_token", refresh_token: t.refresh_token }); t.access_token = j.access_token; t.expires_at = Date.now() + (j.expires_in - 60) * 1000; saveTok(t); return t.access_token; }
export async function me() {
  const r = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", { headers: { authorization: "Bearer " + await accessToken() } }); const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || "channels.list failed");
  return (j.items || []).map(c => ({ id: c.id, title: c.snippet.title, handle: c.snippet.customUrl, subs: +c.statistics.subscriberCount, videos: +c.statistics.videoCount, views: +c.statistics.viewCount }));
}
export const connected = () => !!loadTok();
// Build the exact requests; dryRun returns them without any network call.
// privacy: private | unlisted | public. publishAt (ISO time, 15 min..6 months ahead) schedules: the video is uploaded private and YouTube flips it to public at that time.
// NOTE: YouTube forces videos uploaded through an API project that has not passed Google's compliance audit to stay PRIVATE whatever is requested; upload() reads the result back and reports it.
export function plan(pub, dir, { privacy = "private", publishAt = null } = {}) {
  if (!["private", "unlisted", "public"].includes(privacy)) throw new Error("privacy must be private, unlisted or public"); if (publishAt && !(new Date(publishAt) > new Date(Date.now() + 10 * 60000))) throw new Error("publishAt must be at least ~15 minutes in the future");
  if (!pub.video) throw new Error("no rendered video"); const file = path.join(dir, pub.video); if (!fs.existsSync(file)) throw new Error("video file missing: " + file);
  const body = { snippet: { title: pub.title, description: pub.description, tags: pub.tags, categoryId: pub.categoryId, defaultLanguage: pub.defaultLanguage, defaultAudioLanguage: pub.defaultAudioLanguage }, status: { privacyStatus: publishAt ? "private" : privacy, ...(publishAt ? { publishAt: new Date(publishAt).toISOString() } : {}), selfDeclaredMadeForKids: !!pub.selfDeclaredMadeForKids, containsSyntheticMedia: !!pub.containsSyntheticMedia } };
  const thumb = (pub.thumbnails || [])[0] ? path.join(dir, pub.thumbnails[0]) : null;
  return { file, bytes: fs.statSync(file).size, body, thumb, quotaUnits: 1600 + (thumb ? 50 : 0), endpoints: ["POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", thumb ? "POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=<id>" : null].filter(Boolean) };
}
export async function upload(pub, dir, { privacy = "private", publishAt = null, log = () => {} } = {}) {
  const pl = plan(pub, dir, { privacy, publishAt }), tok = await accessToken(); log("starting resumable upload (" + (pl.bytes / 1e6).toFixed(1) + " MB, " + privacy + ")");
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json; charset=UTF-8", "x-upload-content-length": String(pl.bytes), "x-upload-content-type": "video/mp4" }, body: JSON.stringify(pl.body) });
  if (!init.ok) throw new Error("upload init failed: " + (await init.text()).slice(0, 400)); const loc = init.headers.get("location"); if (!loc) throw new Error("no upload location returned");
  const put = await fetch(loc, { method: "PUT", headers: { "content-length": String(pl.bytes), "content-type": "video/mp4" }, body: fs.createReadStream(pl.file), duplex: "half" }); const txt = await put.text(); if (!put.ok) throw new Error("upload failed: " + txt.slice(0, 400));
  const v = JSON.parse(txt); log("uploaded: video id " + v.id);
  let thumbOk = null; if (pl.thumb) { thumbOk = await setThumbnail(v.id, pl.thumb, dir); log("thumbnail: " + thumbOk); }
  let actual = null; try { const rr = await (await fetch("https://www.googleapis.com/youtube/v3/videos?part=status&id=" + v.id, { headers: { authorization: "Bearer " + tok } })).json(); actual = rr.items && rr.items[0] && rr.items[0].status.privacyStatus; } catch {} if (actual && actual !== (publishAt ? "private" : privacy)) log("WARNING: YouTube set the video to " + actual + " (an unaudited API project is forced to private; flip it in Studio or pass the compliance audit)");
  return { id: v.id, url: "https://youtu.be/" + v.id, privacy: actual || privacy, requested: privacy, publishAt, thumbnail: thumbOk, uploaded: new Date().toISOString() };
}

// YouTube shows thumbnails 16:9 (search, channel page, Studio, suggested). A portrait (Shorts) image is composed onto a blurred fill of itself at 1280x720 so nothing is cropped; a 16:9 image is just scaled. JPEG under 2 MB.
export function composeThumb(src, jpg) {
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", src], { encoding: "utf8" }), [w, h] = probe.stdout.trim().split(",").map(Number);
  const fc = w / h > 1.5 ? "[0:v]scale=1280:720[o]" : "[0:v]split[a][b];[a]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,gblur=sigma=30,eq=brightness=-0.15[bg];[b]scale=-2:720[fg];[bg][fg]overlay=(W-w)/2:0[o]";
  for (const q of [3, 6, 10]) { const c = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-filter_complex", fc, "-map", "[o]", "-frames:v", "1", "-q:v", String(q), jpg], { encoding: "utf8" }); if (c.status !== 0) throw new Error("thumbnail convert failed: " + c.stderr.slice(0, 200)); if (fs.statSync(jpg).size < 1.9e6) return jpg; }
  return jpg;
}
export async function setThumbnail(videoId, src, dir) {
  try { const jpg = composeThumb(src, path.join(dir, "output/thumb-upload.jpg")), tok = await accessToken();
    const tr = await fetch("https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=" + videoId, { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "image/jpeg" }, body: fs.readFileSync(jpg) });
    return tr.ok ? "set" : "failed: " + (await tr.text()).slice(0, 300); } catch (e) { return "failed: " + e.message; }
}
