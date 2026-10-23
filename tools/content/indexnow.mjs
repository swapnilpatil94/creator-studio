#!/usr/bin/env node
// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver, Yep) about every post published or updated in the last 2 days, right after a deploy (GitHub Actions: blog-deploy).
// Honest scope: Google does NOT take IndexNow. Google finds posts through the sitemaps (sitemap-index.xml and news-sitemap.xml, both in robots.txt and, once, in Search Console), and Google's own ping endpoint was retired in 2023.
// The key is public by design: IndexNow proves ownership by serving the same text at https://<host>/<key>.txt (site/public/5c17a2f4740618763f1fd186e34a21b9.txt).
// usage: node tools/content/indexnow.mjs [--dry]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), HOST = "kathaaya.getbyterush.com", KEY = "5c17a2f4740618763f1fd186e34a21b9", dry = process.argv.includes("--dry");
const urls = new Set(), cut = Date.now() - 2.2 * 864e5;
const news = path.join(root, "site/dist/news-sitemap.xml"); if (fs.existsSync(news)) for (const m of fs.readFileSync(news, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1]);
const dir = path.join(root, "site/src/content/blog"), walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
if (fs.existsSync(dir)) for (const f of walk(dir).filter(x => /\.mdx?$/.test(x))) { const t = fs.readFileSync(f, "utf8"), up = (/^updatedDate:\s*(.+)$/m.exec(t) || [])[1], pu = (/^publishDate:\s*(.+)$/m.exec(t) || [])[1], d = new Date(up || pu); if (d.getTime() > cut && d.getTime() < Date.now() + 6e4) { const rel = path.relative(dir, f).replace(/\.mdx?$/, ""), parts = rel.split(path.sep), lang = parts.length > 1 ? parts[0] + "/" : "", slug = parts[parts.length - 1]; urls.add(`https://${HOST}/${lang}blog/${slug}/`); } }
const list = [...urls]; console.log(list.length + " URL(s) to submit"); if (!list.length || dry) { for (const u of list) console.log("  " + u); process.exit(0); }
const r = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: list }) });
console.log("IndexNow answered " + r.status + (r.status === 200 || r.status === 202 ? " (accepted)" : " " + (await r.text()).slice(0, 200))); process.exit(r.status === 200 || r.status === 202 ? 0 : 0);
