# Worked example: one real video, start to finish

This is not a made-up example. Every line below is the real data from a video that is
already live: **तमिस्र नरक: चोर को कैसी सज़ा मिलती है?** (`stories/video-tamisra-narak-chori-saza-short`,
https://youtu.be/0Qf3XGTZbUg). Use it to see exactly what you type, what the system decides on
its own, and why. The same mechanism (pack → script → director → art → video) also runs the long
videos — only the canvas shape and some limits change (see the note at the end).

---

## 1. What you actually type (the "pack")

In the Hub's **Create → New video** tab you pick a topic and a format, click **"Get the strict
prompt"**, give that prompt + the topic to any frontier model (ChatGPT, Claude, Gemini — your
choice), and paste its answer back. The pasted answer looks like this (this is the *real* pack
for this video, slightly shortened):

```
FORMAT: short
SLUG: tamisra-narak-chori-saza-short
TITLE: तमिस्र नरक: चोर को कैसी सज़ा मिलती है?
THUMB: यमदूत कहाँ ले जाते हैं?
THUMB_SUPPORT: गरुड़ पुराण की कथा
SOURCE_LINE: स्रोत: गरुड़ पुराण, प्रेतकाण्ड (नरक वर्णन); विष्णु पुराण एवं भागवत पुराण में भी वर्णित
TRADITION: यह कथा गरुड़ पुराण की नरक-परंपरा का अनुसरण करती है...
HASHTAGS: #kathaaya #गरुड़पुराण #तमिस्रनरक
LOOK: mood=sorrow grade=film captions=box transition=dissolve motif=ink bg=ink-clouds hue=20

NARRATION:
1 | [hook] जब आत्मा शरीर छोड़ती है, तो वह कहाँ जाती है?
2 | [curious] गरुड़ पुराण कहता है, हर कर्म का हिसाब होता है
3 | [tense] और जो दूसरों का धन *चुराता* है, उसके लिए एक विशेष लोक है
4 | नाम है तमिस्र नरक, अर्थात घोर अंधकार का लोक
5 | [narrate] पुराण कहते हैं, यमराज के दूत आत्मा को वहाँ ले जाते हैं
6 | न दीया है वहाँ, न सूरज की किरण, केवल घोर अंधकार
7 | [punch] वहाँ *चोर* को कोड़ों से दंड मिलता है
8 | [narrate] क्योंकि पुराण कहता है, चोर हमेशा अंधेरे में ही काम करता है
9 | दूसरे की नज़रों से छिपकर, रात के साये में
10 | [curious] तो क्या यह सज़ा सदा के लिए है?
11 | [reveal] नहीं, जब तक कर्म का फल पूरा नहीं होता, तभी तक यह लोक है
12 | [narrate] फिर आत्मा नए जन्म की ओर बढ़ती है
13 | [reflective] यह कथा डराने के लिए नहीं, जगाने के लिए है
14 | ईमानदारी से कमाया धन ही असली शांति देता है
15 | [reflective] यही सनातन परंपरा की सबसे पुरानी सीख है
16 | गरुड़ पुराण में ऐसे अट्ठाईस लोकों का वर्णन मिलता है
17 | [reflective] अगली कथा में अगले लोक की बात करेंगे, तब तक कथा से जुड़े रहिए

SCENES:
1 | glowing human soul | rising from physical body | dark forest clearing | dim silver moonlight
4 | hooded Yamadutas | binding a shadowy figure | misty southern pathway | faint grey twilight
6 | bound soul | walking through endless dark corridor | formless void | near total darkness
7 | thief figure | clutching stolen pouch | village rooftop at night | pale moonlight shadows
9 | cloaked thief | sneaking past sleeping household | dim village alley | single flickering lamp
11 | soul | stepping toward distant light | threshold between dark and dawn | soft golden horizon
14 | honest merchant | counting coins openly | sunlit marketplace | bright clear daylight
17 | glowing diya lamp | burning steadily | simple home altar | warm steady flame

VISUALS:
1 | comp=cinema fx=drone_push_in
7 | comp=kinetic style=slam bg=ink-clouds text=घोर अंधकार
13 | comp=quote bg=temple-jali text=यह जगाने के लिए है

CLAIMS:
गरुड़ पुराण परंपरागत रूप से भगवान विष्णु द्वारा गरुड़ को सुनाया गया माना जाता है | traditionally narrated by Vishnu to Garuda | traditional-account | garuda-purana-tradition
तमिस्र नरक पुराणों में चोरी के पाप के लिए वर्णित प्रथम नरकों में से एक है | Tamisra is a hell for theft in the Puranic naraka list | verified | vishnu-purana-bhagavata-purana-naraka-list
```

