---
name: kathaaya-blog-design
description: KATHAAYA blog (site/, kathaaya.getbyterush.com) visual design system -- tokens, typography, components and the contrast rule that bit us once. Use before touching site/src/styles or site/src/components, or when adding a new page/component to the blog.
---
# KATHAAYA blog design

The blog is already a strong, premium editorial design -- parchment-manuscript by day, temple-night by
dusk. **Don't redesign it.** Extend it with the same tokens and components below, and it stays coherent.

## The feeling
"A manuscript someone lit a lamp beside." Not a generic dark-SaaS theme, not a cartoon-temple theme.
Reference points already in the codebase: the drop cap on every article's first paragraph
(`.prose-hi > p:first-of-type::first-letter`), the "at a glance" KeyFacts card grid (source, reading
time, topic, source-checked), the dual Devanagari-headline-plus-Latin-eyebrow pattern on every title.

## Theme tokens (site/src/styles/global.css)
Two themes, `:root` (light/"parchment") and `[data-theme="dark"]` ("temple-night"), switched by
`ThemeToggle.astro`. Never hardcode a color in a component -- use the token so both themes stay correct:
- `--bg` / `--bg2`: page background, two shades for gradient depth.
- `--fg`: body text (15.5:1 contrast in light mode -- excellent, keep it that way).
- `--muted`: secondary text (captions, bylines). 5.5:1+ in both themes -- fine for body-size secondary text.
- `--gold` / `--accent`: the brand accent. Used at **headline/decorative size** (h2/h3, rules, hover
  borders, the drop cap) where WCAG's 3:1 "large text" threshold applies and it passes.
- `--chip-fg`: **small gold text** (chips, the `.dual > .en` eyebrow label) needs the full 4.5:1 AA
  threshold, and raw `--gold` only hits ~3:1 in light mode. `--chip-fg` is a darker bronze for exactly
  this case (5:1+ in both themes). This is a real bug we found and fixed (2026-10-20): raw `--gold` on
  small text looked elegant to the eye but failed a measured contrast check. Any new small-text-on-gold
  use should use `--chip-fg`, not `--gold` directly.
- `--card` / `--card-solid`: card backgrounds (translucent vs solid -- translucent for glass-morphism
  over the hero's decorative mandala background, solid for KeyFacts/quote cards that need to read
  cleanly over any image).
- `--line`: borders, always a tint of gold/accent, never flat gray -- keeps the "manuscript" feeling
  even in structural chrome.

## Typography
- `--font-display` (Rozha One + Noto Sans Devanagari): headlines only. A serif with real editorial
  weight; don't use it for body copy or UI chrome, it gets fussy at small sizes.
- `--font-body` (Noto Sans Devanagari + Poppins): article body text.
- `--font-latin`: UI chrome, eyebrows, metadata, buttons -- anything that's Latin-script-first even on
  a Hindi page (dates in Devanagari numerals still use this for the surrounding label text).
- Devanagari at small sizes needs more line-height than Latin to keep matras/conjuncts from colliding --
  the existing `line-height: 1.5`+ on body and UI text is deliberate, don't tighten it for "cleanliness."

## Components already built -- reuse, don't reinvent
- `KeyFacts.astro`: the "at a glance" fact-card grid under an article's lede.
- `PullQuote.astro`, `Callout.astro`: in-article emphasis blocks.
- `Timeline.astro`, `MapSlider.astro`, `MythologyQuiz.astro`: richer in-article interactives for longer
  pieces -- reach for these before inventing a new one-off layout.
- `NewsSchema.astro`: emits the NewsArticle + BreadcrumbList JSON-LD. Every post route must render it;
  it's what makes the technical SEO audit (2026-10-20) come back clean (headline, author, publisher with
  a 512x512 logo, citation, inLanguage all present).
- `.chip`: the pill badge (category tags, "AI art" labels, the hero eyebrow). Background `--gold-soft`,
  text `--chip-fg` (see above).
- `.dual`: the headline pattern of a Devanagari title with a small uppercase Latin subtitle beneath it
  (`.dual > .en`). Use for any new title treatment instead of a bespoke one.

## Before shipping a new page or component
1. Check it in **both** themes (light default, dark via the sun/moon toggle) -- a token used correctly
   makes this automatic, but verify anyway.
2. Check it at **phone width** (375px) first -- most readers arrive from a social link on a phone.
3. Any new small text (<1rem) on a colored background: compute its contrast ratio before shipping
   (`(L1+0.05)/(L2+0.05)` on relative luminance), not just eyeballing it -- `--gold` at headline size and
   `--gold` at chip size are not the same call, which is exactly how this skill's example bug happened.
4. Respect `@media (prefers-reduced-motion: reduce)` -- already wired globally; don't add an animation
   that ignores it.
