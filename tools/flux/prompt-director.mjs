// Builds FLUX.2 Klein prompts from structured shot specs (skill: flux-prompting-kathaaya) and lints them against the official rules.
// shot = { subject, action, medium: "photoreal"|"ravi-varma"|"pahari"|"ink-parchment", setting, lighting, mood, colors: [{object, hex}], composition }
// house default is "photoreal" (owner spec 2026-10-19: no painted look, sharp and real); the painted mediums stay available for anyone who asks for them explicitly.
// 2026-10-20 (owner: faces/eyes distorted, wants director-grade cinematography): added lens/lighting specificity and anatomy-correctness language to the positive
// prompt (works even at the distilled model's default CFG, where the negative prompt below is silently ignored -- Draw Things only reads it when cfg > 1).
// Style families (owner 2026-10-22, pasted "Universal Mythology Visual Engine"): the house style stays (cinematic painting + photoreal texture, oil-paint texture hides small
// anatomy errors); a family adds ONE short phrase that shifts the look to suit the scene. Each phrase is at most 9 words so the 95-word painter budget holds.
export const FAMILY = {
  ravi: "warm devotional film lighting, jewelled ornaments, radiant skin",
  epic: "epic war film, dust and sparks, dynamic low angle",
  luxury: "romantic film lighting, silk drapery, warm rose gold glow",
  fresco: "ancient temple stone, mysterious shadow, earthy tones",
  pattachitra: "rich folk colour palette, bold graphic shapes, ornamental detail",
  comic: "bright friendly film lighting, warm colour, clear readable action",
  noir: "film noir chiaroscuro, deep shadow, single ember light",
  floating: "celestial realm, clouds below, golden radiance, luminous sky" };
