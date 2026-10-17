// Shared QA rules + repair loop for dot-cinema scenes (SDK scenes via __debug, pasted HTML via generic measurement).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
export const std = JSON.parse(fs.readFileSync(path.join(here, "standards.json"), "utf8"));
export const near = s => (s.cuts || std.cutWindows).some(c => Math.abs(s.n - c) < 0.6);
export function evaluate(samples) {
  const V = [], R = std.rules;
  samples.forEach((s, i) => {
    const h = s.hero, add = (rule, value, detail, fix) => V.push({ rule, shot: s.shot, t: s.t, n: s.n, value, detail, fix });
    if (h && !near(s)) {
      if (h.blown > R.hero_not_blown.max) add("hero_not_blown", h.blown, "blown " + (h.blown * 100).toFixed(0) + "%", { type: "heroGain" });
      if (h.moonOverlap > R.hero_moon_readable.maxOverlap && h.moonLum > R.hero_moon_readable.maxLumOverMoon) {
        const hx = (h.bbox[0] + h.bbox[2]) / 2; if (s.moon) add("hero_moon_readable", h.moonOverlap, "overlap " + (h.moonOverlap * 100).toFixed(0) + "% over moon, hero lum " + h.moonLum.toFixed(2), { type: "moonShift", dir: hx < s.moon.x ? 1 : -1 });
      }
      if ((s.expect ? s.expect.size : R.hero_size.shots.includes(s.shot)) && (h.area < R.hero_size.minArea || h.area > R.hero_size.maxArea)) add("hero_size", h.area, "area " + (h.area * 100).toFixed(1) + "%", { type: "zoom", factor: h.area < R.hero_size.minArea ? 1.12 : 0.88 });
      if ((s.expect ? s.expect.notCropped : !R.hero_not_cropped.exemptShots.includes(s.shot)) && h.border > R.hero_not_cropped.maxBorder) add("hero_not_cropped", h.border, "touching edge " + (h.border * 100).toFixed(1) + "%", { type: "zoom", factor: 0.9 });
      if (h.capOverlap > R.caption_clear_of_hero.maxOverlap) add("caption_clear_of_hero", h.capOverlap, "caption covers " + (h.capOverlap * 100).toFixed(0) + "% of hero", { type: "camDy", delta: 90 });
    }
    if (s.headCap > R.caption_clear_of_face.maxOverlap && !near(s)) add("caption_clear_of_face", s.headCap, "caption covers " + (s.headCap * 100).toFixed(0) + "% of the face", { type: "camDy", delta: 90 });
    if (s.capBgLum !== undefined && s.capBgLum !== null && s.capBgLum > R.caption_legible.maxBrightFraction && !near(s)) add("caption_legible", s.capBgLum, "bright pixels under caption text: " + (s.capBgLum * 100).toFixed(1) + "%", { type: "capDim" });
    if (s.caption) { const cm = R.caption_in_margins.minMargin, l = s.caption.x0 / 1080, r = 1 - s.caption.x1 / 1080; if (Math.min(l, r) < cm) add("caption_in_margins", Math.min(l, r), "caption side margin " + (Math.min(l, r) * 100).toFixed(1) + "%", null); }
    for (const m of (s.mustSee || [])) { if (near(s)) break; const ok = m.p && m.p.x > 1080 * R.story_subjects_visible.minMargin && m.p.x < 1080 * (1 - R.story_subjects_visible.minMargin) && m.p.y > 1920 * R.story_subjects_visible.minMargin && m.p.y < 1920 * (1 - R.story_subjects_visible.minMargin); if (!ok) add("story_subjects_visible", 0, m.name + " is narrated but not on screen" + (m.p ? " (at " + m.p.x.toFixed(0) + "," + m.p.y.toFixed(0) + ")" : " (behind camera)"), null); }
    if (s.expect && s.expect.inFrame && h && !near(s)) { const b = h.bbox, m = R.subject_in_frame.minMargin, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; const mg = Math.min(cx / 1080, 1 - cx / 1080, cy / 1920, 1 - cy / 1920); if (mg < m) add("subject_in_frame", mg, "subject centre margin " + (mg * 100).toFixed(1) + "%", { type: "zoom", factor: 0.9 }); }
    if (s.expect && s.expect.inFrame && !h && !near(s)) add("subject_in_frame", -1, "subject missing from frame", null);
    if (s.expect && s.expect.formation && s.formationVisible !== undefined && s.formationVisible < R.formation_visible.min && !near(s)) add("formation_visible", s.formationVisible, "only " + (s.formationVisible * 100).toFixed(0) + "% of the formation in frame", { type: "zoom", factor: 0.9 });
    if (s.frame && s.n > 0.6 && s.t < s.dur - 0.9 && !near(s)) { if (s.frame.mean < R.frame_not_dark.min) add("frame_not_dark", s.frame.mean, "mean luminance " + s.frame.mean.toFixed(3), (s.generic ? { type: "exposure", factor: 1.18 } : { type: "glow", factor: 1.15 })); if (s.frame.blown > R.frame_not_blown.max) add("frame_not_blown", s.frame.blown, "blown " + (s.frame.blown * 100).toFixed(0) + "% of frame", (s.generic ? { type: "exposure", factor: 0.86 } : { type: "glow", factor: 0.85 })); }
    if (s.head && R.head_in_frame.shots.includes(s.shot) && !near(s)) {
      const m = R.head_in_frame.minMargin, hb = s.head, W = 1080, H = 1920;
      const margins = { left: hb[0] / W, right: 1 - hb[2] / W, top: hb[1] / H, bottom: 1 - hb[3] / H }, worst = Object.entries(margins).sort((a, b) => a[1] - b[1])[0];
      if (worst[1] < m) add("head_in_frame", worst[1], "head " + worst[0] + " margin " + (worst[1] * 100).toFixed(1) + "%", { type: "headFrame", side: worst[0], over: Math.abs(Math.min(0, worst[1])) });
    }
    if (i > 0 && !near(s)) {
      const p = samples[i - 1], dt = s.t - p.t, zr = Math.abs(Math.log(s.cam.zoom / p.cam.zoom)) / dt, pr = Math.hypot(s.cam.x - p.cam.x, s.cam.y - p.cam.y) * s.cam.zoom / dt;
      if (p.shot === s.shot) {
        if (zr > R.camera_zoom_rate.maxLogPerSec) V.push({ rule: "camera_zoom_rate", shot: s.shot, t: s.t, n: s.n, value: zr, detail: "zoom rate " + zr.toFixed(2) + "/s", fix: null });
        if (pr > R.camera_pan_rate.maxPxPerSec) V.push({ rule: "camera_pan_rate", shot: s.shot, t: s.t, n: s.n, value: pr, detail: "pan " + pr.toFixed(0) + "px/s", fix: null });
      }
    }
  });
  return V;
}
export function applyFixes(ov, V) {
  ov.zoom = ov.zoom || {}; ov.camDx = ov.camDx || {}; ov.camDy = ov.camDy || {}; ov.moonShift = ov.moonShift || {}; ov.heroGain = ov.heroGain || { all: 1 }; ov.glow = ov.glow || { all: 1 };
  const done = [], seen = new Set(), touchedY = new Set();
  const order = { head_in_frame: 0, hero_not_cropped: 1, hero_moon_readable: 2, hero_not_blown: 3, frame_not_blown: 3, frame_not_dark: 3, subject_in_frame: 4, formation_visible: 4, hero_size: 4, caption_legible: 5, caption_clear_of_face: 5, caption_clear_of_hero: 6 };
  for (const v of [...V].sort((a, b) => (order[a.rule] ?? 9) - (order[b.rule] ?? 9))) {
    if (!v.fix) continue; const key = v.rule + "|" + v.shot; if (seen.has(key)) continue; seen.add(key);
    const f = v.fix, sh = v.shot;
    if (f.type === "heroGain") { ov.heroGain.all = +(ov.heroGain.all * 0.86).toFixed(3); done.push("heroGain -> " + ov.heroGain.all); }
    else if (f.type === "capDim") { ov.capDim = ov.capDim || {}; ov.capDim[sh] = Math.min(0.94, +((ov.capDim[sh] ?? 0.6) + 0.1).toFixed(2)); done.push("capDim[" + sh + "] -> " + ov.capDim[sh]); }
    else if (f.type === "glow") { ov.glow[sh] = +((ov.glow[sh] ?? 1) * f.factor).toFixed(3); ov.dotGain = ov.dotGain || {}; ov.dotGain[sh] = +((ov.dotGain[sh] ?? 1) * (f.factor < 1 ? 0.82 : 1.1)).toFixed(3); done.push("exposure[" + sh + "] glow " + ov.glow[sh] + ", dotGain " + ov.dotGain[sh]); }
    else if (f.type === "exposure") { ov.exposure = ov.exposure || {}; ov.exposure[sh] = Math.max(0.5, Math.min(1.6, +((ov.exposure[sh] ?? 1) * f.factor).toFixed(3))); done.push("exposure[" + sh + "] -> " + ov.exposure[sh]); }
    else if (f.type === "moonShift") { const m = ov.moonShift[sh] = ov.moonShift[sh] || { dx: 0, dy: 0 }; m.dx += f.dir * 140; m.dy -= 40; done.push("moonShift[" + sh + "] -> " + m.dx + "," + m.dy); }
    else if (f.type === "zoom") { ov.zoom[sh] = +((ov.zoom[sh] || 1) * f.factor).toFixed(3); done.push("zoom[" + sh + "] -> " + ov.zoom[sh]); }
    else if (f.type === "camDy") { if (touchedY.has(sh)) continue; touchedY.add(sh); ov.camDy[sh] = (ov.camDy[sh] || 0) + f.delta; done.push("camDy[" + sh + "] -> " + ov.camDy[sh]); }
    else if (f.type === "headFrame") {
      // head cropped: pull the camera so the head moves toward the cropped side, and zoom out a little
      if (f.side === "top" || f.side === "bottom") touchedY.add(sh); const step = 140; if (f.side === "left") ov.camDx[sh] = (ov.camDx[sh] || 0) - step; if (f.side === "right") ov.camDx[sh] = (ov.camDx[sh] || 0) + step;
      if (f.side === "top") ov.camDy[sh] = (ov.camDy[sh] || 0) - step; if (f.side === "bottom") ov.camDy[sh] = (ov.camDy[sh] || 0) + step;
      ov.zoom[sh] = +((ov.zoom[sh] || 1) * 0.94).toFixed(3); done.push("headFrame[" + sh + "] " + f.side + " -> camDx " + (ov.camDx[sh] || 0) + ", camDy " + (ov.camDy[sh] || 0) + ", zoom " + ov.zoom[sh]);
    }
  }
  return done;
}
export function summarize(V) { const g = {}; for (const v of V) { const k = v.rule + " @" + v.shot; (g[k] = g[k] || []).push(v); } return Object.entries(g).map(([k, a]) => k + "  x" + a.length + "  worst: " + a.sort((x, y) => Math.abs(y.value) - Math.abs(x.value))[0].detail); }

