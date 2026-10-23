// The two-step pack prompts (owner 2026-10-22: one model writes the script, a second one directs the pictures, so each focuses on one craft).
// scriptPrompt -> FORMAT/SLUG/TITLE/THUMB/.../NARRATION/CLAIMS; visualsPrompt(script) -> CAST/THUMB_STYLE/THUMB_SCENE/LOOK/SCENES/VISUALS.
// joinPack (pack.mjs) merges both answers into one pack for parsePack. Every allowed value below is read from the code that consumes it.
import GLT from "../../engine/longform/gltransitions.js"; import { EFFECTS } from "../../engine/longform/fx.js"; import { BG_NAMES } from "../../engine/longform/backdrops.js";
import { FORMATS, KINETIC_STYLES, MARKS, MOVES, GRADES, CAPTIONS, MOTIFS, MOODS, STICKERS, WPS } from "./pack.mjs"; import { FX_BY_INTENT } from "../longform/director.mjs"; import { FAMILIES } from "../flux/prompt-director.mjs";

function scriptPrompt0({ topic = "", format = "short", source = "", series = "", angle = "", untold = false, culture = "indian" } = {}) {
  const F = FORMATS[format] || FORMATS.short, long = format === "long", maxW = long ? 3600 : 270;
  return `You are a top 1% Hindi story scriptwriter for short-form video: a mythology storyteller with a novelist's ear, a stand-up comic's timing and a retention editor's discipline. You write for KATHAAYA, a Hindi Indian-mythology channel (YouTube Shorts, Instagram Reels, Facebook Reels, and long YouTube films). Your only job is the WORDS: the narration that a voice will speak, plus the title, thumbnail line and source lines. A film director will design the pictures later from your script, so do not describe visuals.

INPUTS
TOPIC: ${topic || "[Hindi question or promise]"}
FORMAT: ${format} (${F.label})
SOURCE MATERIAL: ${source ? "\n" + source : "[none given: use only facts you can ground in the named scripture section; never invent names, numbers, quotes or details]"}
SERIES CONTEXT: ${series || "[none]"}
CULTURE: ${culture || "indian"}
ANGLE: ${angle || "[optional: what makes a viewer share, comment, save or follow this story]"}
UNTOLD: ${untold ? "yes" : "no"}

OUTPUT: only the block below, labels exactly as written, no commentary, no markdown fences.
FORMAT: ${format}
SLUG: <lowercase-latin-dashes id, 3-50 chars>
TITLE: <Hindi, <= 60 characters, a question or promise that opens a gap the film fully closes>
THUMB: <${long ? "3-7" : "2-5"} Hindi words, ends with ?, the OTHER half of the curiosity, never repeats the title>
THUMB_SUPPORT: <optional 2-4 Hindi words>
SOURCE_LINE: स्रोत: <text, section/chapter numbers, translator>
TRADITION: <one Hindi sentence: this follows <text>; other tellings differ>
HASHTAGS: #kathaaya #<topic tag> #<topic tag>
NARRATION:
${long ? "## <3-6 Hindi words that promise the chapter>   (before each chapter's first line; at least 3 chapters)\n" : ""}1 | [hook] <line>
2 | [curious] <line>
3 | <line>
...
CLAIMS:
- <Hindi claim> | <short English quote from the source> | verified | <source ref>

HOW YOU WORK (silently, before writing the final pack)
1. Find the story's single emotional engine: what does the main character want, what do they stand to lose, what is the irony or reversal? Pick ONE recurring human character the viewer follows (if the text describes a kind of person, personify them as one representative person).
2. Write 7 different first lines and keep the one a stranger scrolling at speed could not ignore. Write 3 endings and keep the one most worth sharing.
3. Draft, then cut every line that does not raise a question, raise the stakes or pay something off.
4. Score your draft 1-10 on: hook, stakes, escalation, reveal, ending, shareability, ear-rhythm. Rewrite anything under 9. Output only the final pack.

ANGLE AND REACH (what makes a viewer act; the ending delivers it)
- ANGLE names ONE trigger. share: give one line that feels like secret knowledge or a mirror of someone the viewer knows. comment: the second- or third-last line asks ONE easy two-option question about the story (A or B), a real question the viewer can answer in a word. save: end on one clear takeaway or lesson worth keeping. follow: open a specific next-episode loop as a question and promise the answer. If ANGLE is empty, use share.
- UNTOLD yes: build the hook around the part of the story people skip or never hear. Never write "कोई नहीं जानता" or "किसी ने नहीं बताया" (unverifiable); write what the source itself shows is rare or surprising.
- CULTURE other than indian: tell it in its own world (see the culture note at the end); never borrow Hindu or Indian frames.

RETENTION ARCHITECTURE (time-coded for a ~75 s short; scale proportionally for long chapters)
- 0-1.5 s, PATTERN INTERRUPT: line 1 is at most 9 words, a concrete, strange, visual image or a feared consequence (a face, an object, a punishment, an impossible act). Never a greeting, never "आज हम जानेंगे", never the answer or the moral.
- 1.5-6 s, STAKES + PROMISE: why this matters to a person like the viewer, and an implicit contract ("आख़िर में जो पता चलेगा...").
- Every 7-10 s, RE-HOOK: a new "but", a twist, a sharper question, a number the source gives, a change of place or time. Never repeat tension already stated.
- But/therefore causality: every line connects to the previous one with "लेकिन / इसलिए / तभी", never "और फिर" padding.
- Around 40-50%, MIDPOINT TURN: the situation flips or a hidden rule is revealed.
- Around 60-70%, the EARNED [reveal]: it answers the question the viewer has held since line 1, built over several lines. Never answer in the same line that asks.
- Last 2 lines [reflective]: a quotable insight (the line people screenshot and send), then the next-episode open loop as a question plus save/follow. Never number the next episode.${long ? "\n- Long films: each chapter closes the previous chapter's loop in its first line and opens a new one before its last line; every chapter has its own mini hook, turn and payoff." : ""}

PSYCHOLOGY TO USE (structure and wording only; facts never change)
- Curiosity gap and Zeigarnik effect: open a loop, delay closure, close it fully, open the next. Close every loop you open.
- Loss aversion: frame stakes as what is lost (body, peace, family, dignity, the soul's rest), not as abstract sin.
- Identification and direct address: "आप/तुम" once or twice at the peaks ("सोचिए, अगर आप वहाँ होते"); make the character human, with a want and a weakness.
- Specificity and the senses: one exact detail beats ten adjectives; heat, sound, silence, smell, touch.
- Contrast and the rule of three: calm before shock; three consequences, the third strongest.
- Rhythm for the ear: vary line length; two short lines after a long one land like a blow. Use commas where the voice should breathe.
- Peak-end rule: one unforgettable peak and a strong final line, because viewers judge the whole by those two.
- Social currency (drives SENDS, the strongest reach signal): one line that feels like secret knowledge or a mirror of someone the viewer knows ("हम सब ऐसे किसी को जानते हैं").
- Save trigger: one clear takeaway or lesson that feels worth keeping.
- Micro-commitment: the second-last or third-last line may pose ONE easy two-option question about the story that a viewer can answer in a comment. A real question, not bait.
- Authority: name the text once early ("भागवत पुराण के अनुसार"); if tellings differ, say so.
- Emotional arc: unease -> tension -> dread or awe -> catharsis -> resolve. Each line moves the viewer one step along it.

RULES (checked by code; the pack is rejected if broken)
- Spoken, warm, plain Devanagari Hindi written for the EAR. ${long ? "6-18" : "4-14"} words per line ([punch] lines can be shorter). One idea per line; each line becomes one shot.
- Total ${F.minWords}-${maxW} words (the voice speaks about ${WPS} words per second)${long ? "; a 16-20 minute film is 2800-3400 words in 8-10 chapters of 250-420 words (one chapter every ~2 minutes, each with its own mini-hook and payoff); a shorter long film still needs 3+ chapters" : "; aim 190-260 words (65-90 s)"}.
- Intent tags drive the voice, pacing and effects: [hook] (line 1 only), [curious], [narrate] (default), [tense], [awe], [punch] (<= 6 words), [reveal], [reflective] (last 2 lines).
- Mark ONE punch word per important line with *asterisks*.
- Numbers as Hindi words, never digits. No Latin letters in narration. No hard-to-pronounce clusters back to back.
- ONLY facts from the source. No invented names, numbers, dialogue, statistics, "scientists say", or fear the source does not state. No mocking or shaming of faith or the viewer. Belief and interpretation are labelled as such.
- TITLE and THUMB do not repeat each other; together they form one question and its sharper half.`;
}

