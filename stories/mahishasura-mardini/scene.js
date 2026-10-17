import * as L from "../../engine/dot-cinema/lib.js";
import { loadImages, drawPainting, rectFor, at, dotifyPalette } from "../../engine/dot-cinema/painting.js";
import i01 from "./assets/baked/01.webp"; import i02 from "./assets/baked/02.webp"; import i03 from "./assets/baked/03.webp"; import i04 from "./assets/baked/04.webp"; import i06 from "./assets/baked/06.webp";
import PALS from "./assets/baked/palettes.json";
const { W, H, TAU, clamp, smooth, smoother, mix, hash, seg } = L;

// Durga's birth: public-domain paintings (see assets/CREDITS.md) baked into dot-ready images, drawn through the shared camera and rendered as the channel's gold dot matrix.
// Shot timing comes from the narration beats and word times, so a re-picked voice take re-times the film.
const DATA = window.DATA, SEGS = DATA.segments, OV = window.OVERRIDES || {};
const ov = (grp, key, def) => (OV[grp] && OV[grp][key] !== undefined) ? OV[grp][key] : def;
const LEAD = 0.9, TAIL = 1.9, DURATION = DATA.duration_seconds + LEAD + TAIL;
const beat = id => SEGS.find(s => s.beat_id === id), clean = w => w.replace(/[।…—,.?!"]/g, "");
const wt = (id, pre, fb) => { const b = beat(id), w = b.words.find(q => clean(q.word).startsWith(pre)); return w ? w.start : (fb === undefined ? b.start_seconds : fb); };
const kf = (keys, u) => { if (u <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (u <= b[0]) return mix(a[1], b[1], smoother((u - a[0]) / (b[0] - a[0]))); } return keys[keys.length - 1][1]; };
const IM = loadImages({ i01, i02, i03, i04, i06 });
const R = {}; const rect = (k, fit) => { const im = IM[k]; if (!(im && im.naturalWidth)) return { x: 0, y: 0, w: W, h: H, s: 1 }; const key = k + fit; return R[key] || (R[key] = rectFor(im, fit)); };

const SHOTS = [["hook", "m01", "i06", "cover"], ["enemy", "m02", "i02", "height"], ["defeat", "m03", "i04", "cover"], ["radiance", "m04", "i04", "cover"], ["gifts", "m05", "i01", "cover"], ["ride", "m06", "i02", "height"], ["battle", "m07", "i02", "height"], ["trident", "m08a", "i03", "height"], ["dawn", "m09", "i01", "cover"]]
  .map(([k, id, img, fit], i, a) => ({ k, img, fit, t0: i === 0 ? -LEAD : beat(id).start_seconds - 0.3, t1: i === a.length - 1 ? DURATION : beat(a[i + 1][1]).start_seconds - 0.3 }));
const shotAt = n => { let s = SHOTS[0]; for (const q of SHOTS) if (n >= q.t0) s = q; return s; };
const T_A = beat("m08a").start_seconds, T_B = beat("m08b").start_seconds, T_EM = wt("m08b", "निकला"), T_DIE = wt("m08b", "ख", T_B + 4), T_NAME = wt("m08b", "महिषासुर", T_B + 6);

const c = document.getElementById("c"), g = c.getContext("2d"), bloomTmp = L.makeLayer(W, H);
const mainM = L.makeLayer(), spotM = L.makeLayer(), fxL = L.makeLayer(), frameTmp = document.createElement("canvas"); frameTmp.width = 54; frameTmp.height = 96; const fg = frameTmp.getContext("2d", { willReadFrequently: true });
let lastCap = null, lastCam = null, lastStats = { mean: 0.2, blown: 0 };

// ---------- camera: focus points are image coordinates (u,v) -> world via the shot's rect ----------
const focus = (sk, u, v) => at(rect(sk.img, sk.fit), u, v);
function camBase(n, sk) {
  const u = clamp((n - sk.t0) / (sk.t1 - sk.t0)), k = sk.k; let x = 540, y = 960, zoom = 1, roll = 0, shake = 0, P;
  if (k === "hook") { P = focus(sk, 0.40, 0.30); x = kf([[0, 540], [1, P[0]]], u); y = kf([[0, 960], [1, P[1] + 160]], u); zoom = kf([[0, 0.95], [1, 1.3]], u); }
  else if (k === "enemy") { const A = focus(sk, 0.22, 0.45), B = focus(sk, 0.66, 0.5); x = kf([[0, A[0]], [0.55, A[0] + 200], [1, B[0]]], u); y = kf([[0, A[1]], [1, B[1]]], u); zoom = kf([[0, 1.15], [1, 1.45]], u); roll = kf([[0, -1.5], [1, 1.5]], u); }
  else if (k === "defeat") { P = focus(sk, 0.2, 0.52); x = kf([[0, P[0] + 120], [1, P[0] - 20]], u); y = P[1]; zoom = kf([[0, 1.1], [1, 1.4]], u); roll = kf([[0, 0], [1, 3]], u); shake = 6 * smooth(seg(u, 0.1, 0.35)) * (1 - smooth(seg(u, 0.4, 0.7))); }
  else if (k === "radiance") { const A = focus(sk, 0.22, 0.52), B = focus(sk, 0.66, 0.46); x = kf([[0, A[0]], [0.5, (A[0] + B[0]) / 2], [1, B[0]]], u); y = kf([[0, A[1]], [1, B[1]]], u); zoom = kf([[0, 1.1], [0.5, 1.2], [1, 1.5]], u); shake = 8 * smooth(seg(u, 0.4, 0.5)) * (1 - smooth(seg(u, 0.5, 0.65))); }
  else if (k === "gifts") { const A = focus(sk, 0.3, 0.2), C = focus(sk, 0.8, 0.72), tq = wt("m05", "धनुष"), ts = wt("m05", "सिंह"), a = smoother(seg(n, tq - 0.9, tq + 0.2)), b = smoother(seg(n, ts - 1.2, ts + 0.3)); x = mix(mix(540, A[0], a), C[0], b); y = mix(mix(960, A[1] + 120, a), C[1] - 120, b); zoom = mix(mix(0.95, 1.2, a), 1.25, b); }
  else if (k === "ride") { const A = focus(sk, 0.15, 0.5), B = focus(sk, 0.3, 0.5); x = kf([[0, A[0]], [1, B[0]]], u); y = A[1]; zoom = kf([[0, 1.45], [1, 1.3]], u); shake = 4 * Math.sin(n * 15); }
  else if (k === "battle") { const A = focus(sk, 0.4, 0.5), B = focus(sk, 0.62, 0.5); x = kf([[0, A[0]], [1, B[0]]], u); y = A[1]; zoom = kf([[0, 1.3], [1, 1.6]], u); shake = 9 * Math.sin(n * 50) * smooth(seg(u, 0.25, 0.5)); roll = kf([[0, 0], [1, -2]], u); }
  else if (k === "trident") { const A = focus(sk, 0.45, 0.45), B = focus(sk, 0.5, 0.58); x = kf([[sk.t0, A[0]], [T_B, A[0]], [T_B + 1.5, B[0] + 80], [sk.t1, B[0]]], n); y = kf([[sk.t0, A[1] - 40], [T_B, A[1]], [sk.t1, B[1]]], n); zoom = kf([[sk.t0, 0.95], [T_B - 0.35, 1.15], [T_B, 1.3], [T_B + 0.5, 1.2], [Math.max(T_DIE, T_B + 0.9), 1.1], [sk.t1, 1.0]], n); shake = 24 * smooth(seg(n, T_B - 0.03, T_B + 0.12)) * (1 - smooth(seg(n, T_B + 0.12, T_B + 0.8))); }
  else { P = focus(sk, 0.42, 0.28); x = kf([[0, P[0]], [1, 540]], u); y = kf([[0, P[1] + 160], [1, 960]], u); zoom = kf([[0, 1.3], [1, 0.95]], u); }
  const hv = Math.floor(n * 30), sh = shake * (hash(hv) - 0.5), sv = shake * (hash(hv + 99) - 0.5);
  return { x, y, zoom, roll, shx: sh * 2, shy: sv * 2 };
}
const camAt = n => { const sk = shotAt(n), c0 = camBase(n, sk); return { ...c0, x: c0.x + ov("camDx", sk.k, 0), y: c0.y + ov("camDy", sk.k, 0), zoom: c0.zoom * ov("zoom", sk.k, 1) }; };

// ---------- callouts: dotted ring on the painted part + label that appears on the narration word ----------
const FONT = "800 54px 'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif";
function callout(n, cam, sk, label, u, v, tWord, dir = 1, dist = 230) {
  const a = smooth((n - tWord) / 0.3) * (1 - smooth((n - (sk.t1 - 0.25)) / 0.25)); if (a < 0.01) return;
  const r = rect(sk.img, sk.fit), w = at(r, u, v), p = L.project(cam, 1, w[0], w[1]), px = p.x, py = p.y, R0 = 46 + 8 * Math.sin(n * 6);
  g.save(); g.globalAlpha = a; g.fillStyle = "rgb(255,214,120)"; g.strokeStyle = "rgba(255,214,120,0.9)";
  for (let i = 0; i < 26; i++) { const an = i / 26 * TAU + n * 0.6; g.beginPath(); g.arc(px + Math.cos(an) * R0, py + Math.sin(an) * R0, 3.2, 0, TAU); g.fill(); }
  const lx = clamp(px + dir * dist, 150, W - 150), ly = clamp(py - 70, 140, 1250);
  g.lineWidth = 3; g.setLineDash([2, 9]); g.lineCap = "round"; g.beginPath(); g.moveTo(px + dir * R0, py - 8); g.lineTo(lx - dir * 20, ly); g.stroke(); g.setLineDash([]);
  g.font = FONT; g.textAlign = dir > 0 ? "left" : "right"; g.textBaseline = "middle"; const tw = g.measureText(label).width + 36, x0 = dir > 0 ? lx - 12 : lx - tw + 12;
  g.fillStyle = "rgba(7,6,10,0.78)"; g.fillRect(x0, ly - 44, tw, 88); g.fillStyle = "rgb(236,200,115)"; g.shadowColor = "#000"; g.shadowBlur = 14; g.fillText(label, lx + dir * 6, ly + 3); g.restore();
}
function spot(cam, sk, u, v, rad, k, gain = 1.6) { // brighter dots inside a circle on the painting (draws attention without re-colouring)
  if (k < 0.01) return; L.clearLayer(spotM); const r = rect(sk.img, sk.fit), w = at(r, u, v); drawPainting(spotM, IM[sk.img], cam, r, { feather: [w[0], w[1], rad] }); dotifyPalette(g, spotM, PALS[sk.img.slice(1)], { cell: 6, gain: 1.0, seed: 5, alpha: Math.min(1, 0.55 * gain * k) });
}

// ---------- effects ----------
const GODS = [[200, 360], [880, 360], [120, 760], [960, 760], [220, 1160], [860, 1160], [540, 220], [540, 1250]];
function converge(cam, goal, k) { // the gods' lights stream into the goddess
  const gl = fxL.g; L.clearLayer(fxL); L.applyCam(gl, cam, 1); gl.fillStyle = "rgb(255,255,0)";
  GODS.forEach((q, i) => { const src = [q[0] + (i % 2 ? 120 : -120), q[1]]; for (let s = 0; s < 22; s++) { const tt = clamp(k - s * 0.012), e = tt * tt * (3 - 2 * tt), curve = Math.sin(tt * Math.PI) * 120 * (i % 2 ? 1 : -1); gl.globalAlpha = (1 - s / 22) * 0.95; gl.beginPath(); gl.arc(mix(src[0], goal[0], e) + curve * 0.3, mix(src[1], goal[1], e) + curve, 7 - s * 0.24, 0, TAU); gl.fill(); } }); gl.globalAlpha = 1;
  L.dotify(g, fxL, { cell: 6, gain: 1.0, seed: 9 });
}

// ---------- caption (burned in, word-lit) ----------
function caption(n) {
  lastCap = null; const b = SEGS.find(s => n >= s.start_seconds - 0.12 && n <= s.end_seconds + 0.5); if (!b) return;
  const disp = b.text.split(/\s+/).filter(Boolean), tokens = disp.length === b.words.length ? disp : b.words.map(w => w.word);
  g.save(); g.textBaseline = "middle"; g.textAlign = "left"; g.font = "800 62px 'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif";
  const lines = [[]]; let wsum = 0; const spaceW = g.measureText(" ").width + 6;
  tokens.forEach((tk, i) => { const w = g.measureText(tk).width; if (wsum + w > 880 && lines[lines.length - 1].length) { lines.push([]); wsum = 0; } lines[lines.length - 1].push({ tk, w, i }); wsum += w + spaceW; });
  const fadeIn = smooth((n - (b.start_seconds - 0.12)) / 0.2), fadeOut = 1 - smooth((n - (b.end_seconds + 0.25)) / 0.25), total = lines.length, y0 = 1560 - (total - 1) * 44;
  const maxLw = Math.max(...lines.map(ln => ln.reduce((a, q) => a + q.w + spaceW, -spaceW))); lastCap = { x0: W / 2 - maxLw / 2, x1: W / 2 + maxLw / 2, y0: y0 - 46, y1: y0 + (total - 1) * 88 + 46 };
  const gr = g.createLinearGradient(0, 1320, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.45, "rgba(0,0,0,0.78)"); gr.addColorStop(1, "rgba(0,0,0,0.9)"); g.globalAlpha = fadeIn * fadeOut; g.fillStyle = gr; g.fillRect(0, 1320, W, H - 1320);
  lines.forEach((ln, li) => { const lw = ln.reduce((a, q) => a + q.w + spaceW, -spaceW); let x = W / 2 - lw / 2;
    for (const q of ln) { const wd = b.words[Math.min(q.i, b.words.length - 1)], state = n < wd.start ? 0 : n <= wd.end + 0.08 ? 1 : 2;
      g.shadowColor = "rgba(0,0,0,0.9)"; g.shadowBlur = 22; g.globalAlpha = fadeIn * fadeOut * (state === 0 ? 0.42 : 1); g.fillStyle = state === 1 ? "rgb(255,184,74)" : "#f6f8ff"; g.fillText(q.tk, x, y0 + li * 88); x += q.w + spaceW; } });
  g.restore();
}

function renderFrame(t) {
  const n = t - LEAD, sk = shotAt(n), cam = camAt(n); lastCam = cam; const k = sk.k, u = clamp((n - sk.t0) / (sk.t1 - sk.t0));
  let dis = 0; for (const q of SHOTS.slice(1)) { const cb = q.t0 + 0.3, a = smooth(seg(n, cb - 0.3, cb)), b = smooth(seg(n, cb, cb + 0.3)); if (n >= cb - 0.3 && n < cb) dis = Math.max(dis, a); if (n >= cb && n < cb + 0.3) dis = Math.max(dis, 1 - b); }
  if (t < 1.2) dis = Math.max(dis, 1 - smooth(t / 1.2));
  if (k === "trident") dis = Math.max(dis, smooth(seg(n, T_DIE, T_DIE + 0.9)));        // the demon's world dissolves into dots
  const fadeEnd = smooth(seg(t, DURATION - 0.8, DURATION));
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#07060a"; g.fillRect(0, 0, W, H);
  const bgg = g.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H * 0.4, 1300); bgg.addColorStop(0, "#1a120c"); bgg.addColorStop(1, "#07060a"); g.fillStyle = bgg; g.fillRect(0, 0, W, H);
  L.drawStars(g, cam, t, 90, 3);
  const r = rect(sk.img, sk.fit), gainShot = ov("heroGain", "all", 1) * ov("dotGain", k, 1) * ov("glow", k, 1);
  const dim = k === "defeat" ? mix(0.55, 0.35, smooth(u)) : k === "radiance" ? mix(0.5, 1.0, smooth(seg(u, 0.35, 0.8))) : 1;      // defeat: the lights go down; radiance: the goddess comes up
  L.clearLayer(mainM); drawPainting(mainM, IM[sk.img], cam, r, { alpha: 1 }); dotifyPalette(g, mainM, PALS[sk.img.slice(1)], { cell: 6, gain: 1.0 * gainShot, dis, seed: 3, alpha: dim });
  if (k === "enemy") { const tw = wt("m02", "महिषासुर"); spot(cam, sk, 0.67, 0.52, 360, smooth((n - tw) / 0.4) * (0.7 + 0.3 * Math.sin(n * 5))); callout(n, cam, sk, "महिषासुर", 0.67, 0.5, tw, -1, 260); }
  if (k === "radiance") { const goal = at(r, 0.64, 0.45); converge(cam, goal, smooth(seg(u, 0.1, 0.7))); spot(cam, sk, 0.64, 0.45, 520, smooth(seg(u, 0.55, 0.85)), 1.4); }
  if (k === "gifts") { callout(n, cam, sk, "धनुष-बाण", 0.31, 0.21, wt("m05", "धनुष"), 1, 250); callout(n, cam, sk, "सिंह", 0.81, 0.74, wt("m05", "सिंह"), -1, 250); callout(n, cam, sk, "अनेक भुजाएँ", 0.17, 0.36, wt("m05", "हर", beat("m05").end_seconds - 1.5), 1, 260); }
  if (k === "battle") { spot(cam, sk, 0.56, 0.52, 260, 0.35 + 0.65 * Math.max(0, Math.sin(n * 9)), 1.5); }
  if (k === "trident") {
    const hov = smooth(seg(n, T_A - 0.1, T_A + 0.7)) * (1 - smooth(seg(n, T_B + 0.4, T_B + 1.2))); spot(cam, sk, 0.44, 0.27, 300, hov * (0.75 + 0.25 * Math.sin(n * 8)), 1.7);
    const flash = Math.exp(-Math.pow((n - T_B - 0.1) / 0.16, 2)); if (flash > 0.02) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.2 * flash; g.fillStyle = "rgb(255,214,120)"; g.fillRect(0, 0, W, H); g.restore(); }
    spot(cam, sk, 0.6, 0.3, 280, smooth(seg(n, T_EM - 0.3, T_EM + 0.6)) * (1 - smooth(seg(n, T_DIE, T_DIE + 0.6))), 1.6);
    const title = smooth(seg(n, T_NAME - 0.1, T_NAME + 0.7)); if (title > 0.01) { L.clearLayer(fxL); const f = fxL.g; f.setTransform(0.5, 0, 0, 0.5, 0, 0); f.globalAlpha = title; f.fillStyle = "rgb(255,235,0)"; f.textAlign = "center"; f.textBaseline = "middle"; f.font = "900 190px 'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif"; f.fillText("महिषासुरमर्दिनी", 540, 420); L.dotify(g, fxL, { cell: 6, gain: 1.8, seed: 2 }); }
  }
  if (k === "dawn") { const t2 = smooth(seg(u, 0, 0.35)); L.clearLayer(fxL); const f = fxL.g; L.applyCam(f, cam, 1); f.fillStyle = "rgb(255,255,0)"; GODS.forEach((q, i) => { for (let a = 0; a < 18; a++) { const an = a / 18 * TAU + n * 0.5 * (i % 2 ? 1 : -1); f.globalAlpha = 0.9 * t2; f.beginPath(); f.arc(mix(540, q[0], t2) + Math.cos(an) * 38, mix(900, q[1] * 0.85 + 120, t2) + Math.sin(an) * 38, 3, 0, TAU); f.fill(); } }); f.globalAlpha = 1; L.dotify(g, fxL, { cell: 6, gain: 1, seed: 11 }); }
  L.bloom(g, bloomTmp, [[24, 0.22]]);
  L.embers(g, cam, t, { n: 38, seed: 33, x0: 0, x1: W, y0: 300, y1: 1500, speed: 0.04, alpha: 0.4, p: 0.3 });
  L.filmFinish(g, Math.floor(t * 24));
  caption(n);
  if (fadeEnd > 0) { g.fillStyle = "rgba(0,0,0," + fadeEnd + ")"; g.fillRect(0, 0, W, H); }
  fg.drawImage(c, 0, 0, W, H, 0, 0, 54, 96); const d = fg.getImageData(0, 0, 54, 96).data; let sum = 0, bl = 0; for (let i = 0; i < d.length; i += 4) { const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; sum += lum; if (lum > 0.9) bl++; } lastStats = { mean: sum / (d.length / 4), blown: bl / (d.length / 4) };   // exposure stats for QA
}

window.getDuration = () => DURATION;
window.renderAt = t => { t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); };
window.__shots = { LEAD, DURATION, SHOTS };
window.__debug = t => { t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); const n = t - LEAD, sk = shotAt(n); return { t, n, shot: sk.k, cam: { x: lastCam.x, y: lastCam.y, zoom: lastCam.zoom }, moon: null, caption: lastCap, hero: null, frame: lastStats, generic: false }; };
renderFrame(0);