export async function runQA({ measure, ovPath, fixN = 0, reportPath = null }) {
  const readOv = () => fs.existsSync(ovPath) ? JSON.parse(fs.readFileSync(ovPath, "utf8")) : {};
  let ov = readOv(), history = [], V;
  for (let it = 0; ; it++) {
    const samples = await measure(ov); V = evaluate(samples);
    const fixable = V.filter(v => v.fix);
    console.log("\n== pass " + it + ": " + V.length + " violations (" + fixable.length + " auto-fixable) over " + samples.length + " samples ==");
    summarize(V).forEach(l => console.log("  " + l));
    history.push({ pass: it, violations: V.length, fixable: fixable.length });
    if (!fixN || it >= fixN || !fixable.length) break;
    const before = JSON.stringify(ov); const done = applyFixes(ov, V);
    if (JSON.stringify(ov) === before) { console.log("  auto-repair exhausted: the fixes are at their limits and violations remain; this needs a scene change"); break; }
    fs.writeFileSync(ovPath, JSON.stringify(ov, null, 1)); console.log("  applied:", done.join(" | "));
  }
  if (reportPath) fs.writeFileSync(reportPath, JSON.stringify({ history, remaining: summarize(V), overrides: ov }, null, 1));
  return { violations: V, history };
}