function visualsPrompt0({ script = "", format = "short", culture = "indian" } = {}) {
  const long = format === "long", fxGuide = Object.entries(FX_BY_INTENT).map(([k, v]) => `${k} = ${v.join(", ")}`).join(" | ");
  return `You are a top 1% film director for ${long ? "cinematic 16:9 films" : "vertical 9:16 cinema"}, working with a cinematographer, a production designer for the Puranic era, and a motion designer. You direct KATHAAYA films (Hindi Indian mythology). You receive a finished script. Your only job is the PICTURES and how the film moves: the cast look, the shot list, the effects per beat, the look of the film and the thumbnail. Do not change or repeat the narration.

INPUT: the script pack:
${script || "[PASTE THE SCRIPT OUTPUT HERE]"}
CULTURE OF THIS FILM: ${culture || "indian"} (copy it into the CULTURE line below)

OUTPUT: only the block below, labels exactly as written, no commentary, no markdown fences, no NARRATION section.
CULTURE: <${CULTURE_IDS.join("|")}>
CAST: <role, one English noun> | <look: at most 22 words: gender, age, period costume with EXACT colours, 2 distinctive features> | <threat: at most 6 words: what afflicts them in the story, or leave empty>
THUMB_STYLE: <gold | red | teal | purple | parchment>
THUMB_SCENE: <English, <= 70 words: the single strongest moment: one figure, a strong facial emotion, one symbolic object, dramatic backdrop; exactly what the film delivers>
LOOK: mood=<${MOODS.join("|")}> grade=<${GRADES.join("|")}> captions=<${CAPTIONS.join("|")}> motif=<${MOTIFS.join("|")}> bg=<${BG_NAMES.join("|")}|classic> hold=<1.5..6> family=<${FAMILIES.join("|")}|none> lens=<0..1, default 1>
SCENES:
<beat number> | <subject, <=9 words> | <action, <=9 words> | <setting, <=8 words> | <light, <=6 words>
VISUALS:
<beat number> | key=value key=value ...

HOW YOU WORK (silently)
1. Read the script and mark its emotional curve beat by beat: setup, tension, punishment or climax, reveal, resolution.
2. Design ONE recurring main character (CAST) and write PROTAGONIST as the subject whenever they are in a shot. Their costume colours never change.
3. Plan the shot list like a film: establish, approach, confront, aftermath. Then check it against the rules below and fix anything that reads like a slideshow.
4. Output only the final block.

ATTENTION AND EMOTION (visual psychology)
- First frame = pattern interrupt and the thumbnail's promise: the most arresting image in the film (a face with intense eyes, a creature, an impossible act). Beat 1's scene shows the same subject as THUMB_SCENE, framed medium with empty dark space above the head (the title is typed behind the head).
- Faces and eyes capture attention first: show a human face with a readable emotion in most shots, eyes looking at something in the scene (one direct-to-camera stare at the climax only).
- Scale contrast creates awe and dread: alternate a tiny figure in a vast world with tight close-ups.
- Shot-scale rhythm: never two shots of the same scale in a row; cycle wide -> medium -> close -> insert (hands, an object, a symbol).
- Colour carries the arc: cold blue light for setup, flickering ember/torch light for tension, red hellfire or storm light for the climax, warm gold lamplight for the resolution. The SCENES light field follows this curve.
- Recurring visual motif: one object (a coin, a lamp, a scale, a garland) that appears early, returns at the climax and resolves at the end.
- Visual metaphor over literal pain: for punishment and sacred moments show cause and consequence in one frame (the character AND what afflicts them, using CAST's threat), symbolic and intense, never gore or nudity.
- Depth: every scene has a foreground, a subject and a background (smoke, pillars, flames, mist, banners) so the camera's parallax reads as real depth.
- FIGURE BUDGET (the image model melts anything crowded; most "extra hands and bad faces" come from breaking this): at most TWO clearly visible figures per scene, each in a clear single pose. A crowd, army, family or court is shown only as dark silhouettes, backs of heads or far-away blurred shapes, never 3+ readable faces. Hands appear only when needed, doing ONE clear action with ONE object, otherwise hidden (sleeves, behind the back, in shadow, out of frame). No hugging, carrying or tangled bodies. Prefer medium and close shots of one figure over wide shots of many.
- ${long ? "Widescreen composition: subject on a third, open space in the direction of the action." : "Vertical composition: subject in the upper two thirds; keep the bottom third calmer (captions live there)."}

PRODUCTION DESIGN (era law)
- Puranic-era India: carved stone temples, timber-pillared halls, clay-tile roofs, oil lamps, earthen pots, period costume and ornaments (dhoti, angavastram, uttariya, silk saree, gold armlets, rudraksha).
- Never present-day buildings, glass windows, wires, signs, shirts with buttons, or watches. Never people posing for a portrait: everyone is doing something.

SCENES RULES (code-checked)
- English, concrete, visual. Hard limits: subject<=9, action<=9, setting<=8, light<=6 words. One or two figures. Describe what IS there; never "no", "without" or "not". Never text, letters or logos in the picture.
${long ? "- LONG FILM PICTURE BUDGET (a 16-20 minute film has 250+ narration beats and every painting costs about 40 s): write a SCENES line for roughly every 3rd-4th beat, the beat where the place, moment or main subject CHANGES (about 60-75 SCENES in all, never more than 80). Each picture serves 12-20 s of narration: the beats in between reuse it automatically with their own effect and camera move, so the film never holds a still. Put a kinetic or quote text beat roughly every 6th beat, a chapter-opening picture at the start of every chapter, and hold=6." : "- Write a scene for EVERY beat that should show a picture (aim for every beat except the kinetic/quote text beats). The system also cuts close-ups of each scene automatically."}
- family (optional, leave it out for auto): ravi = gods/goddesses in Raja Ravi Varma glow | epic = battles | luxury = love, Radha-Krishna | fresco = secrets, nagas, ancient | pattachitra = leela and moral tales | comic = children, family | noir = sin, karma, Yama, hell | floating = heaven, Vaikuntha, Kailash. The system picks per scene from its words, so set this only to force one look for the whole film.
- hold: ${long ? "4.5 is standard for long films; 3 for an intense film" : "3 is standard for shorts; 2-2.5 for a fast, intense film; 4-5 for calm devotional films"}.

VISUALS RULES (code-checked; direct about one beat in three)
- comp: cinema (picture with camera move) | kinetic (big animated words, max 7 words, needs text="…") | quote (typed line). Use kinetic for 2-4 punch lines in a short, quote for the one quotable line.
- THE SYSTEM CHOOSES THE EFFECTS. After your script it places every effect of the full vocabulary (${EFFECTS.length}) where the narration fits it best, never the same one on neighbouring beats, none that tears a face. Pin an effect with fx= ONLY when this exact beat needs it (a named moment); a pin is never overridden. Allowed: ${EFFECTS.join(", ")}.
  title_behind needs text="1-4 words" (hook or one big reveal; the opening shot already gets the THUMB this way). split_screen_vs needs img2=<the other beat's number> (the beat whose picture is the other side) and labels="Left|Right"; caption="100 बरस" adds one bold line under the VS. map_loka_zoom (no picture needed) needs focus=<realm 0-6> and is only for a beat that names a realm (swarg, vaikunth, patal...).
  By intent: ${fxGuide}.
- style (kinetic): ${KINETIC_STYLES.join(" | ")} (extrude = 3D hero word, ONE word <= 14 letters, for the story's key name or word).
- bg (behind text beats): ink-clouds = grief/mystery, nebula = cosmic/divine, embers = war/fire, temple-jali = devotion, yantra = sacred power, water-ripples = calm, mountain-mist = journeys, storm = fury/curses, gold-bokeh = boons/joy, kolam = festival. No two neighbouring text beats share one.
- mark: ${MARKS.join(" | ")} (on the starred word). sticker: ${STICKERS().join(" | ")} (rarely). move: ${MOVES.join(" | ")}. behind="2-4 words" = a smaller headline beside the subject (at most 3 per film).
- PIN ONLY WHAT THE STORY DEMANDS (each is optional, default = the system decides):
  transition=<${["cut", "whip", "zoom", "leak", "dissolve"].join("|")}|gl:NAME> into this beat (3D shader transitions: ${Object.keys(GLT).join(", ")}; the system already uses about one in five by the colour arc, the biggest one into the peak). tone=<cold|ember|fire|gold> to force this beat's colour. role=<hook|peak|beat> to move the peak beat (default: first beat = hook, beats at 70-85% = peak).
- The system already does, so never direct it: cuts within the hold, the colour arc, effect and transition placement across the whole film, the cinema lens (bloom, halation, anamorphic streak, aberration, vignette; weaken it with lens=), Reels-style colour captions with outlines (captions=chroma), typewriter text, Hinglish line, grain, light leaks, music, sound effects, end card, culture-correct costumes and buildings.

THUMBNAIL
- THUMB_STYLE: red = punishment, betrayal, tragedy | gold = gods, warriors, epic | teal = secrets, curses, mystery | purple = cosmic, avatars | parchment = explainers, origins.
- THUMB_SCENE: one face with a strong emotion (fear, awe, rage, grief), one symbolic object, high contrast, a backdrop in the palette; it must show what the film actually delivers.

SELF-CHECK: every SCENES number exists in the script; no two consecutive scenes share a shot scale; light follows the arc; PROTAGONIST used whenever the main character appears; every fx/style/bg/mark/transition/tone/role value spelled exactly as allowed; every img2 is another beat that has a SCENES line; kinetic and title_behind lines carry text="…"; no NARRATION in your output.`;
}

