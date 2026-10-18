// Smoke test for the Studio Hub backend: starts the server on a spare port and exercises plan, state, paste parsing, QA gating, blog validation and the storage dry run. No network posting, no GPU.
import { spawn } from "node:child_process"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), PORT = 4199, base = `http://127.0.0.1:${PORT}`; let bad = 0;
const must = (n, ok, d = "") => { console.log((ok ? "PASS " : "FAIL ") + n + (d ? " — " + d : "")); if (!ok) bad++; };
const srv = spawn("node", ["studio-ui/server.mjs", "--port", String(PORT)], { cwd: root, stdio: "ignore" }); for (let i = 0; i < 40; i++) { try { if ((await fetch(base + "/hub")).ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
const A = async (p, b) => { const r = await fetch(base + p, b === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return { ok: r.ok, j: await r.json().catch(() => ({})) }; };
try {
  must("hub page is served", (await fetch(base + "/hub")).ok);
  const plan = await A("/api/hub/plan?days=14"); must("plan returns slots for 14 days", plan.j.slots && plan.j.slots.length >= 10, plan.j.slots && plan.j.slots.length);
  const st = await A("/api/hub/state"); must("state lists items, topics, stories", st.j.items.length > 0 && st.j.topics.length > 0 && Array.isArray(st.j.stories));
  const txt = "FORMAT: fb_text\nSLUG: smoke-test\nHOOK: गंगा ने 7 पुत्रों को क्यों मारा? 99% हिंदू नहीं जानते\nBODY:\n- शर्त थी कि कभी सवाल मत पूछना\n- सात बच्चे नदी में बहा दिए\nCTA: Comment करो GANGA\nSOURCE_LINE: स्रोत: महाभारत आदि पर्व 91\nHASHTAGS: #kathaaya #a #b #c\nCLAIMS:\n- बच्चे नदी में बहाए गए | eight children born thrown into the river | verified | mahabharata-adi:91";
  const p = await A("/api/hub/paste/parse", { text: txt }); const codes = p.j.state.qa.filter(x => x.level === "FAIL").map(x => x.code);
  must("pasted draft with a fake stat and comment-bait is rejected", p.ok && p.j.state.state === "fix QA" && codes.includes("fake-stat") && codes.includes("engagement-bait"), codes.join(","));
  const ap = await A("/api/hub/item/approve", { id: "no-such-item", approve: true }); must("approving a missing item fails cleanly", !ap.ok);
  const sc = await A("/api/hub/schedule", { item: "bhishma-vow.fb_text", kind: "fb_text", at: new Date(Date.now() + 864e5).toISOString() }); must("an unapproved item cannot be scheduled", !sc.ok && /approve/.test(sc.j.error || ""), sc.j.error);
  const sto = await A("/api/hub/storage"); must("storage dry run reports sizes and does not delete", sto.j.dry === true && typeof sto.j.reclaim_bytes === "number");
  const bl = await A("/api/hub/blog/validate", { text: "FORMAT: blog\nSLUG: smoke-blog\nTITLE: परीक्षण\nMARKDOWN:\n# परीक्षण\nबहुत छोटा लेख।" }); must("a tiny blog fails QA and shows the news checklist", bl.ok && bl.j.qa.some(x => x.code === "blog-length") && bl.j.news.length >= 8);
  const rs = await A("/api/hub/reel/status?id=ganga-seven-sons.carousel"); must("reel status reads narration and steps", rs.ok && rs.j.narration === true && rs.j.words > 200 && "prepared" in rs.j.steps, JSON.stringify(rs.j.steps));
  const nb = await A("/api/hub/reel/brief?id=ganga-seven-sons.carousel"); must("narration prompt carries slides and claims", /CLAIMS/.test(nb.j.prompt) && /NARRATION:/.test(nb.j.prompt));
  const two = "FORMAT: carousel\nSLUG: x-test\nHOOK: क्यों?\nSLIDES:\n1 | एक\n2 | दो\nNARRATION:\n1 | केवल एक पंक्ति\nCTA: सेव\nSOURCE_LINE: s\nHASHTAGS: #a\nCLAIMS:\n- क | thou must | verified | mahabharata-adi:98";
  const nm = await A("/api/hub/paste/parse", { text: two }); must("narration with fewer lines than slides is rejected", nm.j.state.qa.some(x => x.code === "narration-slides" && x.level === "FAIL"));
  const lim = await A("/api/hub/limits"); must("limits table is served", lim.j.limits && lim.j.limits.length >= 6);
} finally { srv.kill(); }
console.log(bad ? `\n${bad} FAILED` : "\nALL PASSED"); process.exit(bad ? 1 : 0);
