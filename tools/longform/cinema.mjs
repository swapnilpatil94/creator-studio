// The cinema director pass (owner 2026-10-23: "all psychology, movie-making skills, all the effects and transitions, done by the system, not by hand").
// It runs on EVERY film's plan (tools/longform/make-scene.mjs) after the planner, the coverage cuts and the colour arc, and does five things deterministically:
//  1. EFFECT COVERAGE: each effect of engine/longform/fx.js is placed where the narration fits it best (keywords, role, tone), on a beat's main effect or on a coverage shot, until the whole vocabulary has been used
//     (as far as the film is long enough); never the same effect on neighbouring painting beats; no orbit / fpv / top-down camera on a close-up face (it tears faces at the mesh edge, see motion-continuity-doctrine).
//  2. PARTNERS: split_screen_vs gets a second picture from a different beat; map_loka_zoom only where the narration names a realm (it replaces the picture with an abstract map).
//  3. TRANSITIONS: all five (cut, whip, zoom, leak, dissolve) appear: any missing one is placed where the colour arc says it belongs.
//  4. ROLES: hook / peak (70-85%) / beat are written to each picture (tools/longform/art.mjs keyInfo turns them into composition: gaze, focal point, scale).
//  5. A REPORT (plan.cinema.json): which effect sits where and why, and what was impossible, so a film that "feels like a slideshow" can be diagnosed.
// Beats whose effect was placed by this pass carry params.fxBy = "cinema" (shots: fxBy), so the pass is idempotent; an effect the owner pinned in the script (params.fxBy = "owner") is never touched.
import { EFFECTS } from "../../engine/longform/fx.js";

const R = s => new RegExp(s);
// effect -> { slot: main | shot | either, face: safe on a close-up face, kw: story words, role: preferred role, tone: preferred colour-arc tones }
export const PROFILE = {
  drone_push_in: { slot: "either", face: 1, kw: R("आया|पहुँच|सामने|द्वार|approach"), role: "hook" },
  drone_pull_out_reveal: { slot: "either", face: 1, kw: R("प्रकट|खुल|सामने आ|असली|reveal") },
  drone_orbit_180: { slot: "main", face: 0, kw: R("नगर|मंदिर|राज्य|दरबार|रणभूमि|युद्धभूमि|महल|आँगन|भूमि") },
  drone_top_down_bird_eye: { slot: "either", face: 0, kw: R("गिर|बेहोश|नदी|धरती|समुद्र|बिखर|ऊपर से") },
  drone_fpv_flythrough: { slot: "main", face: 0, kw: R("दौड़|भाग|तेज|उड़|रण|पहुँच|सफ़र|यात्रा") },
  dolly_zoom_vertigo: { slot: "main", face: 1, kw: R("सच|समझ|अहसास|चौंक|धोखा|होश|क्यों|दिल पत्थर"), role: "peak" },
  crane_up_reveal: { slot: "either", face: 1, kw: R("उठ|आकाश|देव|ऊँच|खड़ा|त्रिशूल") },
  crane_down: { slot: "either", face: 1, kw: R("झुक|नीचे|प्रणाम|समर्पित|गिर|विनती") },
  handheld_breathing_shake: { slot: "either", face: 1, kw: R("डर|काँप|भय|घबरा|तनाव|बेचैन|चीख"), tone: ["fire", "ember"] },
  "2.5d_parallax": { slot: "either", face: 1, kw: R("शांत|धीरे|आँगन|घर|बगीचा|सुबह") },
  parallax_occlusion_3d: { slot: "either", face: 1, kw: R("वरदान|कवच|ब्राह्मण|द्वार|खंभ|मंदिर") },
  depth_rack_focus: { slot: "either", face: 1, kw: R("देख|नज़र|ध्यान|पहचान|पता चल|गौर") },
  depth_fog_haze: { slot: "either", face: 1, kw: R("रहस्य|छल|माया|धुंध|अंधेरा|रात|धोखा|सन्नाटा") },
  kinetography_cinemagraph: { slot: "main", face: 1, kw: R("नदी|जल|पानी|हवा|आग|ज्वाला|लहर|वस्त्र|आँसू|बह") },
  particle_formation: { slot: "main", face: 1, kw: R("प्रकट|उत्पन्न|जन्म|बनी|बनेंगे|बनेगी|राख|रूप धर|बन गए") },
  eye_glow_energy_pulse: { slot: "main", face: 1, kw: R("श्राप|क्रोध|शक्ति|तेज|आँखें|ग़ुस्सा|दहाड़"), tone: ["fire"] },
  morph_age_shift: { slot: "main", face: 1, kw: R("बूढ़|वृद्ध|उम्र|बरस|वर्ष|युग|बदल|जन्म तक|समय") },
  infinite_zoom_droste: { slot: "main", face: 1, kw: R("संसार|ब्रह्मांड|भीतर|अनंत|दुनिया|लोक") },
  double_exposure_cosmos: { slot: "either", face: 1, kw: R("आत्मा|ब्रह्म|सृष्टि|ईश्वर|हरि|नारायण|ब्रह्मांड|विष्णु") },
  volumetric_god_rays: { slot: "either", face: 1, kw: R("भगवान|विष्णु|नारायण|हरि|दिव्य|वरदान|आशीर्वाद|देवी|महादेव"), role: "peak" },
  day_to_night_timelapse: { slot: "main", face: 1, kw: R("बरस|वर्ष|रात|दिन|युग|अंत|सौ साल|शाम") },
  diya_flicker_light: { slot: "either", face: 1, kw: R("दीप|पूजा|भक्ति|तप|प्रार्थना|मंदिर|आरती|दिया"), tone: ["gold"] },
  lightning_flash: { slot: "main", face: 1, kw: R("श्राप|क्रोध|युद्ध|वज्र|त्रिशूल|संहार|वध"), tone: ["fire", "ember"] },
  split_screen_vs: { slot: "main", face: 1, kw: R("युद्ध|बनाम|आमने|से लड़|शिव से|दोनों|मुकाबला"), partner: true },
  map_loka_zoom: { slot: "main", face: 1, kw: R("लोक|स्वर्ग|वैकुंठ|कैलाश|पाताल|धाम|क्षीरसागर"), kwOnly: true },
  sacred_geometry_carve: { slot: "main", face: 1, kw: R("मंत्र|यज्ञ|कवच|वरदान|तप|यंत्र|शक्ति") },
  disintegration_dispersal: { slot: "main", face: 1, kw: R("राख|मृत्यु|नष्ट|भस्म|मर |मरा|हो गया") },
  puppet_warp_breathing: { slot: "either", face: 1, kw: R("खुशी|आँसू|हँस|साँस|जीवन|ज़िंदा") },
  matte_painting_extension: { slot: "either", face: 1, kw: R("विशाल|दूर|फैल|चारों ओर|नदी|किनारे|धरती") },
  shadow_play_reveal: { slot: "main", face: 1, kw: R("कौन|असली|छल|रूप|पहचान|मायावी|भेष") },
  mesh_crane_push: { slot: "main", face: 1, kw: R("कवच|माँग|आया|प्रवेश|द्वार|खुल"), role: "beat" },
  mesh_dolly_zoom_vertigo: { slot: "main", face: 1, kw: R("त्रिशूल|अचानक|चौंक|सच|धोखा|वार"), role: "peak" },
  mesh_rack_focus_dof: { slot: "main", face: 1, kw: R("देख|नज़र|बेहोश|पहचान|होश") },
  mesh_ken_burns_3d: { slot: "either", face: 1, kw: R("शांत|धीरे|आँगन|सुबह|तपस्या|मंदिर") },
  chromatic_glitch_wipe: { slot: "either", face: 1, kw: R("कौन|क्यों|धोखा|\\?|सच|उलट"), role: "hook" },
  speed_ramp_punch: { slot: "either", face: 1, kw: R("अचानक|तभी|उसी समय|पल में|तुरंत"), role: "peak" } };
