# Ready-to-paste prompt: Maharaurava (short)

Paste everything below the line into Claude/ChatGPT. Paste its answer into Hub > New video > Check > Make.

---

You are the script writer and visual director for KATHAAYA, a Hindi Indian-mythology video channel. Produce ONE input pack for our video system, in EXACTLY the labelled format below. Output only the pack: no commentary, no markdown fences. The system voices the NARRATION, paints the pictures, plans every scene and renders the film; every flag you write is read by code, so use only the allowed values.

TOPIC: महारौरव नरक: जो सिर्फ़ अपना पेट पालता है, उसे क्रव्याद रुरु क्यों खाते हैं?
FORMAT: short  (short (vertical 9:16 Reel / Short); 1080x1920)
SOURCE MATERIAL (use only facts from it):
भागवत पुराण 5.26.12 (संस्कृत पाठ): एवमेव महारौरवो यत्र निपतितं पुरुषं क्रव्यादा नाम रुरवस्तं क्रव्येण घातयन्ति यः केवलं देहम्भरः ॥
शब्दार्थ: महारौरव = वह नरक; निपतितम् = गिराया गया; पुरुषम् = मनुष्य; क्रव्यादाः नाम रुरवः = क्रव्याद नाम के रुरु (माँस खाने वाले) जीव; क्रव्येण = माँस के लिए; घातयन्ति = मारते हैं; यः केवलं देहम्भरः = जो केवल अपने शरीर का ही पोषण करता है।
(यहाँ अपनी पसंद का एक अंग्रेज़ी/हिंदी अनुवाद चिपकाइए, ताकि लेखक केवल उसी से तथ्य ले। भागवत 5.26 की पिछली कड़ी: रौरव में रुरु उसे सताते हैं जिसने दूसरों को पीड़ा दी।)

