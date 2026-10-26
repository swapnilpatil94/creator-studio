# Build prompt: "Reel Factory" for Claude Code (Sonnet 3.5) on your personal Mac

Paste everything below the line into Claude Code, opened at the root of your studio repo. The prompt is
self-contained: it includes the design system, the engineering rules learned in practice, the data
contracts, the prompts for the local models, and the acceptance tests.

---

# ROLE
You are a staff engineer building **Reel Factory**, a fully local pipeline inside my existing studio repo.
I give it a story or script; it outputs a finished 9:16 Instagram reel (1080x1920, 30 fps, 45-100 s) with
voiceover, collage visuals, a one-take camera, animations, SFX, music and a final mix. It must handle any
story genre and produce visibly different videos each time.

# OPERATING RULES (strict)
1. **Explore before building.** Map the repo: stack, package manager, how existing tabs/pages and backend jobs
   are wired, existing Flux/Chatterbox/ffmpeg integrations, config and env handling, tests. Write
   `docs/reel-factory/RECON.md` listing what you will REUSE vs ADD, then show it to me and wait for my OK.
2. **Git:** create branch `feat/reel-factory` from the default branch. Make small commits per phase with clear
   messages.
   Never force-push, never rewrite history, never touch unrelated code. Don't push without asking.
3. **Ask before:**
   - downloading any model, with a table of name, source, size and licence, and the total
   - using `sudo` or changing system settings (for example `iogpu.wired_limit_mb`)
   - installing global tools
   - deleting anything
   - any network call other than package and model downloads
4. **Phase gates:** after each phase, run its acceptance checks, show me the evidence (command output,
   contact sheets, a short MP4), and wait for my go-ahead before the next phase.
5. **Never invent facts** in scripts. Never present legends or supernatural claims as fact. No gore. No likeness of
   real people. Record the licence of every model, font, icon, SFX and music file in `assets/LICENSES.json`.
6. **Run 100% local at runtime.** Only downloads are allowed to touch the network.
7. **Memory budget: 24 GB unified.** Never load the LLM, image model and TTS at the same time. Run stages
   sequentially and unload each model after its stage (Ollama `keep_alive: 0`, free MPS caches). Check free memory
   before each heavy stage.
8. When unsure about something I must decide (voice, music style, channel name), ask. Don't guess.

# INPUTS TO ASK ME FOR (in Phase 0)
- Where my existing Flux setup lives (ComfyUI, mflux or diffusers) and which model. Reuse it if it's good,
  else propose FLUX.1-schnell-4B (4-bit, via mflux).
- Chatterbox: the existing install path; whether to clone a voice (I'll supply a clean 10-20 s reference clip of
  **my own** voice or a consented voice) or use a stock voice.
- Disk budget for models (expect about 30-45 GB).
- Music: let me supply a royalty-free folder, or propose a local Apache-2.0 music model if one runs on Apple
  Silicon.
- A Hugging Face token, only if a chosen model is gated.

# ARCHITECTURE (implement exactly this)
A **pipeline, not an agent**. LLM calls happen only at the Writer (optional), Director and Critic stages, and
every stage reads and writes files so it can be resumed or rerun on its own.

```
episodes/<slug>/
  input/script.md             # my script, or a topic + facts + sources for the Writer
  01_lines.json               # script split into narration lines [{id,text,lang}]
  02_audio/line_XX.wav        # TTS per line
  03_align.json               # word timestamps per line
  04_beatplan.json            # Director output (schema-validated)
  05_assets/                  # Flux PNG cutouts (+ optional SVG), icons
  06_composition/index.html   # HyperFrames composition (generated)
  07_qa/                      # stills, contact sheet, DOM report, critic.json
  08_render/video.mp4         # silent render
  09_mix/final.mp4            # VO + music + SFX, -14 LUFS
  manifest.json               # stage status, hashes, model versions, timings
```