const FIXED = new Set(["title_behind"]);   // placed by the planner from the thumbnail subject, never moved
const PAINT = p => p.comp === "fx" || p.comp === "cinema";

export function cinemaPass(plan, beats = {}, { dissolveOk = true } = {}) {
  const out = plan.map(p => ({ ...p, params: { ...(p.params || {}), shots: (p.params?.shots || []).map(s => ({ ...s })) } })), N = out.length, rep = { placed: [], skipped: [], transitions: [], roles: {} };
  if (N < 6) return { plan: plan.map(p => ({ ...p })), report: { ...rep, note: "film too short for the full pass" } };
  const text = i => beats[out[i].id]?.text || "", pos = i => i / Math.max(1, N - 1), roleOf = i => i === 0 ? "hook" : pos(i) >= 0.7 && pos(i) <= 0.85 ? "peak" : "beat";
  out.forEach((p, i) => { rep.roles[p.id] = roleOf(i); });
  // slots: a beat's main effect (painting beats that are not text-only) and each coverage shot of it
  const slots = []; out.forEach((p, i) => { if (!PAINT(p) || !p.params.img) return; slots.push({ i, kind: "main", get: () => p.params.fx, set: f => { p.params.fx = f; p.params.fxBy = "cinema"; if (p.comp === "cinema") p.comp = "fx"; }, locked: p.params.fxBy === "owner" || FIXED.has(p.params.fx) });
    (p.params.shots || []).forEach(s => { if (["insert", "detail"].includes(s.framing)) return; slots.push({ i, kind: "shot", framing: s.framing, get: () => s.fx, set: f => { s.fx = f; s.fxBy = "cinema"; }, locked: s.fxBy === "owner" }); }); });
  const near = (i, f, self) => [i - 1, i, i + 1].some(j => out[j] && out[j] !== undefined && (out[j].params.fx === f || (out[j].params.shots || []).some(s => s.fx === f)) && !(self && j === i && false));
  const pinned = new Set(slots.filter(s => s.locked).map(s => s.get()).filter(Boolean)), have = () => pinned;   // only effects fixed in place count as covered: a planner's default in a free slot is a placeholder this pass may replace
  const tone = i => out[i].params.tone;
  const score = (f, s) => { const P = PROFILE[f], t = text(s.i); let sc = 0; if (P.kw.test(t)) sc += 4; if (P.role && P.role === roleOf(s.i)) sc += 2; if (P.tone && P.tone.includes(tone(s.i))) sc += 1; return sc; };
  const eligible = (f, s) => { const P = PROFILE[f]; if (s.locked || FIXED.has(s.get())) return false; if (P.slot === "main" && s.kind !== "main") return false; if (P.slot === "shot" && s.kind !== "shot") return false; if (!P.face && s.kind === "shot" && ["close", "extreme", "profile"].includes(s.framing)) return false; if (near(s.i, f)) return false; if (P.partner && !partnerFor(s.i)) return false; if (P.kwOnly && !P.kw.test(text(s.i))) return false; return true; };
  const partnerFor = i => { const a = out[i].params.img; for (let d = 1; d < N; d++) for (const j of [i + d, i - d]) { const q = out[j]; if (q && PAINT(q) && q.params.img && q.params.img !== a && q.params.tone !== undefined) return q.params.img; } return null; };
  // placement order: the effects with the most specific need first, then the rest
  const need = f => (PROFILE[f].kwOnly ? 3 : 0) + (PROFILE[f].partner ? 3 : 0) + (PROFILE[f].slot === "main" ? 2 : 0), order = EFFECTS.filter(f => PROFILE[f]).sort((a, b) => need(b) - need(a));   // effects that only fit a beat's main slot go first, flexible ones fill what is left (shots included)
  for (const f of order) { if (have().has(f)) continue; const P = PROFILE[f];
    const cand = slots.filter(s => eligible(f, s)).map(s => ({ s, sc: score(f, s) })); if (!cand.length) { rep.skipped.push(`${f}: no slot fits`); continue; }
    cand.sort((a, b) => b.sc - a.sc || (a.s.kind === "main" ? 0 : 1) - (b.s.kind === "main" ? 0 : 1) || a.s.i - b.s.i);
    const best = cand[0]; if (P.kwOnly && best.sc === 0) { rep.skipped.push(`${f}: the narration names no such place`); continue; }
    // a replaced effect is only given up if it is still used somewhere else or was a plain camera move (never lose the last use of an effect with its own meaning)
    const old = best.s.get(), uses = slots.filter(s => s.get() === old).length; if (old && uses < 2 && !/^(2\.5d|parallax|drone_|crane_|depth_|mesh_ken|mesh_crane|matte)/.test(old) && best.sc === 0 && best.s.kind === "main") { const alt = cand.find(c => c.s.kind === "shot" || /^(2\.5d|parallax|drone_|crane_|depth_|matte)/.test(c.s.get() || "")); if (alt) best.s = alt.s; else { rep.skipped.push(`${f}: would replace a unique effect`); continue; } }
    if (P.partner) { const pi = partnerFor(best.s.i); out[best.s.i].params.img2 = pi; out[best.s.i].params.labels = out[best.s.i].params.labels || []; }
    best.s.set(f); best.s.locked = true; pinned.add(f); rep.placed.push(`${out[best.s.i].id} ${best.s.kind}${best.s.framing ? ":" + best.s.framing : ""} <- ${f} (fit ${best.sc})`); }
  // text-only painting beats (comp cinema without fx) stay cinema: they carry typed words over the picture
  // transitions: every type appears at least once, placed by the colour arc
  const all = ["cut", "whip", "zoom", "leak", "dissolve"], used = new Set(out.map(p => p.params.transition).filter(Boolean)), fit = { cut: ["fire"], whip: ["ember", "fire"], zoom: ["ember", "fire", "cold"], leak: ["cold", "gold"], dissolve: ["gold", "cold"] };
  for (const t of all) { if (used.has(t) || (t === "dissolve" && !dissolveOk)) continue; const c = out.map((p, i) => ({ p, i })).filter(({ p, i }) => i > 0 && p.params.transition && (!p.params.transition || used.size === 0 || [...new Set(out.map(q => q.params.transition))].length) && (fit[t] || []).includes(p.params.tone)); const pick = (t === "dissolve" ? c.filter(x => x.i > N * 0.6).slice(-1)[0] : c[Math.floor(c.length / 2)]) || out.map((p, i) => ({ p, i })).filter(x => x.i > 0)[Math.floor(N / 2)]; if (!pick) continue; const prev = pick.p.params.transition; pick.p.params.transition = t; used.add(t); rep.transitions.push(`${pick.p.id}: ${prev || "-"} -> ${t}`); }
  return { plan: out.map(p => ({ ...p, params: { ...p.params, shots: p.params.shots.length ? p.params.shots : undefined } })), report: rep };
}
