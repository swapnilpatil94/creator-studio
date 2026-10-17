# Connect Facebook and Instagram (one time, about 20 minutes)

What the studio needs from you, and how to get each item. Meta changes its screens often, so where a menu name below differs from what you see, follow the intent. Facts here come from Meta's Reels Publishing and Instagram Content Publishing docs (read 2026-10-17); the app-review and role details are from general Meta behaviour and should be confirmed in your own app dashboard.

## Accounts (you said you already have them)
1. A **Facebook Page** that you admin (not only a personal profile).
2. An **Instagram professional account** (Business or Creator) **linked to that Page**. Check: Instagram > Settings > Account type and tools, then in the Page: Settings > Linked accounts. If the Page requires Page Publishing Authorization (PPA), complete it first or publishing is blocked (Meta doc).

## The developer app (so the studio can post for you)
3. Go to developers.facebook.com > My Apps > Create App > use case **Other / Business** (or "Manage everything on your Page" if offered). Name it e.g. "Kathaaya Studio".
4. In the app, add the products **Facebook Login for Business** and **Instagram** (API with Facebook Login). Instagram resumable video upload is only available with Facebook Login for Business (Meta doc).
5. Keep the app in **Development mode**. You are the app admin and the only user, so you can use the permissions on your own Page and Instagram account without submitting App Review. (If Meta later demands review or business verification for your case, we apply with a screen recording; I will guide you.)
6. Copy **App ID** and **App Secret** (App settings > Basic).

## The token (the thing that expires)
7. Open **Graph API Explorer** (developers.facebook.com/tools/explorer), choose your app, "Get User Access Token", and tick these permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management` (only if your Page sits in a Business Portfolio). Approve for your Page and Instagram account. Copy the token it shows (valid about 1 hour).
8. Run, in this repo:
```
node tools/meta-setup.mjs --app-id <APP_ID> --app-secret <APP_SECRET> --user-token <TOKEN> --page "<exact Page name>"
```
It exchanges the token for a long-lived one, finds the Page token (does not expire when made from a long-lived user token) and the linked Instagram account id, and writes `META_PAGE_ID`, `META_PAGE_TOKEN`, `META_IG_USER_ID` into `.env.local` (private, never shown in the dashboard).

## Things only you can tell me
- Your **Instagram handle** (goes into the caption's follow line) and the **Page name**.
- Whether the Page is in a **Business Portfolio** (changes one permission).
- Your **monetization status** in Meta Business Suite > Monetization (eligibility numbers differ by source; your own dashboard is the truth).

## What the studio then does
- **Facebook Reel** (the vertical Shorts, 3-90 s): uploaded as a **draft**, then a copyright check is read; you press Publish in Business Suite (or I can set `PUBLISHED` once you trust it).
- **Facebook long video** (the 16:9 film): uploaded to the Page as an unpublished video with title, description and chapter lines in the text.
- **Instagram Reel**: publishes immediately after you confirm (the API has no draft state). Caption, hashtags and the AI-generated flag are set.
- No YouTube link is added to Facebook or Instagram copy, so viewers stay on the platform (monetization and reach).
- Limits: 30 API-published Reels per Page per day, 100 Instagram API posts per day.
