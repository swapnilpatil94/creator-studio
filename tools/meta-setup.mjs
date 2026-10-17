#!/usr/bin/env node
// One-time Meta connection helper. You give it three things; it finds the rest and writes .env.local (never printed).
//   node tools/meta-setup.mjs --app-id <APP_ID> --app-secret <APP_SECRET> --user-token <SHORT_LIVED_USER_TOKEN> [--page "<Page name>"]
// The user token comes from developers.facebook.com/tools/explorer (see docs/META_SETUP.md). The script:
//   1 exchanges it for a long-lived user token (~60 days), 2 lists your Pages with their Page tokens (a Page token made from a long-lived user token does not expire),
//   3 finds the Instagram professional account linked to the chosen Page, 4 saves META_PAGE_ID, META_PAGE_TOKEN, META_IG_USER_ID (and META_APP_ID/SECRET for refresh) in .env.local (mode 600).
import fs from "node:fs"; import path from "node:path";
const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null; }, V = "v25.0", G = `https://graph.facebook.com/${V}`, root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const appId = arg("--app-id"), secret = arg("--app-secret"), short = arg("--user-token"), want = arg("--page");
if (!appId || !secret || !short) { console.error("usage: node tools/meta-setup.mjs --app-id ID --app-secret SECRET --user-token TOKEN [--page NAME]"); process.exit(1); }
const j = async (u) => { const r = await fetch(u); const t = await r.json(); if (!r.ok) throw new Error(JSON.stringify(t.error || t).slice(0, 300)); return t; };
const ll = await j(`${G}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${secret}&fb_exchange_token=${short}`);
const pages = (await j(`${G}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=50&access_token=${ll.access_token}`)).data || [];
if (!pages.length) { console.error("No Pages returned. The user token needs pages_show_list and you must be an admin of the Page (see docs/META_SETUP.md)."); process.exit(1); }
console.log("Pages found:"); pages.forEach(p => console.log(` - ${p.name} (${p.id}) Instagram: ${p.instagram_business_account ? "@" + p.instagram_business_account.username : "none linked"}`));
const pg = want ? pages.find(p => p.name.toLowerCase() === want.toLowerCase()) : pages.length === 1 ? pages[0] : null; if (!pg) { console.error("Several Pages: re-run with --page \"<exact name>\"."); process.exit(1); }
const f = path.join(root, ".env.local"), keep = fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(l => l && !/^META_/.test(l)) : [];
fs.writeFileSync(f, [...keep, `META_APP_ID=${appId}`, `META_APP_SECRET=${secret}`, `META_PAGE_ID=${pg.id}`, `META_PAGE_TOKEN=${pg.access_token}`, `META_IG_USER_ID=${pg.instagram_business_account ? pg.instagram_business_account.id : ""}`].join("\n") + "\n", { mode: 0o600 });
console.log(`Saved for Page "${pg.name}". Instagram: ${pg.instagram_business_account ? "@" + pg.instagram_business_account.username : "NOT linked (link it in Instagram settings > Accounts Center / Page settings, then re-run)"}. Long-lived user token expires in ~${Math.round((ll.expires_in || 0) / 86400)} days.`);
