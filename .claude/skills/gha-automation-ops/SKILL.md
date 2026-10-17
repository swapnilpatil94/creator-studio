---
name: gha-automation-ops
description: Use when running, debugging or extending the KATHAAYA GitHub Actions automation (post-due, weekly-plan, blog-deploy, daily-research, content-ci), Cloudflare Pages/Worker, secrets, and the local Flux/ComfyUI image tools.
---
# GitHub Actions + Cloudflare + local Flux operations (docs/AUTOMATION.md)
- Heavy work (voice, Flux, render) stays on the Mac; GitHub does QA, plans, posts, deploys, snapshots. Scheduled workflows run only from `main`.
- Posting: `.github/workflows/post-due.yml` (3 cron times, IST slots), idempotent, results in `content/schedule.json`; dry run via workflow_dispatch; kill switch = disable the workflow.
- Secrets live in GitHub (`gh secret set`), never in files; `.env.local` locally (gitignored, mode 600). Rotate anything that was pasted into chat.
- Instagram carousels need public image URLs: CI renders `blog/dist/c/<slug>/NN.jpg` and the blog deploy serves them; `post-due` checks each URL with HEAD before posting.
- Videos for CI posting: `gh release upload video-<story> <story>.mp4` (Releases, ≤2 GB per file); `post-due` downloads it.
- Local images: `bash tools/flux/start-comfy.sh`, then `node tools/flux/klein.mjs ...`; one heavy job at a time; stop renders first.
- Debug order: read the failed entry's `error` in schedule.json -> rerun with `--only <id> --dry-run` locally -> check Meta error code in the log -> check rate limits (30 Reels/Page/day, 100 IG posts/day).
