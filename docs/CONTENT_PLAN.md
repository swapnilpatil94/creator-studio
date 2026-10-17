# KATHAAYA content plan (final, 2026-10-18)

Written as editor-in-chief, social strategist and manager. Inputs: the owner's planning PDF (`Kathaaya-Complete-Claude-Doc-With-FB-Schedule-Hooks-Topics.pdf`), our measured production capacity, the research listed at the end (every claim tagged by how much we trust it), and what the platforms' own documentation says. Where the PDF states something as fact without a source, this plan treats it as a **hypothesis to test**, not a rule.

## 1. Verdict on the planning PDF

| PDF idea | Decision | Why |
|---|---|---|
| One repo runs Flux batch, writer, web UI, blog, GitHub Actions daily posting | **Keep, split by weight** | Heavy work (voice, Flux, video render) stays on the Mac; GitHub Actions only does light, scheduled work: QA, planning, posting, blog deploy, analytics. A GitHub runner cannot run Chatterbox or Flux. |
| Posting calendar (FB text/carousel 11:00, Reels 19:00, FB long 20:00, YT long Sunday 20:00) | **Keep as the starting hypothesis** | The numbers behind it ("50M+ accounts", "Wednesday 50% boost", "FB punishes daily long, reach drops 40%") have no source we could verify. We run it for 4 weeks and let our own Meta/YouTube insights decide (`tools/content/insights.mjs`, `daily-research.yml`). |
| 3 FB long videos of 3:30 per week | **Keep, but cut from the weekly long film** | We cannot produce 3 new films a week. Each FB long is a 3-4 minute cut of a chapter group of the Sunday film (own content, so originality is safe). |
| Text story, 7-line formula, hook ≤7 words, incomplete story | **Keep with edits** | Hook ≤10 words, 2-4 body lines, answer withheld, source line mandatory, 3 hashtags. |
| "Comment GANGA for the full katha", "Save, send to family" | **Change** | Asking for a specific word is **comment bait**, one of the five categories Facebook names for demotion (2017 announcement, still the reference point; check Meta's current Content Distribution Guidelines). We ask a real opinion question and invite a save. QA fails the keyword form. |
| Hook "99% हिंदू नहीं जानते" | **Reject** | An invented statistic. QA fails any unsourced "N%" claim. It also erodes trust, our main asset. |
| Citation "Adi Parva 91, Bhagavata 9.20.30" | **Fix and enforce** | We checked against the public-domain Ganguli translation: the Ganga and Shantanu episode is in Sections 96-99 of the Adi Parva (Sambhava Parva), not 91. Every citation is now machine-checked against a corpus (`research/`). |
| "7 बेटे 8 वसु थे" (slide 8) | **Fix** | The text says eight children were born; seven were released at birth, the eighth (Gangadatta/Devavrata) stayed after Shantanu stopped her. The exemplar posts are corrected (`content/items/ganga-seven-sons.*`). |
| Draupadi's humiliation as "workplace harassment" content | **Reject as a hook or meme** | Trivialises both. Allowed only as a sourced, respectful long-form decided by the manager (`sensitivity: hold`). |
| "Ravana's 10 heads = 10 degrees, first LinkedIn profile" | **Hold** | A joke about a sacred figure; not our brand. Needs an explicit humour label if ever used. |
| "Hanuman still alive: 4 places seen" | **Keep, reframed** | Written as लोक-मान्यता ("माना जाता है"), never as an eyewitness fact. QA fails belief stated as fact. |
| Text-only black+gold carousel, slide 1 hook, 2-9 one fact each, slide 10 CTA | **Keep** | Matches our renderer (`tools/content/carousel.mjs`): 1080×1350, ink + gold. Carousel max is 10 on Instagram (official). Slide 1 text-only; any AI image needs the disclosure flag. |
| Delay 7 s per child and 65 s before publish (blocked by a "GHA attack") | **Keep the idea, make it adaptive** | We poll container status instead of fixed sleeps, add delays and retries, and post from a stable schedule. If Meta still blocks shared GitHub IPs, the fallback is posting from the Mac (`post-due.mjs` runs anywhere). |
| Kaggle `dataspoof/puranas-dataset` + FAISS RAG | **Replace** | We could not confirm that dataset exists (we found only a Bhagavata Purana dataset). We use public-domain translations from Wikisource through its API (Ganguli Mahabharata built; Ramayana and Puranas next) with BM25 retrieval: no model download, runs in GitHub Actions. |
| Google News NewsArticle schema, Publisher Center after 20 blogs | **Change target** | Google News favours timely reporting; evergreen mythology is a weak fit (secondary sources, verify). Our blog targets **Search and Discover** with Article schema, sitemap and RSS. AdSense is a separate later step. |
| Cloudflare Worker for instant comment replies | **Keep, with guardrails** | `cloudflare/worker/worker.js`: signature check, templated one-liner, hourly budget, spam hide, dry-run first. Auto-reply is not auto-engagement bait. |
| Weekly Sunday batch: frontier model writes strict Google-News-style blogs | **Keep with the QA gate** | The writer proposes; the machine checks claims, hooks, bait, slop and originality; a human approves. Google's spam policy says AI use is fine, but mass-produced pages made to rank are "scaled content abuse", so volume is capped by review capacity. |
| Apply for Publisher Center after 20+ blogs | **Drop the number** | No official source found. Apply to Search Console now, to AdSense when the site has real traffic and legal pages (they exist). |

## 2. Position and audience
- **Promise:** every Indian katha with its source named and its variants stated. Not a miracle channel, not fear-marketing.
- **Viewer (one sentence):** a Hindi-speaking devotee or curious viewer, often watching with family on a phone, who knows the headline of a story and wants the part TV skipped.
- **Voice:** warm, brisk, plain Hindi. Short sentences. One surprising detail per post. Respectful of every tradition.
- **Never:** invented statistics, "share or bad luck", boon guarantees, jokes about deities, gore thumbnails, other creators' clips.

## 3. Five content pillars (kept from the PDF, with guardrails)
1. **Unsaid relations** (Ganga and her sons, Draupadi's marriage, Karna's birth): sourced, one question per post.
2. **Saveable lists** (nine Durgas, 108 Shiva names, 12 Jyotirlingas, 51 Shakti Peethas): carousels; "traditionally associated with", never "ask this and receive that".
3. **Banned facts and what-ifs** ("Is Lakshman Rekha in Valmiki?"): the claim is verified in the text first; the post says exactly what the text says and what later tellings added.
4. **Family and moral** (Karna's choice, Shravan Kumar): story first, lesson second, no lecturing.
5. **Belief and place** (Hanuman places, Parashurama): framed as लोक-मान्यता with named places.
Modern-parallel is *not* a pillar: it only appears inside long-form, sourced and respectful.

## 4. What we can actually produce per week (measured)
- Voice for a 50-second Short: about 10-15 min of Mac time; render about 6 min; QA and review about 20 min of human time.
- The 10-minute film: voice about 70 min (cached takes make edits cheap), render about 60 min, then review.
- A carousel renders in seconds; a text post is writing and QA only; a blog is writing, claim-checking and review (about 60-90 min of human time).
- Therefore the plan is **1 long film + 7 Shorts/Reels + 3 FB cut-down longs + 7 text/carousel + 2 blogs per week**, with the human bottleneck being review, not machines.

## 5. Weekly calendar (IST, hypothesis for 4 weeks)
| | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|
| 11:00 | FB text + IG/FB carousel | carousel | FB text | carousel | FB text | carousel | FB text |
| 19:00 | Reel (IG + FB) + YT Short, same file | same | same | same | same | same | same |
| 20:00 | FB long (3-4 min cut) | - | FB long | - | FB long | - | **YT long film** |
`content/calendar.json` drives it. Measure by IST hour and format; after 4 weeks keep the winners, drop the slots that do not earn their effort.

## 6. One idea, many assets (repurposing matrix)
Topic -> verified research card -> 1 long (chapter) -> 3 cut-down Reels (new hook line each) -> 1 FB text -> 1 carousel -> 1 blog -> 1 community question. All pieces cite the same sources and the same `claims` list, so a correction propagates to everything.

## 7. Hooks: what we use and what QA enforces
- Question + specific detail ("गंगा ने अपने सात पुत्रों को क्यों बहाया?"); contrast ("शर्त थी: कभी सवाल मत पूछना"); banned-fact ("क्या वाल्मीकि रामायण में लक्ष्मण रेखा है?"); list ("नवरात्रि के नौ रूप: किसका क्या अर्थ").
- QA: hook 3-10 words, a question word or a number, no invented statistic, no keyword-comment ask, hashtags ≤3 (FB) / ≤5 (IG), source line present, claims verified against the corpus.
- CTA: one clear action. "आपकी राय क्या है? नीचे लिखिए" (an open question) and "सेव कर लीजिए". Never "comment WORD", never tag/share threats.

## 8. Monetization roadmap (do not promise numbers)
- **Facebook:** content monetization eligibility figures conflict across sources (5k vs 10k followers; watch-minute rules). Check the Page's Monetization tab; keep everything original and avoid external links in posts.
- **YouTube:** Partner Program thresholds are published by YouTube (confirm current numbers in Studio). Long film weekly for watch hours; Shorts for discovery.
- **Blog:** AdSense after the site has real original posts, About, Contact, Privacy and an editorial policy (all generated). Affiliate/product plans are out of scope until traffic exists.

## 9. Measurement and review cadence
- Daily 06:00 IST: `insights.mjs` snapshot (FB posts, IG media with reach/saves/shares/views where the API allows).
- Sunday: `weekly-plan.yml` opens a PR with next week's plan and the **gap list**; the manager approves topics and merges.
- Monthly: keep/kill by format; refresh the topic bank from outlier data (`planner/`); run thumbnail Test & Compare on YouTube long films.

## 10. Decisions the owner still has to make
1. Approve the 10 sample topics in `content/queue/topics.json` (two are on hold by policy).
2. Domain: is `kathaaya.getbyterush.com` the final blog address, and is it already in Cloudflare?
3. Contact email for the blog's contact page (placeholder in `blog/site.json`).
4. Whether to merge `feature/stipple-engine` into `main`: scheduled GitHub workflows run only from the default branch.

## 11. First 30 days
Week 1: connect Cloudflare, deploy the blog with 3 approved posts, switch on `post-due` in dry-run for a week. Week 2: first live scheduled text/carousel days, comment worker in DRY_RUN. Week 3: Reels at 19:00 daily. Week 4: read the insights, decide the slots. Throughout: 10 approved items banked before any week starts.

## Research behind this plan (with confidence)
- Meta Reels Publishing API: 3-90 s, 9:16, 24-60 fps, AAC 48 kHz, 30 API Reels per 24 h, copyright check at upload (**official**).
- Instagram Content Publishing: carousels up to 10 items, children need public image URLs, cropped to the first image's ratio; 100 API posts per 24 h; `is_ai_generated` flag; alt_text not supported on reels (**official**).
- YouTube chapters: first stamp 0:00, at least three, each at least 10 s (**official**).
- Facebook "engagement bait" categories including comment bait (**Meta 2017 announcement; current guidelines should be re-checked**).
- Meta's unoriginal-content crackdown: reposts and minor edits are deprioritised; new analysis or commentary counts as original (**reported by several outlets, 2025-2026; Meta's own page not fetched**).
- Google: AI-generated content is allowed, mass production to manipulate ranking is "scaled content abuse" (**Google Search Central blog, March 2024**). Google News vs evergreen, Discover guidance (**secondary sources, unverified**).
- Hashtag counts, best posting times, "carousel gets 25% more saves", "reach drops 15% per extra hashtag" (**vendor and blog claims; treated as hypotheses**).
