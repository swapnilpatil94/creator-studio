import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Strict frontmatter for every post (also the contract for Google News markup in NewsSchema.astro).
export const postSchema = z.object({
  title: z.string().min(8).max(110),                         // Hindi headline, <= 110 chars (NewsArticle guidance)
  description: z.string().min(40).max(160),                   // meta description
  publishDate: z.coerce.date(),                               // ISO with time zone; a future date keeps the post out of the build until then
  updatedDate: z.coerce.date().optional(),
  author: z.string().default("KATHAAYA संपादकीय टीम"),
  hinglishKeywords: z.array(z.string()).default([]),          // e.g. ["Ganga katha", "Mahabharata story"]
  trendingEventConnection: z.string().optional(),             // the festival / tithi / anniversary / news peg that makes the piece timely
  section: z.enum(["itihasa", "puranas", "vrat-tyohar", "world"]).default("itihasa"),
  machineTranslated: z.boolean().default(false),               // translated by the studio's model from the Hindi original (shown as a label)
  heroImage: z.string().optional(),
  heroAlt: z.string().optional(),
  aiArt: z.boolean().default(false),                          // hero or inline art is AI-made: shown as a label
  traditionNote: z.string().optional(),
  sources: z.array(z.string()).default([]),
  videoId: z.string().optional(),                             // YouTube id of the matching video (must be public to play)
  draft: z.boolean().default(false),
});
export type PostFrontmatter = z.infer<typeof postSchema>;

const blog = defineCollection({ loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }), schema: postSchema });
export const collections = { blog };