That's the whole input. Everything after this is automatic. Notice what is **not** in there:
no flux prompt for beats 2, 3, 5, 8, 10, 12, 15, 16 — only 8 of the 17 beats got a `SCENES`
line, and only 3 beats got a `VISUALS` line. The director decided the rest on its own. That is
the normal, expected pattern — see §4 for the rule.

---

## 2. What "script" and "narration" mean here

They are the same text, used two ways:
- **Script** = the `NARRATION` block above: one line per beat, each with an optional `[intent]`
  tag (`hook`, `curious`, `tense`, `narrate`, `punch`, `reveal`, `reflective`) and an optional
  `*word*` accent mark.
- **Narration** = that same text spoken aloud. `audio/synth.py` turns each beat into one spoken
  phrase through Chatterbox TTS. The `[intent]` tag is not decorative — it sets the voice's
  `exaggeration` value (the model's one reliable emotion control) and the pacing/pause around that
  line, via `tools/longform/director.mjs`'s `FX_BY_INTENT` table and `audio/director.py`'s
  emotion profile. `hook` gets a tighter, punchier reading; `reflective` gets a slower, calmer
  one; `punch` gets the hardest hit. You do not set tempo or loudness by hand — those are fixed
  post-processing, the only thing you can steer per line is which `[intent]` you write.

This video's real narration came out to **175 words, 55.9 seconds, 3.43 words/second while
speaking** (`narration/voice/meta.json`) — right in the "energetic reels pace" band the system
targets.

---

## 3. How a flux (image) prompt is built — and how to paste your own

If you want to hand-pick a picture instead of letting the system invent one, you write a
`SCENES` line:

```
<beat number> | <subject> | <action> | <setting> | <lighting>
```

Four short English phrases, separated by `|`. That's the whole format — no JSON, no quotes, one
line per beat. Word budget: subject ≤9 words, action ≤9, setting ≤8, lighting ≤6 (the system
trims if you go over). Keep them purely visual — no dialogue, no text/signs/banners (an image
model turns those into garbled lettering), no "camera angle" jargon, just what is physically in
frame.

Take beat 1's real line:

```
1 | glowing human soul | rising from physical body | dark forest clearing | dim silver moonlight
```

`tools/flux/prompt-director.mjs` turns that into the actual prompt sent to the local FLUX.2
Klein model. It appends a fixed **medium** phrase (photoreal cinematic look by default — there
are also `ravi-varma`, `pahari`, and `ink-parchment` painted styles if you ask for one) and a
fixed **composition** phrase (for 9:16 shorts: subject in the upper two-thirds, calm dark lower
third, so captions have room). This is the exact, real, verified prompt this system generated
and sent to the image model for beat 1:

```
glowing human soul, rising from physical body, photoreal cinematic film still, 85mm portrait
lens, strong directional key light, rich filmic color grade, natural shallow depth of field,
hyperreal skin and fabric texture, subtle film grain, anatomically correct symmetric face,
natural detailed eyes, dark forest clearing, dim silver moonlight, subject in the upper two
thirds of a vertical frame, calm darker lower third, a purely visual image, every surface
plain and unmarked.
```

71 words — inside FLUX's working range of 35–95 (Klein does no prompt upsampling, so vague or
too-short prompts come out generic; too-long ones bury the subject).

**If you'd rather paste a full prose prompt from your own frontier model instead of the four
short fields**, you can — the pack's `SCENES` line also accepts a single free-text prompt, and
the system appends only the medium + composition phrases on top (unless you mark it "raw," in
which case it uses your text completely unchanged).

**If you give nothing for a beat**, `tools/longform/art.mjs` asks a local writer model to invent
a `{subject, action, setting, lighting}` spec from that beat's own narration words — never from
outside facts — builds the same kind of prompt, and generates the picture. You lose precise
control over that one image, but nothing breaks and nothing is skipped.

---

## 4. How many scenes (pictures) you need to supply — the real number

You do **not** need one `SCENES` line per narration beat. This video had **17 narration beats**
and used **14 distinct generated pictures** total:

- **7 pictures came from your `SCENES` lines** (beats 1, 4, 6, 7*, 9, 11, 14, 17 — *beat 7's
  picture was never generated because the `VISUALS` override turned beat 7 into a pure text
  beat instead, see §5).
- **7 pictures were invented by the director/art pipeline on its own** (auto keys `scene0`
  through `scene10`, reused across 2–3 consecutive beats that are "the same story moment" seen
  from a different angle before moving on).