**Stages:**
1. **Writer** (optional): topic + facts + sources -> Hindi/Hinglish script, using the genre template. Every
   claim must trace to a supplied fact or source; otherwise write `[VERIFY]`. Output is always marked DRAFT for my
   review.
2. **Split:** script -> narration lines of 6-20 words. Numbers are rewritten as words for TTS.
3. **Voice:** Chatterbox Multilingual, `language_id="hi"` (or the `Chatterbox-Multilingual-hi` fine-tune if
   better). One clip per line. Defaults: `exaggeration 0.6`, `cfg_weight 0.4`, `temperature 0.7`.
   Trim silence and normalise per clip.
4. **Align:** mlx-whisper (large-v3-turbo) word timestamps. Beat duration = clip length + 0.9 s (camera move).
5. **Direct:** a local LLM (default `gpt-oss:20b` via Ollama; alternative `qwen3-coder:30b`) produces the beat
   plan.
   Constrain decoding with Ollama `format` = the JSON Schema. Validate and repair at most 2 times, then fail
   loudly.
6. **Assets:** for each asset request, append the theme's style lock, use a fixed seed per asset id,
   generate 2 candidates, cut out with rembg (BiRefNet), and cache by hash (`assets/cache/`). Recurring
   characters are reused across beats and episodes. Icons come from local icon packs recoloured to theme tokens.
7. **Compose:** deterministic Node/TS. Beat plan + assets + theme -> HyperFrames `index.html`, using the
   component library and the one-take camera. There is **no LLM in this stage.**
8. **QA:**
   - Deterministic DOM checks in headless Chrome: text inside the safe zone, no text-box overlaps, no
     missing glyphs (Devanagari), contrast >= 4.5, no empty frames, every beat has motion.
   - Then a VLM critic (`qwen3-vl:8b`) scores one still per beat.
   - Up to 2 auto-fix rounds using only these operations: shorten_text, swap_component, regen_asset, move_slot.
9. **Render:** `npx hyperframes render` (Node 22 + ffmpeg), plus a 540x960 preview mode.
10. **Mix:** ffmpeg.
   - VO track concatenated at the beat starts.
   - SFX placed on cues from the beat plan.
   - Music bed ducked under the VO (`sidechaincompress`).
   - `loudnorm` to -14 LUFS integrated, -1.5 dBTP.
   - Mux into the MP4 and write a `.srt` subtitle file.

**Interfaces:**
- **CLI:**
  `reel new <slug>`
  `reel make <slug> --theme <t> --genre <g>`
  `reel stage <slug> <stage>`
  `reel preview <slug>`
  `reel qa <slug>`
  `reel eval`
- **Studio tab "Reels"**, reusing the existing tab, page and job wiring:
  - an episode list
  - a new episode form (script or topic+facts, theme, genre, voice)
  - a stage progress view with logs
  - a contact-sheet review with per-beat "regenerate asset / swap component / edit text"
  - a preview player
  - an approve-and-export button
  - Long jobs run in the studio's existing job system if one exists; otherwise a simple local queue.

# DESIGN SYSTEM (shared by all themes)
- **Canvas:** 1080x1920. **Text safe zone:** x 60-900, y 150-1250 (Instagram's UI covers the right rail and
  bottom).
- **Headlines:** each line on its own **torn paper strip**, rotated +-1-2 deg, with line 2 (or the accent line) in the
  accent colour. Use at most 3 lines and at most 4 words per line, auto-fit to the safe-zone width.
- **Devanagari fonts:** Teko 700 for headlines (line-height 1.12, padding-top larger than bottom for matras),
  Kalam 700 for handwritten notes, Mukta 600/800 for tags, Tiro Devanagari Hindi for manuscript text.
  Latin equivalents: Anton, Permanent Marker, IBM Plex Mono. Vendor all fonts locally. Never load from a CDN at
  render time.
