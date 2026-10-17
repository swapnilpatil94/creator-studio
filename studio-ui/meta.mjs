// Instagram + Facebook publishing through the Meta Graph API. UNTESTED against live accounts (no credentials supplied yet): everything runs as a dry run that shows the exact requests until the three values below exist in .env.local.
//   META_PAGE_ID        Facebook Page id
//   META_PAGE_TOKEN     long-lived PAGE access token (pages_manage_posts, pages_read_engagement; for Instagram also instagram_basic, instagram_content_publish)
//   META_IG_USER_ID     Instagram professional account id linked to that Page
// Facebook Reels are uploaded as DRAFT by default (you publish from Meta Business Suite); Instagram has no draft state in the API, so an IG upload publishes immediately and needs confirm:true.
// Nothing here prints a token. Graph version is pinned below: check Meta's changelog before first use.
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), V = "v21.0", G = `https://graph.facebook.com/${V}`;
const env = () => { const o = {}; try { for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) o[m[1]] = m[2].replace(/^['"]|['"]$/g, ""); } } catch {} return { ...o, ...process.env }; };
export const status = () => { const e = env(); return { facebook: !!(e.META_PAGE_ID && e.META_PAGE_TOKEN), instagram: !!(e.META_PAGE_TOKEN && e.META_IG_USER_ID), missing: ["META_PAGE_ID", "META_PAGE_TOKEN", "META_IG_USER_ID"].filter(k => !e[k]) }; };
export function plan(social, dir, which) {
  const file = p => path.join(dir, p), vid = social.video || null, ig = social.instagram, fb = social.facebook, out = {};
  if (which.includes("facebook") && fb) out.facebook = fb.type === "REELS" ? { steps: [`POST ${G}/{PAGE_ID}/video_reels  upload_phase=start`, "POST {upload_url from step 1}  binary video, headers offset/file_size", `POST ${G}/{PAGE_ID}/video_reels  upload_phase=finish, video_state=DRAFT, description=<below>`], description: fb.description } : { steps: [`POST https://graph-video.facebook.com/${V}/{PAGE_ID}/videos  source=<file>, title, description, published=false`], title: fb.title, description: fb.description };
  if (which.includes("instagram") && ig && ig.type === "REELS") out.instagram = { steps: [`POST ${G}/{IG_USER_ID}/media  media_type=REELS, upload_type=resumable, caption, share_to_feed, (cover via cover_url needs a public URL: not sent)`, "POST {uri from step 1}  binary video, headers offset/file_size", "GET {container}?fields=status_code until FINISHED", `POST ${G}/{IG_USER_ID}/media_publish  creation_id`], caption: ig.caption, publishesImmediately: true };
  return { video: vid, ...out };
}
async function post(url, body, headers = {}) { const r = await fetch(url, { method: "POST", headers, body }); const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`); try { return JSON.parse(t); } catch { return t; } }
export async function uploadFacebook(fb, videoFile, log = () => {}) {
  const e = env(), tok = e.META_PAGE_TOKEN, page = e.META_PAGE_ID, size = fs.statSync(videoFile).size;
  if (fb.type === "VIDEO") { const f = new FormData(); f.append("access_token", tok); f.append("title", fb.title); f.append("description", fb.description); f.append("published", "false"); f.append("source", new Blob([fs.readFileSync(videoFile)]), path.basename(videoFile)); const j = await post(`https://graph-video.facebook.com/${V}/${page}/videos`, f); log("facebook video id " + j.id + " (unpublished)"); return { id: j.id, state: "unpublished" }; }
  const s = await post(`${G}/${page}/video_reels`, new URLSearchParams({ upload_phase: "start", access_token: tok })); log("facebook reel session " + s.video_id);
  await post(s.upload_url, fs.readFileSync(videoFile), { Authorization: "OAuth " + tok, offset: "0", file_size: String(size) });
  const f = await post(`${G}/${page}/video_reels`, new URLSearchParams({ upload_phase: "finish", video_id: s.video_id, video_state: "DRAFT", description: fb.description, access_token: tok })); log("facebook reel draft saved"); return { id: s.video_id, state: "draft", result: f };
}
export async function uploadInstagram(ig, videoFile, log = () => {}) {
  const e = env(), tok = e.META_PAGE_TOKEN, user = e.META_IG_USER_ID, size = fs.statSync(videoFile).size;
  const c = await post(`${G}/${user}/media`, new URLSearchParams({ media_type: "REELS", upload_type: "resumable", caption: ig.caption, share_to_feed: String(!!ig.shareToFeed), access_token: tok })); log("instagram container " + c.id);
  await post(c.uri, fs.readFileSync(videoFile), { Authorization: "OAuth " + tok, offset: "0", file_size: String(size) });
  for (let i = 0; i < 60; i++) { const r = await (await fetch(`${G}/${c.id}?fields=status_code&access_token=${tok}`)).json(); log("instagram status " + r.status_code); if (r.status_code === "FINISHED") break; if (r.status_code === "ERROR") throw new Error("instagram processing error"); await new Promise(s => setTimeout(s, 5000)); }
  const p = await post(`${G}/${user}/media_publish`, new URLSearchParams({ creation_id: c.id, access_token: tok })); log("instagram published " + p.id); return { id: p.id };
}
