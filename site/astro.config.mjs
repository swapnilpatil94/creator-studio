import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
// Static site, deployed to Cloudflare (Workers static assets) at kathaaya.getbyterush.com. Posts with a future publishDate are left out of the build, so a scheduled rebuild publishes them.
export default defineConfig({
  site: process.env.SITE_URL || "https://kathaaya.getbyterush.com",
  integrations: [mdx(), sitemap({ i18n: { defaultLocale: "hi", locales: { hi: "hi-IN", en: "en", mr: "mr-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", gu: "gu-IN", es: "es", pt: "pt-BR", id: "id-ID" } } })],
  vite: { plugins: [tailwindcss()] },
  outDir: process.env.SITE_OUT || "./dist",   // the Hub's blog preview builds into .cache/blog-preview
  build: { format: "directory" },
  prefetch: true,
});