- **Collage primitives:**
  - torn `clip-path` polygons from a seeded generator, shared with a hard-offset `::before` shadow
  - masking tape (z-index only inside its piece)
  - taped tags, rubber stamps (slam in at scale 3 -> 1 in 0.22 s)
  - marker strokes drawn on with `stroke-dashoffset`
  - halftone dot pattern overlays
  - an SVG cutout filter (white sticker border plus a hard shadow)
  - paper grain generated once as a canvas image
- **One-take camera** (the signature look):
  - The world is one large board with stations laid out in a 2-column ring, so the last station sits next to the
    first.
  - `camAt(t)` is a pure function. While resting, the camera pushes in slowly (+3.5%). Moves take 0.9 s with
    `power3.inOut`, a 22% zoom-out dip mid-move, and rotation matched to each station's +-2 deg tilt.
  - Impact beats add a decaying shake.
  - The final move returns to station 1, so the reel loops seamlessly.
  - Alternative camera generators to implement: `OneTakeRing`, `EvidenceBoardString` (follows a red string
    between clues), `ZoomThrough` (into an object to the next scene), `ParallaxPan`, `Spiral`.
- **Boil:** every piece jitters on twos (12 fps), seeded, with a 2 s cycle. Content enters about 0.25 s before the
  camera lands.
- **Loop safety:** cyclic motion uses whole cycles per video (`angle = 360 * n * t / TOTAL`).

# ENGINEERING RULES (hard requirements, each learned from a real bug)
1. **Deterministic:** no `Math.random`, `Date` or wall clock. Use seeded hashes and timeline time only. The same
   inputs give
   byte-identical stills (add a test for this).
2. **All motion in one paused GSAP timeline** at `window._timelines["<id>"]`, plus a per-frame `frameUpdate(t)`
   for
   procedural motion (orbits, counters, particles, flags, camera).
3. **No `url(#gradient)` strokes on perfectly straight `<line>`s.** Their bounding box has zero height, so they
   don't render.
   Use solid colours.
4. **Never tween SVG nodes that already have a `transform` attribute**, and never use GSAP `svgOrigin` inside
   translated
   groups. Wrap the element and animate the wrapper, or compute the transform in `frameUpdate`.
5. **Hidden until entrance:** every off-stage element starts at `opacity: 0`. Otherwise it leaks into neighbouring
   stations of the one-take world.
6. **Render cost:** no live CSS `drop-shadow` filters on many elements, and no live SVG noise. Use cheap hard
   shadows and
   pre-baked grain. Keep the render at or below 0.3 s per frame at 1080p on an M4 Pro.
7. **Uppercase transforms** must not touch units ("dB", "uPa"). Wrap them in a no-transform span.
8. Every component ships with: a props JSON Schema, a `when_to_use` sentence, a demo beat JSON, and a golden still.

# COMPONENT LIBRARY v1 (at least 30 components, mapped to beat archetypes)
- **Beat archetypes:** hook, character_intro, big_number, comparison, process_steps, options, cause_effect,
  date_era, place, quote, evidence_reveal, twist, countdown_time, many_scale, consequence_today, loop_cta.
- **Text:** HeadlineStrips (variants torn | ransom | brush | tape), Tag, Stamp, Note, NewsClip, Ticket,
  Typewriter, QuoteCard.
- **Data:** Counter (flip / roll), DayCounter, Gauge, Ruler, BalanceScale, Checklist (tick / cross / strike),
  ProgressBar,
  Timeline, VersusSplit, Chart (supplied data only), IconGrid (many / scale).
- **Objects:** Cutout (enter: slide | rise | pop | fly | drop), CutoutPair (size compare), Magnifier, XRay,
  FamilyTree,
  MapPin (GeoJSON outlines for India and its states, plus world countries), Polaroid, CaseFile, Redaction,
  Flashlight.
- **FX:** Burst, Orbit, Particles (petals | sparks | bubbles | dust), Glow, Shake, MarkerDraw, Stars, MandalaSpin,
  SpeedLines, VHSGlitch (deterministic, short accents only), Fingerprint.