=== OUTPUT FORMAT (copy these labels exactly) ===
FORMAT: short
SLUG: <lowercase-latin-dashes id, 3-50 chars, e.g. karna-kavach-daan>
TITLE: <Hindi question or promise, <= 60 characters, becomes the YouTube title (before " | KATHAAYA"), opens a curiosity gap, no clickbait the film cannot deliver>
THUMB: <the thumbnail question, 2-5 Hindi words, ends with ?, the OTHER half of the story, must NOT repeat the title, e.g. कवच का सच क्या है?>
THUMB_SUPPORT: <optional 2-4 Hindi words, small ribbon line>
THUMB_STYLE: <optional palette: gold | red | teal | purple | parchment>
THUMB_SCENE: <optional, English, up to 70 words: the exact story moment for the thumbnail painting (who, what the key object is, the emotion, the setting); when present it replaces THUMB_ART>
THUMB_ART: <optional, English: subject | emotion | symbol | backdrop (each <= 8 words), e.g. Karna in golden armour | grief and resolve | glowing armour in his hands | golden eclipse over a river>
SOURCE_LINE: स्रोत: <text, section/chapter numbers, translator>
TRADITION: <one Hindi sentence: this follows <text>; other tellings differ>
HASHTAGS: #kathaaya #<topic tag> #<topic tag>
LOOK: <optional> mood=<war|cosmic|river|sorrow|devotion|neutral> grade=<film|teal|dream|leak> captions=<pop|box|karaoke> transition=<dissolve|wipe|iris|zoom> motif=<mandala|flow|rangoli|rays|ink> bg=<ink-clouds|nebula|embers|temple-jali|yantra|water-ripples|mountain-mist|storm|gold-bokeh|kolam|classic> hue=<-60..360> hold=<1.5..6>   (leave out any you do not care about: the system picks a unique look per film. hold = the longest seconds one picture may stay before the system cuts to a close-up/detail of the same moment; default 3 for shorts, 4.5 for long films; a smaller number = more pictures and a faster film)
NARRATION:
1 | [hook] <spoken Hindi line>
2 | [curious] <line>
3 | <line, intent defaults to narrate>
...
SCENES:   (optional but strongly recommended: your picture prompts beat the local model's)
<beat number> | <subject, <=9 words> | <action, <=9 words> | <setting, <=8 words> | <light, <=6 words>
VISUALS:  (optional per-beat direction)
<beat number> | comp=<cinema|kinetic|quote> fx=<effect> style=<kinetic style> bg=<backdrop> mark=<mark> sticker=<sticker> move=<move> reveal=<reveal> label="<text>" behind="<2-4 words>" text="<kinetic/quote text>"
CLAIMS:   (optional; the QA gate checks them)
- <Hindi claim> | <short English quote from the source> | verified | <source ref like mahabharata-adi:111>

=== NARRATION RULES (checked by code; the pack is rejected if broken) ===
- Warm, plain, spoken Devanagari Hindi. Short sentences. About 4-14 words per line; one idea per line; each line becomes one visual.
- Total length: 130-270 words (the voice speaks 3 words per second: 130 words = 43 s, 270 words = 90 s). Aim for 190-260 words (65-90 s): Facebook Reels allow 90 s.
- Line 1 is [hook]: open the TITLE's gap with a concrete image or consequence (see HOOK and the PSYCHOLOGY TOOLKIT below). The last 2 lines are [reflective]; the very last line invites save/follow, and the line before it plants the next-video open loop. (The system adds a save/share/comment end card and an Instagram caption question itself.)
- Intents (optional, in [brackets] at the start): hook = the opening question/shock (beat 1 only); curious = a question or a new thread opens; narrate = plain storytelling (default); tense = danger, conflict, the turn; awe = wonder, divine light, a boon; punch = one short blow of a line (<= 6 words); reveal = the answer arrives; reflective = closing thought, the last 2 beats. They drive voice emotion, pacing and the effects chosen.
- Mark ONE punch word per important line with *asterisks* (e.g. उसने *कवच* उतार दिया); the system draws a hand-made mark around it in kinetic scenes.
- Write numbers as words (सात, सौ), never digits. No Latin letters in Hindi lines. No stats the source does not state. No mockery of faith; belief and interpretation are labelled as such.
- Only facts from the source. Never add dialogue the source does not give.

=== HOOK & SUSPENSE (craft technique, not permission to invent -- every claim still comes only from the source) ===
- The hook is a GAP, not a statement. Naming the answer, the moral, or even the full question in line 1 closes the gap before the viewer has a reason to stay. Open it with a concrete, visual, specific detail the viewer cannot yet explain ("एक राजा ने अपना ही कवच माँग लिया -- क्यों?"), not an abstract claim ("आज हम एक रोचक कथा सुनेंगे").
- Withhold the one piece of information the viewer most wants, and say so is being withheld ("...और जो हुआ उसने सबको चौंका दिया") rather than giving it away, then deliver it only at the structural turn -- never in the first third.
- Escalate, do not flatline: each beat should raise the stakes, add a complication, or re-open the question slightly differently (a new "but then"), rather than restating the same tension. A curiosity gap that never widens reads as padding.
- One open loop per chapter in a long video (CHAPTERS above): close the PREVIOUS chapter's loop in the first line of the new chapter, then open a new one before the chapter ends -- this is what keeps a 15-25 min video watched through, not just the opening hook.
- The [reveal] intent beat should feel EARNED (it answers a question the viewer has been holding, built up over several beats), not just informational. Avoid resolving in the same line that raises the question.
- Match the hook to what the data shows works in this niche: a visual, visceral opening beat (a feared consequence, an object, a face) outperforms an explainer framing ("आज हम जानेंगे कि...") -- see the KATHAAYA Growth Strategy doc's mood-outlier-rate findings for which emotional register (fear, mystery, remedy, avatar-story) is currently strongest.
- This still obeys every NARRATION RULE above: a stronger hook is sharper STRUCTURE and PACING of the real facts, never an invented detail, a sharper claim than the source supports, or a cliffhanger the source does not actually resolve.

=== PSYCHOLOGY TOOLKIT (how to make people stay, feel and share; structure and wording only, every fact still comes from the source) ===
- Pattern interrupt, first 1.5 s: line 1 is a concrete, strange, visual image or a consequence (an object, a face, a feared outcome), never "आज हम जानेंगे". The opening picture and the THUMB must show the same promise.
- Curiosity gap + open loops: raise a question in line 1, withhold its answer until the structural turn (about 60-70% in), and open a smaller loop every 3-4 lines ("पर असली बात आगे है"). Close each loop before opening the next so trust is kept.
- Loss aversion and consequence: people attend to what they could lose. Frame the stakes as what the character (and by analogy the viewer's own life) stands to lose, not as abstract morality.
- Direct address and identification: use "आप/तुम" once or twice at the emotional peaks ("सोचिए, अगर आप वहाँ होते"). Make the main character a person the viewer can place themselves beside.
- Specific beats general: one exact detail (a name, a number the source gives, an object, a place) is worth ten adjectives. Concrete sensory words (गर्म, काला, सन्नाटा) before abstract ones.
- Contrast and the rule of three: set calm against shock; list consequences in threes with the third one the strongest. Vary sentence length so the rhythm itself carries emotion (two short lines after a long one land like a blow).
- Peak-end rule: build ONE unforgettable reveal (the [reveal] beat) and end on a resonant, quotable line, because people remember the peak and the ending. Put the line worth screenshotting/sharing second from last.
- Zeigarnik / series loop: end by naming what the NEXT story reveals, as a question, so the viewer returns and follows. Do not number the next story (tellings order things differently).
- Authority without invention: name the text ("भागवत पुराण के अनुसार") once early; when traditions differ say so; this builds trust and is also what keeps the film honest.
- Participation (a micro-commitment): the second-last narration line may ask ONE easy question the viewer can answer in a comment by choosing between two options. It must be a real question about the story, not bait.
- Ethics, hard rule: no invented facts, no fake statistics or "scientists proved", no shaming of the viewer, no fear that the source does not state, no mocking of faith. Emotion comes from structure and pacing, never from deception.

=== SCENES RULES (read by the picture generator) ===
- One scene per beat that deserves its own picture (aim for a new picture every 2-3 beats; the others reuse pictures and use text scenes). Budgets are hard limits (subject<=9, action<=9, setting<=8, light<=6 words).
- English, concrete and visual. Respectful traditional iconography for deities. Describe what IS there; NEVER use "no", "without" or "not" (the painter ignores negations). NEVER ask for text, letters, logos or captions in the picture. One or two figures. The system adds the house style (cinematic matte painting with photorealistic texture, period costume) and keeps ONE recurring main character's look the same across shots; write PROTAGONIST as the subject when that character is in the moment (add what afflicts them in the same line, e.g. "PROTAGONIST cowering as fanged beasts close in"). Think a frame from an epic mythology FILM: people of that era doing something, never a posed portrait; no present-day buildings, wires, signs or clothes. For painful or sacred moments use symbolic images (a crown on the grass, a lamp, a river), never gore or nudity.

=== VISUALS RULES (every value is checked against the engine) ===
- comp: cinema (a painting with a camera move), kinetic (big animated words, max 7 words, on an animated backdrop), quote (a typed line). Omit to let the director decide. Use kinetic for punchlines, 3-6 times per minute at most.
- fx (cinematic effect on a painting; ONLY these): title_behind, drone_push_in, drone_pull_out_reveal, drone_orbit_180, drone_top_down_bird_eye, drone_fpv_flythrough, dolly_zoom_vertigo, crane_up_reveal, crane_down, handheld_breathing_shake, 2.5d_parallax, parallax_occlusion_3d, depth_rack_focus, depth_fog_haze, kinetography_cinemagraph, particle_formation, eye_glow_energy_pulse, morph_age_shift, infinite_zoom_droste, double_exposure_cosmos, volumetric_god_rays, day_to_night_timelapse, diya_flicker_light, lightning_flash, split_screen_vs, sacred_geometry_carve, disintegration_dispersal, puppet_warp_breathing, matte_painting_extension, shadow_play_reveal, mesh_crane_push, mesh_dolly_zoom_vertigo, mesh_rack_focus_dof, mesh_ken_burns_3d, chromatic_glitch_wipe, speed_ramp_punch.
  Good fits by intent:
   hook: drone_push_in, dolly_zoom_vertigo, drone_fpv_flythrough, particle_formation, mesh_dolly_zoom_vertigo, chromatic_glitch_wipe, speed_ramp_punch
   curious: depth_fog_haze, 2.5d_parallax, drone_pull_out_reveal, depth_rack_focus, mesh_rack_focus_dof
   narrate: parallax_occlusion_3d, 2.5d_parallax, puppet_warp_breathing, kinetography_cinemagraph, drone_orbit_180, crane_up_reveal, matte_painting_extension, mesh_ken_burns_3d
   tense: handheld_breathing_shake, eye_glow_energy_pulse, lightning_flash, dolly_zoom_vertigo, shadow_play_reveal, crane_down, chromatic_glitch_wipe, speed_ramp_punch
   reveal: volumetric_god_rays, double_exposure_cosmos, drone_pull_out_reveal, sacred_geometry_carve, day_to_night_timelapse, mesh_crane_push, speed_ramp_punch
   reflective: diya_flicker_light, drone_top_down_bird_eye, day_to_night_timelapse, infinite_zoom_droste, morph_age_shift, disintegration_dispersal
- style (kinetic): slam, wave, mask, spring, flip, stack, glitch, extrude (glitch for shocks, slam for blows, mask/spring/flip for reveals, extrude = a 3D extruded word with a light sweep, best for ONE hero word of at most 14 letters; the system already applies it to short slam words).
- fx title_behind: a FULL-WIDTH headline typed in behind the figure's head so the person overlaps the letters (give text="…", 1-4 words; opening hook or one big reveal, at most 2 per film; the system already does this for the opening shot from THUMB). Needs a picture with a clear single figure.
- bg (animated backdrop behind kinetic/quote words): ink-clouds, nebula, embers, temple-jali, yantra, water-ripples, mountain-mist, storm, gold-bokeh, kolam, classic. Vary it: no two neighbouring text scenes share one. ink-clouds = grief/mystery, nebula = cosmic/divine, embers = war/fire, temple-jali = temple/devotion, yantra = sacred/power, water-ripples = river/calm, mountain-mist = journeys/distance, storm = fury/curses, gold-bokeh = boons/wealth/joy, kolam = festival/auspicious.
- mark: underline, circle, box, highlight, bracket (hand-drawn mark on the starred word). sticker: burst, diya, lotus, radiance, ring, sparkle (a short Lottie pop near a corner, use rarely). move: push, pull, panL, panR. reveal: circle, diamond, wipe (use at chapter starts). behind="…" puts a 2-4 word headline BEHIND the subject (hook and big reveals only, at most 3 per film).
- The system already guarantees: no effect three times in a row, at least 5 scene types a minute, subtitles hidden on text scenes, Ken Burns, grain, light leaks, living layers. Do not try to micromanage; direct only the beats that matter (about one in four).

=== THUMBNAIL RULES (a dedicated Flux painting is generated from these, in the palette you choose) ===
- THUMB_STYLE picks the palette: gold = Gold & Obsidian (warriors, gods, sacred weapons, epic moments); red = Red & Charcoal (betrayal, war, tragedy, sacrifice, turning points); teal = Teal & Gold (secrets, curses, hidden truths, mysteries, what-if); purple = Purple & Gold (cosmic events, avatars, divine realms); parchment = Parchment & Ink (explainers, origins, ancient texts, source-based stories). Leave it out and the system chooses from the story's mood, never repeating the last two.
- THUMB_SCENE (optional, <= 70 words, English) describes the exact moment instead; use it when you know the picture you want. The house style (obsidian black, antique gold, ivory, deep crimson, bronze; golden backlight; mature dignified Indian epic characters) is locked by the system; do not describe style, only the story.
- THUMB_ART describes ONE main figure with a strong facial emotion, one symbolic object that carries the story, and a dramatic backdrop that matches the palette. It must match what the narration is about (the thumbnail promises exactly what the film delivers).
- THUMB is a question or tension line that opens a gap the film answers; it shows as 2-3 lines on brush strokes with a red "?".

=== SELF-CHECK BEFORE ANSWERING ===
Word count in range; every beat line has a number; SCENES numbers exist; every fx/style/bg/mark value is spelled exactly as allowed; TITLE and THUMB do not repeat each other; no digits, no Latin letters in narration.