- **3 beats used no picture at all** — they became animated text instead (a kinetic punch line,
  a quote card), because that beat is a line, a turn, or a punch that lands harder as bold
  moving text on a dark backdrop than as another painting.

**The rule to follow when you paste your own prompts:** only write a `SCENES` line for a beat
that is a genuine new **story moment** — a new place, a new character action, a turning point,
or the single most important image of the whole film (the hook, the reveal, the final image).
Do not write one for every line of narration; two or three consecutive beats describing the
same moment should share one picture (just vary the camera move), and a short punchy line is
often better as a `VISUALS` text override (§5) than as a picture at all. As a rough budget: a
45–90s short needs roughly **6–10 pictures total**; an 8–12 minute long-form video needs roughly
**20–35**. The director fills in anything you leave blank, so when unsure, leave it blank and
check the result rather than overspecifying.

---

## 5. How the visual TYPE (kinetography) is decided for each beat

This is the part that happens with no input from you at all, beat by beat, in
`tools/longform/director.mjs`. For every narration line the director (a model call, validated
and auto-corrected by deterministic rules that can never fail) picks exactly one of these
components:

| component | what it is | picked when |
|---|---|---|
| `cinema` | a full-screen picture with a slow camera move (push/pull/pan) and an optional reveal shape | the default: a story moment that needs to be *seen* |
| `fx` | a picture with one of 30 strict named cinematic effects (drone push, crane reveal, god rays, disintegration, mesh 3D moves, etc.) | a moment with mood/weight — the effect is chosen from a table keyed to the beat's `[intent]` (e.g. `hook`→`drone_push_in`/`particle_formation`, `tense`→`handheld_shake`/`lightning_flash`, `reveal`→`volumetric_god_rays`/`double_exposure_cosmos`, `reflective`→`diya_flicker_light`/`morph_age_shift`) |
| `kinetic` | big animated words slamming/waving/flipping onto a plain backdrop, one accent word in gold | short punchy lines (≤5 words), the opening hook, rhetorical questions, shocks |
| `quote` | a spoken line typed out like scripture | a key line worth quoting verbatim |
| `stat` / `bars` / `linechart` | a number/counter or chart | **only** if the narration itself states a real number — the validator strips these out and replaces them with `kinetic` if the on-screen figure isn't literally in that beat's words, so numbers are never invented |
| `timeline` / `graph` / `iconlist` | a sequence, a relationship web, or a 3-4 item list | the narration lists steps, family/alliance ties, or "three things" |
| `dotword` | the channel's signature: a word built from thousands of gold dots | the single title/oath/concept the whole film turns on (capped at 3 uses per film) |
| `chapter` | a title card | the start of a new chapter |
| `orb` / `mandala` | a 3D divine/cosmic layer or a quiet generative pause | rare, cosmic or silent beats only |

**For this video**, here is what the director actually chose and why, beat by beat:

