import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
// Static site, deployed to Cloudflare (Workers static assets) at kathaaya.getbyterush.com. Posts with a future publishDate are left out of the build, so a scheduled rebuild publishes them.
export default defineConfig({
  site: process.env.SITE_URL || "https://kathaaya.getbyterush.com",
  integrations: [mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  build: { format: "directory" },
  prefetch: true,
});