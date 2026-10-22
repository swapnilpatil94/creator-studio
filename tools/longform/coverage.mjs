#!/usr/bin/env node
// Film grammar for every story, run on each build after the director (shorts and long films):
//  - coverage: a picture beat held longer than maxHold seconds is cut into shots of the same moment (main + close / insert / wide), so no picture sits still like a slideshow
//  - hook: the opening shot is the thumbnail's subject (pack.json thumbArt), so the first frame keeps the cover's promise; the beat's own picture follows as the next cut
//  - tone: a colour arc per beat from intent and position (cold setup -> ember tension -> fire punishment -> gold resolution), graded in engine/longform/core.js and lit in tools/longform/art.mjs
// Idempotent: everything it adds is marked (autoShots / hookFrom) and rebuilt from scratch each run; shots the owner wrote by hand are left alone.
// usage: node tools/longform/coverage.mjs stories/<name>
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const J = (f, d = null) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : d;
// coverage pattern by number of shots in the beat; fx are DepthFlow camera moves (tools/layers/camera-clips.mjs): push in on a face, rack focus on a detail, crane up on a wide
const PATTERN = { 2: ["close"], 3: ["close", "insert"], 4: ["wide", "close", "insert"] }, FX = { close: "drone_push_in", insert: "depth_rack_focus", wide: "crane_up_reveal" };
const TONE_BY_INTENT = { tense: "ember", punch: "fire", reveal: "fire", reflective: "gold" };
export function toneArc(beats) { let prev = "cold"; return beats.map((b, i) => { const x = beats.length > 1 ? i / (beats.length - 1) : 0; let t = TONE_BY_INTENT[b.intent]; if (t === "gold" && x < 0.55) t = null; if (prev === "gold" && t === "ember") t = null; if (!t) t = prev; prev = t; return t; }); }
export function addCoverage(dir, { maxHold = null, log = () => {} } = {}) {
  const planF = path.join(dir, "plan.json"), plan = J(planF), beats = J(path.join(dir, "beats.json"), []), segs = Object.fromEntries((J(path.join(dir, "narration/voice/segments.json"), { segments: [] }).segments).map(s => [s.beat_id, s])), st = J(path.join(dir, "story.json"), {}), pack = J(path.join(dir, "pack.json"), {}) || {};
  const [fw, fh] = (st.format || "1920x1080").split("x").map(Number), hold = maxHold || (fh > fw ? 3.0 : 4.5), lead = st.lead ?? 0.9, tail = st.tail ?? 1.9;
  for (const p of plan) { if (!p.params) continue; if (p.params.autoShots) { delete p.params.shots; delete p.params.autoShots; } if (p.params.hookFrom) { p.params.img = p.params.hookFrom; delete p.params.hookFrom; } delete p.params.tone; }
  const byId = Object.fromEntries(beats.map(b => [b.id, b])), tones = toneArc(plan.map(p => byId[p.id] || {})); plan.forEach((p, i) => { p.params = p.params || {}; p.params.tone = tones[i]; });
  // transitions from the arc: text cards zoom through, fire hard-cuts into fire, the plunge into fire and ember tension whip-pan, cold setup leaks light, gold resolution dissolves
  const text = p => p.comp === "kinetic" || p.comp === "quote"; plan.forEach((p, i) => { delete p.params.transition; if (!i) return; const q = plan[i - 1], t = tones[i], tp = tones[i - 1]; p.params.transition = text(p) || text(q) ? "zoom" : t === "fire" && tp === "fire" ? "cut" : t === "fire" || t === "ember" ? (q.params.transition === "whip" ? "cut" : "whip") : t === "cold" ? "leak" : "dissolve"; });
  const pic = p => (p.comp === "cinema" || p.comp === "fx") && p.params?.img && p.params?.fx !== "map_loka_zoom";
  const start = i => i === 0 ? -lead : (segs[plan[i].id]?.start_seconds ?? 0) - 0.2, end = i => i === plan.length - 1 ? (segs[plan[i].id]?.end_seconds ?? 0) + tail : start(i + 1);
  // hook: the cover's subject opens the film
  const shotsF = path.join(dir, "assets/art/shots.json"), specs = J(shotsF, {}); let hook = false;
  if (pack.thumbArt && plan[0] && pic(plan[0]) && !plan[0].params.shots) { const [subject, action, light, setting] = String(pack.thumbArt).split("|").map(s => s.trim()); const want = { subject: [subject, light].filter(Boolean).join(", "), action: action || "emerging from darkness", setting: setting || "ancient Puranic-era darkness", lighting: "single hard rim light", framing: "close", medium: "photoreal", src: "thumbArt" };
    if (JSON.stringify(specs.hook) !== JSON.stringify(want)) { specs.hook = want; fs.mkdirSync(path.dirname(shotsF), { recursive: true }); fs.writeFileSync(shotsF, JSON.stringify(specs, null, 1)); for (const ext of [".jpg", ".prompt"]) fs.rmSync(path.join(dir, "assets/art/hook" + ext), { force: true }); }
    const p = plan[0].params; p.hookFrom = p.img; p.img = "hook"; p.shots = [{ img: p.hookFrom, fx: "2.5d_parallax" }]; p.autoShots = true; hook = true; }
  let added = 0, beatsCut = 0;
  plan.forEach((p, i) => { if (!pic(p)) return; const own = p.params.shots && !p.params.autoShots; if (own) return; const dur = end(i) - start(i), k = Math.min(4, Math.max(1, Math.ceil(dur / hold))), have = 1 + (p.params.shots || []).length; if (k <= have) return;
    const of = p.params.hookFrom || p.params.img, extra = (PATTERN[k] || PATTERN[4]).slice(0, k - have); p.params.shots = [...(p.params.shots || []), ...extra.map(f => ({ img: `${p.id}_${f}`, framing: f, of, fx: FX[f] }))]; p.params.autoShots = true; added += extra.length; beatsCut++; });
  fs.writeFileSync(planF, JSON.stringify(plan, null, 1));
  const r = { hold, hook, beatsCut, shotsAdded: added, tones: tones.join(" ") }; log(`coverage: max hold ${hold}s, ${added} extra shots in ${beatsCut} beats${hook ? ", thumbnail subject opens the film" : ""}; tones ${r.tones}`); return r; }
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(addCoverage(path.resolve(process.argv[2]), { log: console.log })));