- **Story:** TheoryCountdown (3 -> 2 -> 1), VerdictStamp (सच | अफवाह | आधा सुलझा | अनसुलझा), UniversalFallback
  (HeadlineStrips + Cutout + a motion preset). The fallback is always valid and logs a "gap".
- Also import useful blocks from the HyperFrames registry (`npx hyperframes catalog`) for transitions and kinetic
  type, instead of hand-writing them.

# THEME PACKS v1 (at least 5, each = tokens.json + DESIGN.md + Flux style lock + allowed components)
| Theme | Genre | Palette (hex) | Flux style lock (appended to every subject) |
|---|---|---|---|
| `rahasya` | mystery / desk | #15130F, manila #D9B97A, paper #EDE6D6, red #B3261E, evidence #F2C94C, cold #3A5A78 | moody cinematic illustration, muted desaturated colours, film-noir lighting, subtle film grain, single subject, plain dark background, no text, no gore |
| `pothi` | mythology / folk | maroon #6B1E22, saffron #E8892B, gold #D4A73A, indigo #1E2A5C, night #121A33, ivory #EFE2C2 | flat Indian folk-art illustration, Pattachitra and leather shadow-puppet inspired, bold clean silhouette, limited palette maroon saffron gold indigo ivory, ornamental dot pattern, single subject, plain off-white background, no text |
| `field-notebook` | nature / science | kraft #C9B48A, ink #2A1E14, red #C04428, cream #EDE3CF, xray #1A1A1A | vintage scientific museum plate illustration, detailed naturalist engraving, subtle halftone dots, side view, single subject, plain light background, no text |
| `collage-ocean` | science / explainers | ink #141414, cream #F2EADB, deep #0F3B4C, sea #2C7A8C, aqua #8FD3D1, coral #F26B3A, yellow #F7C948 | bold flat cut-paper collage illustration, thick clean shapes, coral teal navy cream palette, halftone texture, single subject, plain background, no text |
| `ledger` | business / money | paper #F4F1EA, ink #111, green #1F7A4D, red #C62828, gold #C9A227 | clean editorial illustration, risograph print texture, two-colour green and black, single subject, plain background, no text |

Sensitive-content rules per theme. In `pothi`, deities appear only as symbols (peacock feather, footprint,
chakra, lotus, crown on a thali); there is no gore, and folk tales get a "लोककथा" tag.

# DATA CONTRACT: 04_beatplan.json (write the JSON Schema; enforce with Ollama `format`)
```json
{
  "title": "string", "theme": "enum(themes)", "genre": "enum(genres)", "camera": "enum(cameras)",
  "sources": ["string"], "warnings": ["string"], "gaps": ["string"],
  "beats": [{
    "id": 1, "line_ids": [1], "archetype": "enum(archetypes)", "component": "enum(catalog)",
    "variant": "string", "on_screen": ["max 3 items, each <= 28 chars"], "accent_line": 1,
    "sheet": "enum(theme sheets)",
    "assets": [{"id": "snake_case", "subject": "<= 140 chars, subject only, no style words", "reuse": true}],
    "motion": ["enum(motion presets)"], "emphasis_word": "string",
    "sfx": [{"at": "enter|emphasis|impact|exit", "name": "enum(sfx bank)"}],
    "verdict": "optional enum(सच|अफवाह|आधा सुलझा|अनसुलझा)", "loop_to_start": false
  }]
}
```

