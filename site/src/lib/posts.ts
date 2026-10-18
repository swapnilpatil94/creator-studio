import { getCollection, type CollectionEntry } from "astro:content";
import { DEFAULT_LANG, LANGS, isLang } from "../i18n/config";
import { useT, type UiKey } from "../i18n/ui";
export const SECTION_KEYS = ["itihasa", "puranas", "vrat-tyohar", "world"] as const;
export const SECTION_UI: Record<string, { name: UiKey; blurb: UiKey; en: string }> = {
  itihasa: { name: "itihasa", blurb: "itihasaBlurb", en: "ITIHASA" }, puranas: { name: "puranas", blurb: "puranasBlurb", en: "PURANAS" },
  "vrat-tyohar": { name: "vratTyohar", blurb: "vratTyoharBlurb", en: "VRAT & TYOHAR" }, world: { name: "world", blurb: "worldBlurb", en: "WORLD MYTHOLOGY" },
};
export const section = (lang: string, k: string) => { const t = useT(lang), s = SECTION_UI[k]; return { name: t(s.name), blurb: t(s.blurb), en: s.en }; };
// Posts live in src/content/blog/<slug>.mdx (Hindi, the source) and src/content/blog/<lang>/<slug>.mdx (AI translations).
export type Post = CollectionEntry<"blog">;
export const postLang = (p: Post) => { const h = p.id.split("/")[0]; return p.id.includes("/") && isLang(h) ? h : DEFAULT_LANG; };
export const postSlug = (p: Post) => p.id.replace(/^[a-z]{2}\//, "");
// Published = not a draft and publishDate has passed (a future date is a scheduled post: the next scheduled build releases it).
export async function allPublished(): Promise<Post[]> {
  const all = await getCollection("blog"), now = Date.now();
  return all.filter((p) => !p.data.draft && (import.meta.env.DEV || p.data.publishDate.getTime() <= now)).sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}
export async function getPublished(lang = DEFAULT_LANG): Promise<Post[]> { return (await allPublished()).filter((p) => postLang(p) === lang); }
// Languages that have at least one published post: only these get pages and appear in the language switcher.
export async function liveLangs(): Promise<string[]> { const all = await allPublished(), have = new Set(all.map(postLang)); return LANGS.filter((l) => have.has(l)); }
export const readingMinutes = (body = "") => Math.max(2, Math.round(body.split(/\s+/).filter(Boolean).length / (body.match(/[ऀ-෿]/g)?.length ? 170 : 220)));
export const fmtDate = (d: Date, lang = DEFAULT_LANG) => { try { return d.toLocaleDateString(lang === "hi" ? "hi-IN" : lang, { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" }); } catch { return d.toISOString().slice(0, 10); } };
