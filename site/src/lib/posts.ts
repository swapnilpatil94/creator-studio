import { getCollection, type CollectionEntry } from "astro:content";
export const SECTIONS: Record<string, { hi: string; en: string; blurb: string }> = {
  itihasa: { hi: "इतिहास", en: "ITIHASA", blurb: "महाभारत और रामायण की कथाएँ, स्रोत के साथ" },
  puranas: { hi: "पुराण", en: "PURANAS", blurb: "देवी-देवताओं की कथाएँ और उनके भिन्न मत" },
  "vrat-tyohar": { hi: "व्रत और त्योहार", en: "VRAT & TYOHAR", blurb: "तिथि, पर्व और परंपरा का अर्थ" },
};
// Published = not a draft and publishDate has passed (a future date is a scheduled post: the next scheduled build releases it).
export async function getPublished(): Promise<CollectionEntry<"blog">[]> {
  const all = await getCollection("blog"), now = Date.now();
  return all.filter((p) => !p.data.draft && (import.meta.env.DEV || p.data.publishDate.getTime() <= now)).sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}
export const readingMinutes = (body = "") => Math.max(2, Math.round(body.split(/\s+/).filter(Boolean).length / 170));
export const fmtDate = (d: Date) => d.toLocaleDateString("hi-IN", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" });