# LOCAL-MODEL PROMPTS (store in `prompts/`, versioned)
**Director (system):**
```
You are the DIRECTOR of a short-form video studio that makes viral 9:16 Hindi reels. You never draw,
write code, or invent components. You plan scenes by choosing from a fixed catalog.
INPUT: script lines [{id,text,seconds}], theme, genre template, catalog [{name, archetypes, when_to_use,
props_schema}], recent_usage (components used in the last 10 videos), learnings (what performed).
OUTPUT: one JSON object matching the schema. No prose.
RULES: one beat per line (split only if seconds > 8.5) • on_screen max 3 lines x 4 words, never the
full narration; the payoff word goes on the accent line • component only from the catalog, chosen by
archetype + when_to_use; never the same component twice in a row; prefer ones not in recent_usage •
every beat has motion • beat 1 = strongest TRUE shock/payoff • re-hook at 50-60% • the last beat has
loop_to_start=true and leads back into beat 1 • assets: subject only, reuse ids for recurring characters,
max 18 unique • digits on screen • never add facts • legends attributed ("लोग कहते हैं") • deities as
symbols only • no gore, no real-person likeness • if nothing fits, use UniversalFallback and add a "gaps" note.
```

**Genre add-on: rahasya** (one add-on per genre, the same way):
```
12 beats: impossible fact -> place/date -> discovery -> weird detail x2 -> first explanation -> re-hook
(Redaction or Flashlight) -> theories 3,2,1 (TheoryCountdown) -> VerdictStamp -> question + loop.
The verdict must match the evidence in the script. Nothing from the last 25 years involving living families.
```

**Critic (VLM, system):**
```
You are a strict motion-design QA reviewer. You get one 1080x1920 still per beat plus the beat JSON.
Judge only what you see. Return JSON {"beat":n,"score":1-10,"issues":[{"type":"text_overlap|text_cut|unreadable|empty_area|asset_wrong|asset_ugly|off_style|clutter","detail":"_","fix":"shorten_text|swap_component|regen_asset|move_slot|none"}]}. Score 8+ only if the headline is readable at phone size, nothing important is hidden or cut, the asset clearly shows the subject, the frame matches the theme, and it is neither empty nor cluttered.
```

**Writer (optional, system):** follow the genre template. Use only the facts and sources provided. Mark anything
else `[VERIFY]`. Write Hindi in Devanagari, conversational, about 2.5 words/second, numbers as words, and a last
line that loops into the first.

# SFX & MUSIC
- **SFX bank** (>= 25 cues): whoosh (camera move), paper_slide, tape_rip, stamp_thud, marker_squeak,
  typewriter_key, typewriter_bell, camera_shutter, polaroid_eject, heartbeat, riser (before the re-hook),
  impact_low, drum_hit, snap_crack, glitch, page_flip, coin, tick, bell, wind, drone_bed (mystery),
  tanpura_drone (mythology), sparkle, pop, thump.
- **Sources, in order of preference:**
  1. Procedurally synthesised with ffmpeg/sox (deterministic, licence-free)
  2. CC0 packs (e.g. Kenney audio)
  3. Packs I provide
  Write every file's licence to `LICENSES.json`. No non-commercial-licensed models or packs.
- **Cue placement** comes from the beat plan (`enter`, `emphasis` at the emphasis word's timestamp, `impact` on
  shakes,
  `exit` on the camera move).
- **Music:** a bed per theme (mystery drone, mythology tanpura/flute, science light pulse), ducked about 18 dB
  under the VO.

# MODEL DOWNLOAD PLAN (verify exact tags and sizes at runtime; show me this table before downloading)
| Purpose | Candidate | Approx size |
|---|---|---|
| Director LLM | `gpt-oss:20b` (Ollama); optionally `qwen3-coder:30b` | ~13 GB; ~19 GB |
| Vision critic | `qwen3-vl:8b` (Ollama) | ~6 GB |
| Images | reuse my Flux, else `FLUX.1-schnell-4B` 4-bit (mflux) | ~4.5 GB |
| TTS | Chatterbox Multilingual (+ `Chatterbox-Multilingual-hi`) | a few GB |
| Alignment | `mlx-whisper` large-v3-turbo | ~1.6 GB |
| Cutout | rembg BiRefNet | ~1 GB |
If a tag doesn't exist, find the current equivalent, explain the substitution, and ask.

