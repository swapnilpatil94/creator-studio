---
name: flux-prompting-kathaaya
description: Use when writing prompts for FLUX.2 Klein (local) for KATHAAYA carousels, blog heroes or thumbnails. Official Black Forest Labs rules distilled (prose, subject first, lighting, hex colours) plus our brand style presets, the photoreal/negative-prompt house style, and sacred-imagery rules.
---
# FLUX.2 Klein prompting for KATHAAYA
Source of the rules: Black Forest Labs official docs (docs.bfl.ai prompting guide for FLUX.2) and their MIT-licensed agent skills (github.com/black-forest-labs/skills, `flux-image-best-practices`), read 2026-10-18. Our additions are marked **[ours]**.

## Rules that decide quality
1. **Prose, not tag lists.** Write like a novelist describing one scene. Klein does no prompt upsampling, so be descriptive yourself. 40-95 words (raised from 40-70 on 2026-10-20 when the photoreal medium grew).
2. **Word order = weight.** Subject first, then action/state, then style/medium, then setting, then lighting, then composition. Early words dominate.
3. **Lighting is the biggest lever.** Say where it comes from and how it feels ("low golden light from the left, soft rim glow on the river"). Confirmed by a direct A/B test (2026-10-21): adding cinematic/lighting/lens language to an otherwise-identical prompt was the single biggest swing from flat illustration to photoreal, bigger than step count.
4. **Negative prompts ARE used now [ours, revised 2026-10-20].** BFL's own doc rule is "say what you want instead, don't use negatives" and that's still right for the POSITIVE prompt -- but `tools/flux/prompt-director.mjs` also exports `NEG_QUALITY`, a real negative prompt (deformed face, plastic skin, cartoon, illustration, etc.) that every production caller (`tools/longform/art.mjs`, `tools/video/make-thumb.mjs`, `tools/flux/carousel-art.mjs`) now passes by default. It only takes effect when `cfg > 1` is also passed (Draw Things silently ignores `--negative-prompt` at the model's default CFG) -- the production default is `cfg: 2.2`, about 2x the generation time, adopted after faces/eyes/plastic-skin complaints.
5. **Hex colours go on objects**: "a shawl in color #A53A2F", never "use #A53A2F somewhere". Brand: ink #1A1512, antique gold #C79A3F, crimson #A53A2F, parchment #F2EAD9.
6. **Text inside images is unreliable in Klein.** Never ask the model for Devanagari; our renderer adds the words (carousel.mjs overlays text on the art).
7. **JSON prompts** (scene, subjects[description, position, action], style, color_palette, lighting, mood, composition) are for multi-subject or templated automation; the model reads JSON and prose equally. We build prose from structured fields.
8. Klein can take up to 4 reference images (style/character): useful later to keep one look across a series.
9. **No LoRA in production yet [ours, 2026-10-21].** Real FLUX.2-Klein-4B-compatible realism/skin-detail LoRAs exist on Civitai, but the ones checked carry non-commercial license terms that conflict with KATHAAYA's monetized use -- see planner/README.md's sibling note or ask the session that investigated this. Prompt engineering (this file) + cfg=2.2 already gets most of the way there without any licensing risk; a self-trained LoRA (BFL's own 60-minute Klein LoRA guide, trained on our own approved renders) is the clean path if more consistency is still wanted.

## Our style presets [ours]
- `photoreal` (**brand default since 2026-10-19**, owner spec: no painted look, sharp and real): "photoreal cinematic film still, 85mm portrait lens, strong directional key light, rich filmic color grade, natural shallow depth of field, hyperreal skin and fabric texture, subtle film grain, anatomically correct symmetric face, natural detailed eyes".
- `ravi-varma`: "oil painting in the style of Raja Ravi Varma, rich saturated pigments, soft chiaroscuro, ornate traditional dress, reverent and dignified".
- `pahari`: "Pahari miniature painting, flat jewel colours, delicate linework, ornamental detail".
- `ink-parchment` (painted style, available on request -- **no longer the thumbnail default**, superseded by `photoreal` on 2026-10-19): "hand-drawn black ink brushwork on warm aged parchment with visible grain, restrained crimson and antique gold accents, dramatic chiaroscuro".
- Carousel composition: subject in the upper two thirds, a calm darker lower third (the text panel sits there).

## Sacred imagery rules [ours]
Respectful, traditional iconography; modestly dressed figures; no weapons pointed at the viewer; no gore; no children in danger (use symbols: floating lamps, rivers, light); deities never in memes or jokes; every post using AI art carries `ai_art_disclosed: true` (QA enforces) and the caption/blog says "AI-निर्मित चित्र". A human looks at every generated image before approval (extra limbs, malformed hands, wrong attributes, stray text).
