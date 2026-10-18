import rss from "@astrojs/rss";
import { getPublished, liveLangs, postSlug } from "../../lib/posts";
import { DEFAULT_LANG, LOCALES, langPath } from "../../i18n/config";
import { useT } from "../../i18n/ui";
export async function getStaticPaths() { return (await liveLangs()).map((l) => ({ params: { lang: l === DEFAULT_LANG ? undefined : l }, props: { lang: l } })); }
export async function GET(context) { const lang = context.props.lang, t = useT(lang), posts = await getPublished(lang);
  return rss({ title: lang === "hi" ? "कथाया (KATHAAYA)" : "KATHAAYA", description: t("tagline"), site: context.site, items: posts.map((p) => ({ title: p.data.title, pubDate: p.data.publishDate, description: p.data.description, link: langPath(lang, `/blog/${postSlug(p)}/`) })), customData: `<language>${LOCALES[lang].bcp}</language>` }); }
