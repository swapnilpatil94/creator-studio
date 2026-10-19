// Free, no-API-key signal sources for the Outlier Topic Engine. Every function fails soft (returns [] / null on any error) so one source going down never breaks a run.
// autocomplete(): Google's own suggest endpoint -- the actual query expansions real people type, not just what we guessed. This is what makes topic discovery GENUINELY open-ended
//   instead of a fixed list: a handful of seed queries per pillar turn into dozens of real ones every run.
// trendsDaily(): Google's public daily-trending RSS (no key). Cross-referenced against our pillars: if a trending search matches one, that topic gets a timeliness boost.
// reddit(): optional. Needs the owner's own free Reddit app (reddit.com/prefs/apps, "script" type) -- REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET as env/secrets. Reddit blocks anonymous
//   fetches from datacenter IPs (GitHub Actions, most servers) as of 2026, so this is the only way to read it from CI. Returns [] and logs once when the keys are absent, never fatal.
const UA = "KathaayaOutlierEngine/1.0 (research; contact swapnilp576p@gmail.com)";
export async function autocomplete(seed, hl = "hi") {
  try { const u = new URL("https://suggestqueries.google.com/complete/search"); u.searchParams.set("client", "firefox"); u.searchParams.set("hl", hl); u.searchParams.set("q", seed);
    const r = await fetch(u, { headers: { "user-agent": UA } }); if (!r.ok) return []; const j = await r.json(); return (j[1] || []).filter(s => typeof s === "string"); } catch { return []; }
}
export async function expandQueries(seeds, { hl = "hi", perSeed = 6, cap = 14 } = {}) {
  const out = new Set(seeds);
  for (const s of seeds) { const sug = await autocomplete(s, hl); for (const q of sug.slice(0, perSeed)) out.add(q); if (out.size >= cap + seeds.length) break; }
  return [...out].slice(0, cap);
}
export async function trendsDaily(geo = "IN") {
  try { const r = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, { headers: { "user-agent": "Mozilla/5.0" } }); if (!r.ok) return []; const xml = await r.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]); return items.map(it => ({ title: (/<title>([\s\S]*?)<\/title>/.exec(it) || [])[1] || "", traffic: (/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/.exec(it) || [])[1] || "", newsTitle: (/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/.exec(it) || [])[1] || "" })).filter(x => x.title); } catch { return []; }
}
let redditTokenCache = null;
async function redditToken() { const id = process.env.REDDIT_CLIENT_ID, secret = process.env.REDDIT_CLIENT_SECRET; if (!id || !secret) return null;
  if (redditTokenCache && redditTokenCache.exp > Date.now()) return redditTokenCache.token;
  try { const r = await fetch("https://www.reddit.com/api/v1/access_token", { method: "POST", headers: { authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"), "content-type": "application/x-www-form-urlencoded", "user-agent": UA }, body: "grant_type=client_credentials" });
    if (!r.ok) return null; const j = await r.json(); if (!j.access_token) return null; redditTokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3000) * 1000 }; return j.access_token; } catch { return null; } }
export async function redditTop(subreddit, { t = "month", limit = 15 } = {}) {
  const tok = await redditToken(); if (!tok) return { ok: false, reason: "REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET not set (reddit.com/prefs/apps, free, 'script' type)" };
  try { const r = await fetch(`https://oauth.reddit.com/r/${subreddit}/top?t=${t}&limit=${limit}`, { headers: { authorization: "Bearer " + tok, "user-agent": UA } }); if (!r.ok) return { ok: false, reason: `reddit ${r.status}` };
    const j = await r.json(); return { ok: true, posts: (j.data?.children || []).map(c => ({ title: c.data.title, ups: c.data.ups, comments: c.data.num_comments, url: "https://reddit.com" + c.data.permalink })) }; } catch (e) { return { ok: false, reason: e.message }; }
}