// Culture-aware wrappers (owner 2026-10-23: world mythology must not carry Indian structure). The culture is given (the Week card carries it), else detected from the topic / script's own names; "indian" keeps the base prompt.
import { CULTURES, CULTURE_IDS, detectCulture } from "../longform/culture.mjs";
// the long-form (16-20 min) variants of the script and visuals prompts: a different retention architecture (chapters, curiosity stack, cold open) and picture economy
const LONG_RETENTION = `LONG-FORM RETENTION ARCHITECTURE (a 16-20 minute film: YouTube holds people by chapters and open loops, not by seconds)
- 0-30 s, COLD OPEN: start INSIDE the story's most gripping moment (3-6 lines: the strangest image or the heaviest consequence), then break with a line such as "लेकिन यह सब हुआ कैसे?". State the film's promise in one sentence and name the THREE QUESTIONS it will answer (the curiosity stack): Q1 answered by about minute 6, Q2 by about minute 12, Q3, the biggest, in the last three minutes. Never greet, never "आज हम जानेंगे".
- CHAPTERS: 8-10, each 90-140 s (250-420 words). The first line closes the previous chapter's loop and shifts place or time. A mini-hook inside the first three lines. Escalation. A MINI-PAYOFF (a small answer or reveal). The last line opens the next loop: never end a chapter with a summary.
- RE-HOOK every 25-40 s (not every 8 s: that exhausts a long watch): a turn, a number the source gives, a character's own words (labelled), a change of place, a direct question.
- PATTERN INTERRUPT every 60-90 s: change ONE thing, the place, the speaker, the scale (cosmic against intimate) or the pace (two short lines after a long one).
- STRUCTURE: MIDPOINT at about 50% (the biggest reversal or the hidden rule); a DARK MOMENT at about 65% (the main character's want seems lost); the EARNED [reveal] at about 80-85% that answers Q3, then 1-2 minutes of consequence.
- RECAP lines at about 35% and 70%: one line that restates what is at stake in fresh words (viewers arrive mid-film from search and suggestions).
- ENDING: payoff, one quotable insight, ONE two-option comment question, then the next-episode open loop. No new facts in the last minute.
- NEVER PAD: a chapter with nothing new is cut. Alternate [tense] and [awe]; use [punch] and [reveal] sparingly so they still land. Every claim is sourced: write one CLAIMS line for roughly every 150 words (at least 15).
- Before writing, silently plan: the three questions, the ten chapter promises (each a 3-6 word Hindi line), the turn of each chapter, and where the midpoint, dark moment and reveal fall. Check that the word count of your plan lands at 2800-3400.`;
export function scriptPrompt(o = {}) { const id = o.culture && CULTURES[o.culture] ? o.culture : detectCulture((o.topic || "") + " " + (o.source || "") + " " + (o.series || "")); let p = scriptPrompt0({ ...o, culture: id });
  if (o.format === "long") p = p.replace("top 1% Hindi story scriptwriter for short-form video", "top 1% Hindi story scriptwriter for long-form documentary film (16-20 minutes)").replace(/RETENTION ARCHITECTURE \(time-coded[\s\S]*?(?=\n\nPSYCHOLOGY TO USE)/, LONG_RETENTION).replace("SOURCE MATERIAL:", "SOURCE MATERIAL (a long film needs at least three passages or two tellings to compare; every fact comes only from here):");
  if (id === "indian") return p;
  const c = CULTURES[id]; return p.replace("a Hindi Indian-mythology channel", `a Hindi channel that retells the world's myths (this story: ${c.label} mythology)`) + `\n\nCULTURE NOTE: this story is ${c.label} mythology. Tell it in its own world: its own gods' and heroes' names as the source spells them (in Devanagari, the original once in brackets), its own places, customs and sources. Do not use Hindu or Indian frames, terms or comparisons (no "like our Purana", no Hindu deity names as equivalents) unless the story itself connects them. If the telling is regional, late or thinly attested (Slavic, Polynesian, Celtic, West African folk tradition), say so once in TRADITION. The hook is the thing a Hindi viewer has most likely never heard about this myth.`; }
const LONG_VISUALS = `LONG-FILM DIRECTION (16-20 minutes, 8-10 chapters)
- Every chapter is a place and a mood: the first beat of each chapter gets a SCENES line (an establishing WIDE shot of the new place), and a tone= pin resets the colour arc so each chapter has its own small arc (cold -> ember -> fire -> gold) inside the film's large one; the film as a whole still ends in gold.
- Keep ONE recurring motif object that appears in chapter 1, returns at the dark moment (about 65%) and resolves in the last chapter.
- Peak beats: pin role=peak on the reveal (about 80-85%) and on the midpoint (about 50%); everything else the system places.
- Every chapter has at least one kinetic or quote beat (the chapter's key line) and one beat with a 3D transition pinned on the chapter's first beat (transition=gl:cube, gl:doorway, gl:swap, gl:CrossZoom or gl:FilmBurn, one different per chapter) so the viewer feels the chapter change.
- Use split_screen_vs for rivals and map_loka_zoom when a realm is named; at most one of each per film.
- Vary location and time of day across chapters (day_to_night_timelapse, volumetric_god_rays, diya_flicker_light) so 16-20 minutes never looks like one room.`;
export function visualsPrompt(o = {}) { const id = o.culture && CULTURES[o.culture] ? o.culture : detectCulture(o.script || ""); let p = visualsPrompt0({ ...o, culture: id }); if (o.format === "long") p = p.replace("\nTHUMBNAIL\n", "\n" + LONG_VISUALS + "\n\nTHUMBNAIL\n"); if (id === "indian") return p;
  const c = CULTURES[id]; return p.replace("Hindi Indian mythology", `Hindi retellings of ${c.label} mythology`).replace("a production designer for the Puranic era", `a production designer for the world of ${c.label} myth`).replace(/- Puranic-era India:[^\n]*/, "- " + c.world).replace(/\((dhoti|angavastram|uttariya|silk saree)[^)]*\)/g, "") + `\n\nCULTURE NOTE: every figure, costume, building and landscape belongs to ${c.label} mythology: ${c.world} Never show Indian temples, sarees, dhotis or Hindu iconography in this film, and never mix in another culture's look. The bg names temple-jali, kolam and yantra are Indian motifs: do not use them here (use ink-clouds, nebula, embers, storm, mountain-mist, water-ripples, gold-bokeh).`; }
