# Carousel to Reel: content plan and tech plan (2026-10-18)

> **Look changed (2026-10-18): default style is now "cinema", the old stipple look is an option** (`REEL_STYLE=stipple` or `style: "stipple"` on /api/hub/reel/make). Why: the owner found the stipple look poor, and when a web search was made for evidence on which visual style retains viewers, no reliable data comparing styles turned up (only vendor blogs; first-3-seconds and captions guidance is the best supported point). So the choice rests on principles, not stats: a clear whole image the eye can read (stipple hid detail and faces), visible motion in the first second (hook punch-in), high-contrast kinetic captions, warm grade, light rays, embers, grain and a golden dot-burst between pictures (the dots survive as brand accent). `engine/reels/scene-cinema.js` draws it in 2D canvas only (no WebGL, no stipple sampling: a faster prepare step). Test it: compare both styles on retention with `insights.mjs` for two weeks before standardising.


## 1. Decision and why
**Yes, but not as a slideshow.** Same research, claims and pictures; a different experience: stippled paintings that form out of dots, kinetic Devanagari headlines on the beat, an emotional Hindi voice, designed sound, 75-90 seconds.
- Meta's originality rules (April 2026 extension to photos and carousels) target reposting other people's work; our art and research are our own. We found no reliable data comparing slideshow-style reels with original video, so the reach claims on vendor blogs are not used.
- YouTube is the careful one: since July 2025 its "inauthentic content" wording (mass-produced or repetitive uploads; reports name static images over a synthetic voice with minimal human input) puts plain slideshows with AI voice at risk for monetization. Our reels are animated, sourced, researched and reviewed, which is the opposite pattern, but the exact policy text should be confirmed on YouTube's YPP help page and the risk is real for a synthetic voice. Mitigations: real design and animation, a human approval step, varied hooks and structure, no two reels from one template look identical, and we watch the channel's YPP status.
- One idea, many assets: the carousel (reading), the reel (watching), later a blog (searching). The Hub adds the reel as a one-click step.

## 2. Content plan
- **Cadence:** carousels daily (cheap), reels 3 per week to start (Mon, Wed, Fri 19:00 IST) because each costs about 35 minutes of Mac time and 20 minutes of review; raise to daily only after two weeks of data.
- **Stagger:** the reel of a story posts 2 or more days after its carousel with a different hook line, so one story is not posted twice on one platform in a day.
- **Structure (75-90 s, about 250-295 spoken words):** hook (0-6 s, restates the carousel question) → context → stakes → the turn (a silence, then the reveal) → resolution → one call to action (save + follow). Each slide gets about 25-30 words, so slides run 6-9 s: a visual change every 6-9 s plus kinetic text on every beat.
- **Voice:** the narration is written for the ear (a separate text from the slide captions), only from facts in the claims; energetic and warm; the emotion arc (hook, curious, narrate, tense, reveal, reflective) is assigned automatically and can be overridden per line with `[intent]`.
- **Quality bar:** the same QA gate (claims, bait, stats, belief, Hindi slips) now also reads the narration; narration length is checked (WARN outside 70-95 s).
- **Measure for two weeks:** reach, watch time, saves, follows per format with `tools/content/insights.mjs`; keep reels only if they earn their cost.

## 3. Tech plan (what was built and why)
| Piece | Choice | Why |
|---|---|---|
| Renderer | our own deterministic engine (headless Chromium + canvas/WebGL, `renderAt(t)`) | already proven for the Short and the 10-minute film; Remotion/Motion Canvas/Revideo add React or a build chain and a license check without giving us stippling |
| Stippling | `engine/stipple` (Poisson-disk + weighted Lloyd, Three.js Points, every dot a GPU particle) | real dots that form, scatter and re-form; 4-5 s per image to sample |
| Typography/captions | 2D overlay canvas in the same frame | pure functions of t and the voice's word times, so a re-voiced take re-times everything |
| Voice | Chatterbox Hindi via `audio/` (cached per phrase, auto QC) | the channel's voice; edits cost only the changed phrases |
| Sound | `engine/dot-cinema/sound.mjs` procedural bed + cues from `tools/reel/sound-reel.mjs` | no samples, no licensing, re-times itself |
| Orchestration | `studio-ui/hub.mjs` one background job (prepare, voice, sound, render + QA, package) with live log | one heavy job at a time; Flux is stopped first to free RAM |
| Package | `planner/seo.mjs` + `social.mjs` after the render, cover frame via ffmpeg | feeds the manual upload kit, Meta posting and the Plan |
Files: `tools/reel/from-carousel.mjs` (story folder, beats, stipple clouds, scene), `engine/reels/scene-core.js` (the scene), `tools/reel/sound-reel.mjs`, Hub endpoints `/api/hub/reel/*`.

## 4. How to use it
Create tab → open a carousel with all images → "Reel" card: (1) get the narration prompt, paste it into Claude/GPT, paste the answer (one line per slide) → (2) **Make the reel** → watch the log; when done play the preview, then **Schedule as Reel**. YouTube Short upload and its thumbnail check: dashboard Publish tab (story `reel-<slug>`).

## 5. Time and storage
About 15-20 min voice + 10-15 min render for 80 s at 24 fps (about 0.3 s per frame). The render frames are deleted after QA passes (the pipeline's cleanup), leaving the mp4, a share copy and the cover (about 40-70 MB).

## 6. Honest limits
- Dots are a screen-space look on AI pictures: faces keep detail at the sampling density used (60,000 dots per slide) but fine hands stay soft.
- A 90 s reel takes about 35 minutes of Mac time: daily is possible only as an overnight batch, and review time is the real limit.
- Reels from the Hub post to Facebook and Instagram through `post-due`; YouTube upload still goes through the dashboard. Instagram needs the Reel video from the Mac or a GitHub Release (no public image host needed for video).
- No data yet on how the reels perform: the plan above is a hypothesis with a two-week test.