export const FAMILIES = ["auto", ...Object.keys(FAMILY)];
// automatic choice from the scene's own narration + spec (first match wins, most specific first), then the film's mood; null = plain house style
const FAMILY_RULES = [["floating", /स्वर्ग|वैकुंठ|कैलाश|क्षीरसागर|देवलोक|heaven|vaikuntha|kailash|celestial/i], ["noir", /नरक|यमराज|यमदूत|यमलोक|पापी|दंड|सज़ा|सजा|तड़प|\byam\b|\bhell\b|punish/i], ["luxury", /प्रेम|राधा|रास|श्रृंगार|शृंगार|विवाह|स्वयंवर|love|romance|radha/i], ["epic", /युद्ध|रण|वध|संहार|तांडव|शस्त्र|battle|war|slay|combat/i], ["fresco", /रहस्य|नाग|पाताल|प्राचीन|गुफा|secret|serpent|naga|ancient|cave/i], ["comic", /बालक|बच्चे|बच्चा|परिवार|माँ|माता|child|children|family/i], ["pattachitra", /लीला|सीख|उपदेश|नीति|moral|leela|lesson/i], ["ravi", /भगवान|देवी|शिव|विष्णु|राम|सीता|कृष्ण|दुर्गा|लक्ष्मी|हनुमान|\bgod\b|goddess|deity|shiva|vishnu|krishna|durga|lakshmi|hanuman|\bsita\b|\bram\b/i]];
export function pickFamily(text = "", mood = "") { for (const [f, re] of FAMILY_RULES) if (re.test(text)) return f; return null; }   // no mood fallback: a whole film in one family (a sorrow story all-noir) loses the variety; plain scenes keep the house style
export const MEDIUM = {
  // 2026-10-22 (owner: "Cinematic Painting + Photorealistic Texture -- THE WINNER", reference supplied): the strict
  // default for every video now -- a painted cinematic matte-painting environment (soft brushwork, visible canvas
  // grain, dramatic volumetric light) carrying a photorealistic human subject (real pore/skin/sweat detail, accurate
  // anatomy, sharp focus) layered on top, not a flat illustration and not a plain photograph either.
  // 2026-10-22 (owner: faces read as present-day people on a street, "should feel like a mythology movie"): "85mm lens" pulled
  // every figure toward a posed street portrait; replaced by film-still / production-design language
  photoreal: "cinematic photorealistic movie still of an epic Hindu mythological film, anamorphic lens, natural skin texture, detailed eyes, dramatic volumetric light, rich filmic colour grade",
  "ravi-varma": "oil painting in the style of Raja Ravi Varma, rich pigments, soft chiaroscuro, reverent",
  pahari: "Pahari miniature painting, flat jewel colours, delicate linework, reverent",
  "ink-parchment": "black ink brushwork on warm aged parchment, restrained crimson and gold accents, dramatic chiaroscuro",
};
// Shared quality negative prompt: only takes effect when the caller also passes cfg > 1 (see tools/flux/klein.mjs) -- costs about 2x the time, used by default
// for the main art pipeline and thumbnails now (2026-10-20), not just opt-in. Pillar-specific additions (e.g. ethnicity/culture for Indian mythology) are the caller's own.
// "painting" itself is no longer negative (2026-10-22: the default medium is now a deliberate cinematic
// matte-painting background) -- flat/cheap renderings still are: cartoon, anime, flat illustration, 3D/CGI render.
export const NEG_QUALITY = "deformed face, asymmetric eyes, cross-eyed, lazy eye, malformed eyes, extra fingers, fused fingers, deformed hands, extra limbs, missing limbs, mutated anatomy, blurry face, distorted features, incorrect anatomy, disfigured, duplicate face, floating disembodied head, long neck, crowd of identical faces, extra arms, extra hands, extra fingers, fused bodies, tangled limbs, merged people, duplicated people, looking at camera, posed portrait, street photography, documentary photograph, present-day people, plastic skin, waxy skin, cartoon, anime, flat illustration, 3d render, cgi render, watermark, text, signature, logo, low quality, low resolution";
// shot scale for film coverage (wide / close / insert cut from one moment); replaces the default composition line when a shot sets `framing`
export const FRAMING = { wide: "figures small in a vast environment", medium: "subject centered, generous empty dark space above the head, shallow depth of field", close: "eyes looking off-frame, shallow depth of field", extreme: "eyes filling the frame, shallow depth of field", insert: "hands out of frame, shallow depth of field", detail: "shallow depth of field", profile: "half the face in shadow, hands out of frame, shallow depth of field" };
const FRAMING_LEAD = { wide: "wide establishing shot of", medium: "medium shot of", close: "close-up of", extreme: "extreme close-up of the eyes of", insert: "insert close-up of", detail: "close detail of", profile: "profile view of the head and shoulders of" };
// neuromarketing roles (see tools/longform/art.mjs keyInfo): hook = face + direct gaze, peak = scale + one glowing focal point, beat = one focal point, gaze toward the open side
export const ROLE_COMP = { hook: "face large, eyes in the upper third looking into the lens, one glowing accent", peak: "monumental scale, one glowing focal point, strongest contrast", beat: "one clear focal point, eyes in the upper third, gaze toward open space" };
const COMPOSITION = { carousel: "subject in the upper two thirds of a vertical frame, calm darker lower third", hero: "wide horizontal composition with the subject left of centre and open space on the right", thumbnail: "bold single focal point, simple background, large readable shapes" };
// Words that make an image model paint lettering or speech bubbles (found: "speaks a solemn warning" produced a page of gibberish text). They are rewritten into purely visual wording before every generation.
const TEXTY = [[/\b(speaks?|says?|declares?|proclaims?)\s+(a\s+|an\s+)?(solemn\s+)?(warning|curse|vow|command)\b/gi, "raises a solemn hand"], [/\b(speaks?|speaking|says?|saying|tells?|telling|declares?|proclaims?)\b/gi, "gestures gravely"], [/\b(inscription|inscribed|letters?|writing|written|scroll|book|banner|signboard|sign|caption|text)\b/gi, "ornament"]];
export const sanitize = p => { let o = p; for (const [re, to] of TEXTY) o = o.replace(re, to); return o; };
export function build(shot, use = "carousel") { return sanitize(build0(shot, use)).replace(/[.]*$/, "") + ", a purely visual image, every surface plain and unmarked."; }
function build0(shot, use = "carousel") {
  if (shot.prompt) { const p = shot.prompt.trim(); return shot.raw ? p : p.replace(/[.,;]+$/, "") + ", " + MEDIUM[shot.medium || "photoreal"] + ", " + COMPOSITION[use] + "."; }   // pasted prose prompt from a frontier model: we append our style and composition unless raw
  const parts = [(shot.framing && FRAMING_LEAD[shot.framing] ? FRAMING_LEAD[shot.framing] + " " : "") + (shot.subject || ""), shot.action, (shot.family && FAMILY[shot.family] && (shot.medium || "photoreal") === "photoreal" ? "cinematic photorealistic movie still of an epic Hindu mythological film, natural skin texture, dramatic volumetric light" : MEDIUM[shot.medium || "photoreal"]), FAMILY[shot.family] || null, shot.setting, shot.lighting, shot.mood, ...(shot.colors || []).map(c => `${c.object} in color ${c.hex}`), FRAMING[shot.framing] || shot.composition || COMPOSITION[use], !shot.framing || shot.framing === "wide" || shot.framing === "medium" || shot.framing === "close" ? ROLE_COMP[shot.role] : null].filter(Boolean);
  return parts.map(p => p.trim().replace(/[.,;]+$/, "")).join(", ") + ".";
}
const NEG = /\b(no|not|without|don't|never|avoid|nothing|none)\b/i;
// ceiling raised from 80 to 95 (2026-10-20) when MEDIUM.photoreal grew by ~16 words for cinematography/anatomy language
export function lint(prompt) { const w = prompt.split(/\s+/).length, out = []; if (w < 35) out.push(`too short (${w} words): Klein does no prompt upsampling, be descriptive (40-95)`); if (w > 95) out.push(`too long (${w} words): front-load the subject and trim (40-95)`); const m = NEG.exec(prompt); if (m) out.push(`negative phrasing "${m[0]}": describe what you want instead (e.g. "deserted riverbank")`); if (/[ऀ-ॿ]/.test(prompt)) out.push("Devanagari in the prompt: Klein renders it badly, add text in the overlay"); if (/#[0-9a-f]{6}/i.test(prompt) && !/(in color|color) #/i.test(prompt)) out.push("hex colour not attached to an object"); return out; }