| # | beat text (short) | intent | → component | why |
|---|---|---|---|---|
| 1 | जब आत्मा शरीर छोड़ती है... | hook | `fx` + kinetic text over `s1` (your picture), `drone_push_in` | opening hook: your `VISUALS` line asked for `drone_push_in`; the hook rule always layers a punchy text line on top |
| 2 | गरुड़ पुराण कहता है... | curious | `cinema`, auto picture `scene0`, `2.5d_parallax` | new story moment, no override → auto picture, calm-depth effect fits "curious" |
| 3 | और जो चुराता है... | tense | `cinema`, `scene1`, `kinetography_cinemagraph` | continues the same moment (shares a key with beat 2's family of shots), cinemagraph effect for quiet dread |
| 4 | नाम है तमिस्र नरक... | — | `fx`, your picture `s4`, `crane_up_reveal` + burst sticker | you supplied the picture; a new named location gets a reveal-style camera move |
| 5 | यमराज के दूत ले जाते हैं | narrate | `cinema`, `scene3`, `mesh_ken_burns_3d` | calm narrating beat → the real-3D Ken Burns move (not the flat one) |
| 6 | न दीया, न सूरज... | — | `fx`, your picture `s6`, `parallax_occlusion_3d` | your picture; calm depth effect for "nothing but darkness" |
| 7 | चोर को कोड़ों से दंड | punch | `kinetic`, "घोर अंधकार", style `slam`, bg `ink-clouds` | **you overrode this one directly** with a `VISUALS` line — your choice always wins over the director's |
| 8 | चोर हमेशा अंधेरे में | narrate | `cinema`, `scene5`, `kinetography_cinemagraph` | auto picture |
| 9 | रात के साये में छिपकर | — | `fx`, your picture `s9`, `crane_up_reveal` | your picture |
| 10 | तो क्या सज़ा सदा के लिए? | curious | `kinetic`, "तो *क्या* यह सज़ा...", style `wave` | short rhetorical question → always text, accent word auto-marked |
| 11 | नहीं, कर्म का फल पूरा होने तक | reveal | `fx`, your picture `s11`, `volumetric_god_rays` | your picture; "reveal" intent → god-rays from the effect table |
| 12 | फिर आत्मा नए जन्म की ओर | narrate | `cinema`, `scene8`, `drone_orbit_180` | auto picture |
| 13 | यह डराने के लिए नहीं, जगाने के लिए | reflective | `quote`, "यह जगाने के लिए है", bg `temple-jali` | **you overrode this one** with a `VISUALS` quote line |
| 14 | ईमानदारी से कमाया धन | — | `fx`, your picture `s14`, `eye_glow_energy_pulse` | your picture |
| 15 | यही सनातन परंपरा की सीख | reflective | `cinema`, `scene9`, `disintegration_dispersal` | auto picture, transition/closing feel |
| 16 | अट्ठाईस लोकों का वर्णन | — | `cinema`, `scene10`, `morph_age_shift` + sticker | auto picture |
| 17 | अगली कथा में... | reflective | `fx`, your picture `s17`, `diya_flicker_light` | your picture; closing devotional feel |

Underneath this per-beat choice, four pacing rules run automatically and cannot be turned off
(the validator rewrites anything that breaks them):
1. **No repeat types back to back** — the same non-picture component never runs twice in a row.
2. **No more than 2 text-only beats in a row** (kinetic/quote/chapter/dotword) before a picture
   has to appear.
3. **The same effect never repeats within 3 picture beats** — you can see this above: no two
   effects in the table are the same within any 3-row window.
4. **At least 5 different visual types in every rolling 60-second window.** This film changes
   visual type roughly every 3.3 seconds (17 beats across 55.9s) — well inside that rule.

You can override any single beat's component, effect, backdrop, style, or text with a `VISUALS`
line (format: `N | comp=... fx=... style=... bg=... text=... move=... reveal=... label=...` —
only the keys you set are changed) and it always wins over the director's own choice, as you saw
on beats 1, 7, and 13 above. Everything you leave unset is still bound by the 4 rules above, so
the film never gets monotonous even where you didn't specify anything.

---

## 6. The whole pipeline, in order

```
your topic + pasted pack
        │
        ▼
tools/video/pack.mjs       parses NARRATION/SCENES/VISUALS/etc → beats.json, pack.json
        │
        ▼
audio/synth.py              beats.json → spoken narration.wav (Chatterbox TTS, one phrase per
                             beat, [intent] sets exaggeration) + segments.json (exact timing)
        │
        ▼
tools/longform/director.mjs beats.json + segments.json → plan.json (one visual component +
                             params per beat, your VISUALS overrides applied last, 4 pacing
                             rules enforced)
        │
        ▼
tools/longform/art.mjs      generates any picture the plan needs and you didn't supply a
                             SCENES line for (local FLUX.2 Klein, tools/flux/)
        │
        ▼
tools/longform/make-scene.mjs + tools/layers/camera-clips.mjs
                             plan.json + pictures → scene.js (the actual animated render script:
                             camera moves, effects, reveals, kinetic text, captions)
        │
        ▼
render + QA + package        final video + thumbnail + publish.json, ready to review and post
```

Nothing after step 1 needs you — you only ever touch the pack. Re-pasting a changed `VISUALS` or
`SCENES` line and re-running only re-does the steps that actually changed (the pipeline caches
by content fingerprint).

---

## 7. What's different for a long video

Same pipeline end to end. What changes:
- Canvas is 16:9 landscape instead of 9:16 portrait (`COMPOSITION.hero` instead of `.carousel`
  in the flux prompt — wide composition, subject left of centre).
- `##  Title` lines in `NARRATION` start a chapter (3+ chapters required; becomes real YouTube
  chapter markers).
- Word budget is larger (540–2160 words vs. 130–540 for a short).
- Roughly 20–35 pictures total instead of 6–10, because there's more runtime to fill at the
  same "new visual every few seconds" pacing rule.
- Machine time is roughly 2 hours for 8 minutes of finished film (voice ≈ 6× the speech length,
  each picture ≈ 45s, render ≈ 0.8× the film length).

See `docs/VIDEO_PACK.md` for the full field reference and `docs/LONGFORM.md` for long-form
specifics.
