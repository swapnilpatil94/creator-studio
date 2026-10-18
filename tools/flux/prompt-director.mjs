// Builds FLUX.2 Klein prompts from structured shot specs (skill: flux-prompting-kathaaya) and lints them against the official rules.
// shot = { subject, action, medium: "ravi-varma"|"pahari"|"ink-parchment", setting, lighting, mood, colors: [{object, hex}], composition }
export const MEDIUM = {
  "ravi-varma": "oil painting in the style of Raja Ravi Varma, rich pigments, soft chiaroscuro, reverent",
  pahari: "Pahari miniature painting, flat jewel colours, delicate linework, reverent",
  "ink-parchment": "black ink brushwork on warm aged parchment, restrained crimson and gold accents, dramatic chiaroscuro",
};
const COMPOSITION = { carousel: "subject in the upper two thirds of a vertical frame, calm darker lower third", hero: "wide horizontal composition with the subject left of centre and open space on the right", thumbnail: "bold single focal point, simple background, large readable shapes" };
// Words that make an image model paint lettering or speech bubbles (found: "speaks a solemn warning" produced a page of gibberish text). They are rewritten into purely visual wording before every generation.
const TEXTY = [[/\b(speaks?|says?|declares?|proclaims?)\s+(a\s+|an\s+)?(solemn\s+)?(warning|curse|vow|command)\b/gi, "raises a solemn hand"], [/\b(speaks?|speaking|says?|saying|tells?|telling|declares?|proclaims?)\b/gi, "gestures gravely"], [/\b(inscription|inscribed|letters?|writing|written|scroll|book|banner|signboard|sign|caption|text)\b/gi, "ornament"]];
export const sanitize = p => { let o = p; for (const [re, to] of TEXTY) o = o.replace(re, to); return o; };
export function build(shot, use = "carousel") { return sanitize(build0(shot, use)).replace(/[.]*$/, "") + ", a purely visual painting, every surface plain and unmarked."; }
function build0(shot, use = "carousel") {
  if (shot.prompt) { const p = shot.prompt.trim(); return shot.raw ? p : p.replace(/[.,;]+$/, "") + ", " + MEDIUM[shot.medium || "ravi-varma"] + ", " + COMPOSITION[use] + "."; }   // pasted prose prompt from a frontier model: we append our style and composition unless raw
  const parts = [shot.subject, shot.action, MEDIUM[shot.medium || "ravi-varma"], shot.setting, shot.lighting, shot.mood, ...(shot.colors || []).map(c => `${c.object} in color ${c.hex}`), shot.composition || COMPOSITION[use]].filter(Boolean);
  return parts.map(p => p.trim().replace(/[.,;]+$/, "")).join(", ") + ".";
}
const NEG = /\b(no|not|without|don't|never|avoid|nothing|none)\b/i;
export function lint(prompt) { const w = prompt.split(/\s+/).length, out = []; if (w < 35) out.push(`too short (${w} words): Klein does no prompt upsampling, be descriptive (40-70)`); if (w > 80) out.push(`too long (${w} words): front-load the subject and trim (40-70)`); const m = NEG.exec(prompt); if (m) out.push(`negative phrasing "${m[0]}": describe what you want instead (e.g. "deserted riverbank")`); if (/[ऀ-ॿ]/.test(prompt)) out.push("Devanagari in the prompt: Klein renders it badly, add text in the overlay"); if (/#[0-9a-f]{6}/i.test(prompt) && !/(in color|color) #/i.test(prompt)) out.push("hex colour not attached to an object"); return out; }
