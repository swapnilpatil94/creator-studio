---
name: flux-prompting-kathaaya
description: Use when writing prompts for FLUX.2 Klein (local) for KATHAAYA carousels, blog heroes or thumbnails. Official Black Forest Labs rules distilled (prose, subject first, lighting, no negative prompts, hex colours) plus our brand style presets and sacred-imagery rules.
---
# FLUX.2 Klein prompting for KATHAAYA
Source of the rules: Black Forest Labs official docs (docs.bfl.ai prompting guide for FLUX.2) and their MIT-licensed agent skills (github.com/black-forest-labs/skills, `flux-image-best-practices`), read 2026-10-18. Our additions are marked **[ours]**.

## Rules that decide quality
1. **Prose, not tag lists.** Write like a novelist describing one scene. Klein does no prompt upsampling, so be descriptive yourself. 40-70 words is the sweet spot for Klein; 30-80 generally.
2. **Word order = weight.** Subject first, then action/state, then style/medium, then setting, then lighting, then composition. Early words dominate.
3. **Lighting is the biggest lever.** Say where it comes from and how it feels ("low golden light from the left, soft rim glow on the river").
4. **No negative prompts.** Say what you want instead ("clean unmarked surfaces" not "no text"; "deserted riverbank" not "no people"; "natural skin" not "no makeup"). The prompt lint in `tools/flux/prompt-director.mjs` rejects "no / without / not / don't".
5. **Hex colours go on objects**: "a shawl in color #A53A2F", never "use #A53A2F somewhere". Brand: ink #1A1512, antique gold #C79A3F, crimson #A53A2F, parchment #F2EAD9.
6. **Text inside images is unreliable in Klein.** Never ask the model for Devanagari; our renderer adds the words (carousel.mjs overlays text on the art).
7. **JSON prompts** (scene, subjects[description, position, action], style, color_palette, lighting, mood, composition) are for multi-subject or templated automation; the model reads JSON and prose equally. We build prose from structured fields.
8. Klein can take up to 4 reference images (style/character): useful later to keep one look across a series.

## Our style presets [ours]
- `ravi-varma`: "oil painting in the style of Raja Ravi Varma, rich saturated pigments, soft chiaroscuro, ornate traditional dress, reverent and dignified".
- `pahari`: "Pahari miniature painting, flat jewel colours, delicate linework, ornamental detail".
- `ink-parchment` (brand default for thumbnails): "hand-drawn black ink brushwork on warm aged parchment with visible grain, restrained crimson and antique gold accents, dramatic chiaroscuro".
- Carousel composition: subject in the upper two thirds, a calm darker lower third (the text panel sits there).

## Sacred imagery rules [ours]
Respectful, traditional iconography; modestly dressed figures; no weapons pointed at the viewer; no gore; no children in danger (use symbols: floating lamps, rivers, light); deities never in memes or jokes; every post using AI art carries `ai_art_disclosed: true` (QA enforces) and the caption/blog says "AI-निर्मित चित्र". A human looks at every generated image before approval (extra limbs, malformed hands, wrong attributes, stray text).
