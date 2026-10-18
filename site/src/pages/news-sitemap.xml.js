import { getPublished } from "../lib/posts";
// Google News sitemap: only articles published within the last 2 days (Google's rule). Regenerated on every (scheduled) build.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export async function GET(context) { const cut = Date.now() - 2 * 864e5, posts = (await getPublished()).filter((p) => p.data.publishDate.getTime() >= cut);
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${posts.map((p) => `<url><loc>${new URL(`/blog/${p.id}/`, context.site).href}</loc><news:news><news:publication><news:name>KATHAAYA</news:name><news:language>hi</news:language></news:publication><news:publication_date>${p.data.publishDate.toISOString()}</news:publication_date><news:title>${esc(p.data.title)}</news:title></news:news></url>`).join("")}</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } }); }
