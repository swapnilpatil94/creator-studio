// Cloudflare Worker: instant, polite replies to comments on the Facebook Page and Instagram account (GitHub Actions is too slow for this).
// Meta webhook -> verify signature -> reply from templates (one short, human line) -> optionally hide spam. Replies only to top-level comments from other people, at most once per comment, and never more than MAX_PER_HOUR.
// Secrets (wrangler secret put): META_APP_SECRET, META_VERIFY_TOKEN, META_PAGE_TOKEN. Vars: PAGE_ID, IG_USER_ID. KV namespace: STATE. DRY_RUN=1 logs instead of replying.
// Setup (docs/AUTOMATION.md): deploy, then in the Meta app > Webhooks subscribe Page (feed) and Instagram (comments) to https://<worker>/webhook with META_VERIFY_TOKEN.
const G = "https://graph.facebook.com/v25.0", MAX_PER_HOUR = 40;
const REPLIES = ["धन्यवाद 🙏 आपकी बात हमें अच्छी लगी।", "आपने सही पकड़ा 🙏 अगली कथा में और गहराई से देखेंगे।", "आभार! कथा सेव कर लीजिए, आगे और आएँगी।"];
const SPAM = /(https?:\/\/|t\.me\/|whatsapp|telegram|loan|earn \$|crypto|dm me)/i;
async function hmac(secret, body) { const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const s = await crypto.subtle.sign("HMAC", k, body); return "sha256=" + [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function post(url, params, env) { const r = await fetch(url, { method: "POST", body: new URLSearchParams({ ...params, access_token: env.META_PAGE_TOKEN }) }); return r.ok; }
async function budget(env) { const k = "n:" + new Date().toISOString().slice(0, 13), n = +(await env.STATE.get(k) || 0); if (n >= MAX_PER_HOUR) return false; await env.STATE.put(k, String(n + 1), { expirationTtl: 7200 }); return true; }
export default { async fetch(req, env) {
  const u = new URL(req.url); if (u.pathname !== "/webhook") return new Response("ok");
  if (req.method === "GET") return u.searchParams.get("hub.verify_token") === env.META_VERIFY_TOKEN ? new Response(u.searchParams.get("hub.challenge")) : new Response("forbidden", { status: 403 });
  const raw = await req.arrayBuffer(); if ((await hmac(env.META_APP_SECRET, raw)) !== req.headers.get("x-hub-signature-256")) return new Response("bad signature", { status: 401 });
  const body = JSON.parse(new TextDecoder().decode(raw)); const jobs = [];
  for (const e of body.entry || []) { for (const c of e.changes || []) { const v = c.value || {};
    if (c.field === "feed" && v.item === "comment" && v.verb === "add" && v.from && v.from.id !== env.PAGE_ID && v.parent_id === v.post_id) jobs.push({ id: v.comment_id, text: v.message || "", kind: "fb" });
    if (c.field === "comments" && v.from && v.from.id !== env.IG_USER_ID && !v.parent_id) jobs.push({ id: v.id, text: v.text || "", kind: "ig" }); } }
  for (const j of jobs) { if (await env.STATE.get("seen:" + j.id)) continue; await env.STATE.put("seen:" + j.id, "1", { expirationTtl: 86400 * 14 });
    if (SPAM.test(j.text)) { if (env.DRY_RUN !== "1") await post(`${G}/${j.id}`, { is_hidden: "true" }, env); console.log("hidden spam", j.id); continue; }
    if (!(await budget(env))) { console.log("hourly budget reached"); continue; } const msg = REPLIES[Math.abs([...j.id].reduce((a, c) => a + c.charCodeAt(0), 0)) % REPLIES.length];
    if (env.DRY_RUN === "1") { console.log("would reply", j.id, msg); continue; } await post(j.kind === "fb" ? `${G}/${j.id}/comments` : `${G}/${j.id}/replies`, { message: msg }, env); }
  return new Response("ok"); } };
