# Prompt pack: take these to any model or tool (2026-10-18)

The studio makes visuals; scripts come from you. Use these prompts in the tool of your choice, paste the answer into the Hub, and the studio does the rest.

## 1. Art direction for one video (paste into Claude / GPT / Gemini, with the script)
```
You are the art director of a Hindi mythology channel (KATHAAYA). Read the script below. Design ONE unique visual identity for this video, not a template.
Return: (a) mood in 3 words; (b) a colour story: dominant hue, accent hue, light quality; (c) the background motif (choose one: mandala, flow-field, rangoli lattice, light rays, drifting ink, or invent one); (d) transition style between moments (dissolve, wipe, iris, zoom, or invent); (e) 10-14 "moments" in order, each with: the narration lines it covers, the best visual type (painting, kinetic typography, counter/stat, bar chart, timeline, relationship graph, versus panels, quote, 3D layer), and for paintings a one-sentence shot description (subject, action, setting, light; one or two figures; respectful traditional iconography; no text in the image; no negations).
Rules: every moment must look different from the previous one; use a number/chart/graph only when the script states real numbers or relationships; never add facts that are not in the script.
SCRIPT:
<paste the script>
```

## 2. Multilayer image plates (for Midjourney, FLUX, Ideogram or any image model)
Ask for three plates per scene so the studio can move them at different speeds (parallax):
```
Background plate: <place and sky of the moment>, wide 16:9, painterly oil style in the manner of Raja Ravi Varma, no figures, soft atmospheric depth, light from <direction>.
Midground plate: <architecture, trees, rocks of the moment> on a plain removable background, same light and palette.
Foreground subject plate: <character(s) and what they do>, full figure, plain flat grey background for easy cut-out, same light and palette.
```
(The studio's cut-out and depth step is not built yet: see docs/LONGFORM.md. Until then, plates can be used as separate pictures in successive beats.)

## 3. Modern carousel (slide-by-slide design brief)
```
Design a 9-slide Instagram carousel (1080x1350) for this mythology script, in a modern editorial style. Do not use the same layout twice in a row. For each slide give: slide purpose (hook, context, shock, map or family tree, "text says / tradition says" comparison, number, quote, source card, call to action), the layout (full-bleed painting with a bold headline; split screen; big number; relationship tree; timeline strip; pull quote; checklist), the headline (max 8 words, Devanagari), the support line (max 14 words), and a painting shot description if it uses art. Slide 1 must stop the scroll; the last slide must be a saveable summary plus one action.
SCRIPT:
<paste>
```

## 4. Prompt to improve the studio itself (give me this, I act on it)
"For video <name>: make the look more <mood>, add <component>, and keep every other video unchanged."
