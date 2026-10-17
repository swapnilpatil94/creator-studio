# Automation: what runs where, secrets, runbook

## 1. Architecture (heavy work local, light work in GitHub, public files on Cloudflare)
```
Mac (24 GB)                                  GitHub Actions                              Cloudflare
-----------                                  --------------                              ----------
voice (Chatterbox), Flux.2 Klein images,     content-ci   QA on every push               Pages: blog + /c/<slug>/NN.jpg
video render, dashboard (studio-ui),         weekly-plan  Sunday PR with next week       Worker: comment replies (webhook)
writer (Claude API or local Ollama),         post-due     11:00/19:00/20:00 IST posting  (later) R2 if videos outgrow Releases
corpus + QA, manual upload kit               blog-deploy  build + deploy blog
        |                                    daily-research  06:00 IST insights snapshot
        +-- git push (items, plans, covers) -->        videos: GitHub Release asset  video-<story>
```
Why this split: a GitHub runner has no GPU and Chatterbox/Flux/render take hours; posting, QA and publishing take seconds. Instagram needs images at a **public URL** (carousels) and Facebook can take local bytes, so carousel JPEGs are rendered in CI and served by the blog site; videos are uploaded to a GitHub Release (limit 2 GB per file, we are at about 1 GB for the 10-minute film) and downloaded by the job.

## 2. Files
| Path | Purpose |
|---|---|
| `content/items/*.json` | one file per post (fb_text, carousel, blog, reel_script) with claims and sources |
| `content/queue/topics.json` | topic bank with pillar, sensitivity, status |
| `content/calendar.json` | weekly slots (IST) |
| `content/schedule.json` | generated plan and the result of each post |
| `content/prompts/writer_system.txt` | writer rules (mirrors the QA gate) |
| `tools/content/corpus.mjs` | public-domain corpus fetch + BM25 search |
| `tools/content/qa-content.mjs`, `tests/content-qa.test.mjs` | the QA gate and its tests |
| `tools/content/write-item.mjs` | model-assisted drafting with QA repair rounds |
| `tools/content/carousel.mjs`, `render-all-carousels.mjs` | 1080×1350 JPEG slides |
| `tools/content/plan-week.mjs`, `post-due.mjs` | planning and posting |
| `tools/content/insights.mjs` | Meta performance snapshot |
| `tools/content/publish-cover.mjs` | puts a story cover on the public site for Instagram `cover_url` |
| `tools/flux/klein.mjs`, `start-comfy.sh` | local FLUX.2 Klein generation |
| `blog/build.mjs`, `blog/site.json` | static blog |
| `cloudflare/worker/` | comment-reply Worker |
| `studio-ui/meta.mjs` | Meta publishing (Reels, long video, text, carousels, covers) |

## 3. Secrets and variables: what to give me and how to get it
**Already set in GitHub (done 2026-10-17):** `META_APP_ID`, `META_PAGE_ID`, `META_IG_USER_ID`, `META_PAGE_TOKEN` (a non-expiring Page token).

**Still needed (tell me when ready; I can set them with `gh secret set` as I did for Meta):**
| Name | Where it comes from | Used by |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard > My Profile > API Tokens > Create Token > "Edit Cloudflare Workers" template plus "Cloudflare Pages: Edit" (scope it to your account) | blog-deploy, Worker deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard > Workers & Pages > right sidebar "Account ID" | same |
| variable `CF_PAGES_PROJECT` | name you give the Pages project (e.g. `kathaaya`) | blog-deploy |
| DNS | is `getbyterush.com` on Cloudflare? Then the CNAME `kathaaya` -> `<project>.pages.dev` is one click | domain |
| `ANTHROPIC_API_KEY` | console.anthropic.com > API keys | write-item in CI (optional: local Ollama works for drafts) |
| `YOUTUBE_API_KEY` | already in `.env.local` (research); add as secret for `daily-research` | daily-research |
| `YT_OAUTH_*` + refresh token | only if YouTube uploads should also run from GitHub; today they run from the Mac | later |
| `META_APP_SECRET`, `META_VERIFY_TOKEN` | Meta app > Settings > Basic (secret), a random string you choose | comment Worker |
| contact email | for the blog's contact page (`blog/site.json`) | blog |
Never paste secrets into issues, commits or workflow files; use `gh secret set NAME` (or the GitHub UI). Rotate the Meta token and the OAuth secret that were pasted into chat.

## 4. GitHub Actions: how to use it properly
- **Scheduled workflows run only from the default branch (`main`).** Right now the work lives on `feature/stipple-engine`; merge it (or cherry-pick `.github/`, `content/`, `tools/`, `blog/`, `tests/`) before the schedules activate.
- **Minutes:** `post-due` runs 3×/day (~3 min each, mostly installing Chromium; caches help). Budget about 300 minutes a month out of the free allowance for private repos (check *Settings > Billing* for your plan). Do not poll every few minutes.
- **Timing:** cron can start several minutes late; `post-due` looks 20 minutes ahead and 6 hours back, marks entries before sending, and records results in `content/schedule.json`.
- **Dry run:** *Actions > post-due > Run workflow* with `dry_run` = true shows what would be sent. Do this for the first week.
- **Failures:** a failed entry stays `failed` with the error in `schedule.json`; fix and set `status: queued` to retry. A missed slot (>6 h late) is marked `missed` rather than posted at a bad time.
- **Meta rate limits:** 30 API Reels per Page per 24 h, 100 Instagram API posts per 24 h (official); we stay far below. If Meta throttles shared GitHub IPs (you saw this once), the same script runs from the Mac: `node tools/content/post-due.mjs`.
- **Stop button:** disable the `post-due` workflow in the Actions tab. Nothing else posts.
- **Review control:** nothing is posted from an item that is not `approved`; the weekly plan is a PR you merge.

## 5. Local FLUX.2 Klein (images)
Found on this Mac: `~/Documents/ComfyUI/models/diffusion_models/flux-2-klein-4b.safetensors` (distilled, 4 steps), `text_encoders/qwen_3_4b.safetensors`, `vae/flux2-vae.safetensors`; ComfyUI source in `~/Documents/ComfyUI-server`, venv in `~/Documents/ComfyUI/.venv`; earlier outputs in `~/Documents/ComfyUI/output/Flux2-Klein_*.png`.
```
bash tools/flux/start-comfy.sh                         # starts ComfyUI on 127.0.0.1:8188
node tools/flux/klein.mjs --prompt "..." --out flux-out/x.jpg --ratio 4:5
node tools/flux/klein.mjs --batch content/flux-batch.json   # resumable, one at a time
```
Run one heavy job at a time (24 GB): stop video renders before generating images. Deity images: respectful iconography, flagged `ai_art_disclosed` in the item, never as meme material, never with text baked in by the model (we add Devanagari text ourselves because image models misspell it).

## 6. Weekly operating rhythm (the manager's 3 hours)
1. Sunday: merge the weekly plan PR (read the gap list). 2. Review drafts: approve or send back (checklist in `docs/QA_POLICY.md`). 3. Look at the Monday insights table; adjust `calendar.json` only after 4 weeks of data. 4. Answer the questions that came in as comments; the Worker only thanks people.

## 7. First-time setup order
1. Merge to `main`. 2. Add Cloudflare token + account id, create the Pages project, point the domain. 3. `blog-deploy` once (blog + carousels live). 4. `post-due` dry run for 7 days. 5. Meta webhook + Worker in DRY_RUN for a day. 6. Switch the Worker `DRY_RUN` to 0. 7. Enable weekly plan.
