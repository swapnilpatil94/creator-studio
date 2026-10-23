#!/usr/bin/env node
// Post-build SEO / Google News verifier: reads the BUILT site (site/dist) and fails the deploy if a published page or a sitemap is malformed.
// usage (in CI after `npm run build`): node site/scripts/verify-seo.mjs [--days 7]    (checks every post published in the last N days; default all)
// FAIL = the deploy stops (the page would be invisible or invalid to Google); WARN = printed only.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist"), days = Number((process.argv.find((a, i) => process.argv[i - 1] === "--days")) || 0);
const fails = [], warns = [], F = (m) => fails.push(m), W = (m) => warns.push(m), read = f => fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
if (!fs.existsSync(dist)) { console.error("site/dist is missing: build first"); process.exit(2); }
// ---- sitemaps and robots ----
const idx = read(path.join(dist, "sitemap-index.xml")); if (!idx) F("sitemap-index.xml is missing"); else if (!/<sitemap>\s*<loc>/.test(idx)) F("sitemap-index.xml lists no sitemap");
const rob = read(path.join(dist, "robots.txt")); if (!rob) F("robots.txt is missing"); else { if (!/Sitemap:.*sitemap-index\.xml/.test(rob)) F("robots.txt does not point to sitemap-index.xml"); if (!/Sitemap:.*news-sitemap\.xml/.test(rob)) W("robots.txt does not point to news-sitemap.xml"); if (/Disallow:\s*\/\s*$/m.test(rob)) F("robots.txt disallows the whole site"); }
const news = read(path.join(dist, "news-sitemap.xml")); if (!news) F("news-sitemap.xml is missing");
else { const urls = [...news.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]); if (urls.length > 1000) F("news sitemap lists more than 1000 URLs");
  for (const u of urls) { const loc = (/<loc>([^<]+)<\/loc>/.exec(u) || [])[1]; for (const tag of ["news:name", "news:language", "news:publication_date", "news:title"]) if (!new RegExp(`<${tag}>[^<]+</${tag}>`).test(u)) F(`news sitemap entry ${loc}: <${tag}> missing`); const d = (/<news:publication_date>([^<]+)</.exec(u) || [])[1]; if (d && Date.now() - new Date(d) > 2.5 * 864e5) W(`news sitemap entry ${loc} is older than 2 days (Google ignores it)`); }
  console.log(`news-sitemap.xml: ${urls.length} entr${urls.length === 1 ? "y" : "ies"}`); }
// ---- every post page ----
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const pages = walk(path.join(dist, "blog")).filter(f => f.endsWith("index.html") && path.dirname(f) !== path.join(dist, "blog")), langDirs = fs.readdirSync(dist).filter(d => /^[a-z]{2}$/.test(d) && fs.existsSync(path.join(dist, d, "blog"))).flatMap(d => walk(path.join(dist, d, "blog")).filter(f => f.endsWith("index.html") && path.dirname(f) !== path.join(dist, d, "blog")));
let checked = 0;
for (const f of [...pages, ...langDirs]) { const html = fs.readFileSync(f, "utf8"), rel = path.relative(dist, f), ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { F(`${rel}: a JSON-LD block is not valid JSON`); return null; } }).filter(Boolean), art = ld.find(x => x["@type"] === "NewsArticle");
  if (!art) continue; const pub = new Date(art.datePublished); if (days && Date.now() - pub > days * 864e5) continue; checked++;
  if (!/<link rel="canonical" href="https?:\/\//.test(html)) F(`${rel}: no canonical link`); if ((html.match(/<h1[\s>]/g) || []).length !== 1) F(`${rel}: needs exactly one <h1> (found ${(html.match(/<h1[\s>]/g) || []).length})`);
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) F(`${rel}: has noindex`); if (!/<html[^>]*\blang="/.test(html)) F(`${rel}: <html lang> missing`); if (!/<meta name="description" content="[^"]{40,}/.test(html)) F(`${rel}: meta description missing or short`);
  if (!art.headline || [...art.headline].length > 110) F(`${rel}: NewsArticle headline missing or over 110 characters`); if (!art.datePublished || isNaN(pub)) F(`${rel}: NewsArticle datePublished missing or invalid`); if (!art.dateModified) F(`${rel}: NewsArticle dateModified missing`);
  if (!art.author || !art.author.name) F(`${rel}: NewsArticle author missing`); if (!art.publisher || !art.publisher.name || !art.publisher.logo || !art.publisher.logo.url) F(`${rel}: NewsArticle publisher or logo missing`);
  if (!art.image || !art.image.length) W(`${rel}: NewsArticle has no image (Discover needs a large image, at least 1200 px wide)`); if (!/<meta property="og:image"/.test(html)) W(`${rel}: no og:image`);
  const hasVid = /youtube(?:-nocookie)?\.com\/embed\/|data-id="[\w-]{11}"/.test(html); if (hasVid && !ld.some(x => x["@type"] === "VideoObject")) W(`${rel}: embeds a YouTube video but has no VideoObject JSON-LD`);
  if ([...(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").split(/\s+/).filter(Boolean))].length < 350) W(`${rel}: under 350 visible words`); }
console.log(`checked ${checked} post page(s)`); for (const w of warns) console.log("WARN " + w); for (const x of fails) console.log("FAIL " + x);
if (fails.length) { console.error(`SEO verification failed: ${fails.length} problem(s)`); process.exit(1); } console.log("SEO verification passed");