# PHASES & ACCEPTANCE (stop after each and show evidence)
- **P0 Recon + setup:** RECON.md; Node 22, ffmpeg, HyperFrames CLI (`npx hyperframes` doctor/preview works),
  Ollama, Python env (uv); downloads after my approval; `reel doctor` checks every tool and model with a smoke
  test.
- **P1 Core engine:** design system, collage primitives, one-take camera, deterministic test, and 12 components.
  **Golden test:** a hand-written beat plan (Hindi, `pothi`, 8 beats) renders cleanly; I review the contact sheet.
- **P2 Library + themes:** at least 30 components and 5 themes. A demo episode per theme from hand-written beat
  plans.
  Render speed at or below 0.3 s/frame.
- **P3 Assets:** Flux style locks, rembg, cache, recurring characters. 15 assets per theme in a consistent style.
- **P4 Director + eval:** schema, prompts, and `reel eval` over **30 test scripts across 10 genres** (mystery,
  mythology,
  science, history, space, business, crime-history, psychology, geography, biography).
  Pass: 100% schema-valid, >= 85% of beats using a non-fallback component, average critic score >= 8, and no
  component repeated
  back-to-back. Compare gpt-oss-20b and qwen3-coder-30b; keep the winner.
- **P5 Voice + align + mix:** per-line TTS, timestamps, retiming, SFX cues, ducking, -14 LUFS, SRT.
- **P6 QA loop + Studio tab:** DOM checks, critic, 2 auto-fix rounds, and the full Reels tab with per-beat
  regeneration.
- **P7 End-to-end:** from the Studio tab, paste the test script below with theme `rahasya`. `final.mp4` must be
  produced
  with VO, SFX and music, unattended, in <= 30 min. Every QA check passes, and the loop frame matches frame 0. Then
  make the same
  story in `pothi` and `field-notebook` to prove the themes are truly different.

# DEFINITION OF DONE
- `reel make` and the Studio tab both produce a finished, mixed reel from a script with no manual steps.
- Changing the theme or genre changes the look and the structure, and `recent_usage` prevents repeats across 5
  consecutive
  videos.
- Gaps are logged to `gaps.jsonl`; `reel gaps` shows the top missing components (this is my backlog for new
  components).
- Docs: `docs/reel-factory/README.md` (usage), `ARCHITECTURE.md`, `COMPONENT_SPEC.md`, `THEMES.md`, `LICENSES.json`.
- All tests pass: schema, determinism, golden stills, the eval report saved in `docs/reel-factory/eval/`.

# TEST SCRIPT (rahaya #01, रूपकुंड). Re-check these facts against the 2019 Nature Communications study before publishing
```
1. हिमालय में एक झील है... जिसके किनारे सैकड़ों इंसानी कंकाल पड़े हैं।
2. उत्तराखंड, समुद्र से क़रीब पाँच हज़ार मीटर ऊपर — रूपकुंड।
3. उन्नीस सौ बयालीस में एक फ़ॉरेस्ट रेंजर ने इन्हें देखा।
4. हर साल जब बर्फ़ पिघलती है... कंकाल फिर दिखने लगते हैं।
5. अंदाज़ा है — तीन सौ से ज़्यादा लोग।
6. पहले लगा, ये युद्ध में फँसे जापानी सैनिक हैं।
7. लेकिन DNA ने कहानी ही बदल दी...
8. दो हज़ार उन्नीस की एक स्टडी में अड़तीस कंकालों का DNA जाँच गया।
9. ज़्यादातर लोग दक्षिण एशिया के थे — क़रीब बारह सौ साल पहले के।
10. पर एक समूह भूमध्यसागर की तरफ़ के लोगों जैसा था — और वो सिर्फ़ दो सौ साल पहले मरे।
11. यानी एक हादसा नहीं — सदियों के फ़ासले पर हुई मौतें! फ़ैसला: आधा सुलझा।
12. आपको क्या लगता है — ये लोग यहाँ क्यों आए थे? ...हिमालय में एक झील है...
```

Start with P0: explore the repo and write RECON.md. Don't write feature code until I approve it.