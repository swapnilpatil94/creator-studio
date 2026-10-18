import rss from "@astrojs/rss";
import { getPublished } from "../lib/posts";
export async function GET(context) { const posts = await getPublished(); return rss({ title: "कथाया (KATHAAYA)", description: "भारतीय कथाएँ, स्रोत के साथ", site: context.site, items: posts.map((p) => ({ title: p.data.title, pubDate: p.data.publishDate, description: p.data.description, link: `/blog/${p.id}/` })), customData: "<language>hi</language>" }); }
