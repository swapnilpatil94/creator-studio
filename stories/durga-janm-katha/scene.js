// KATHAAYA long film (16:9, 1920x1080): "Durga's birth" told from the Devi Mahatmya.
// Public-domain paintings (assets/CREDITS.md) are baked to palette-indexed dot images and drawn through a shared camera as the channel's dot matrix; symbols, diagrams, atmosphere and
// typography are drawn procedurally into a mask layer and dotified the same way. Every timing comes from the narration (beats.json + narration/voice/segments.json), so a new voice take re-times the film.
import * as L from "../../engine/dot-cinema/lib.js";
import { loadImages, drawPainting, rectFor, dotifyPalette } from "../../engine/dot-cinema/painting.js";
import BEATS from "./beats.json";
import PALS from "./assets/baked/palettes.json";
import A001 from "./assets/baked/A001.webp"; import A002 from "./assets/baked/A002.webp"; import A004 from "./assets/baked/A004.webp"; import A005 from "./assets/baked/A005.webp"; import A007 from "./assets/baked/A007.webp";
import A015 from "./assets/baked/A015.webp"; import A016 from "./assets/baked/A016.webp"; import A017 from "./assets/baked/A017.webp"; import B007 from "./assets/baked/B007.webp"; import B008 from "./assets/baked/B008.webp";
import B033 from "./assets/baked/B033.webp"; import B045 from "./assets/baked/B045.webp"; import B052 from "./assets/baked/B052.webp"; import B054 from "./assets/baked/B054.webp"; import B057 from "./assets/baked/B057.webp";
import B060 from "./assets/baked/B060.webp"; import m01 from "./assets/baked/m01.webp"; import m02 from "./assets/baked/m02.webp"; import m03 from "./assets/baked/m03.webp"; import m04 from "./assets/baked/m04.webp"; import m06 from "./assets/baked/m06.webp";
L.setFormat(1920, 1080);
const { W, H, TAU, clamp, smooth, smoother, mix, hash, seg } = L;
const DATA = window.DATA, SEGS = Object.fromEntries(DATA.segments.map(s => [s.beat_id, s])), OV = window.OVERRIDES || {};
const ov = (grp, key, def) => (OV[grp] && OV[grp][key] !== undefined) ? OV[grp][key] : def;
const LEAD = 0.9, TAIL = 1.9, DURATION = DATA.duration_seconds + LEAD + TAIL, FONT = f => `800 ${f}px 'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif`;
const IM = loadImages({ A001, A002, A004, A005, A007, A015, A016, A017, B007, B008, B033, B045, B052, B054, B057, B060, m01, m02, m03, m04, m06 });

// ---- which painting(s) tell each story moment (all public domain / CC0; m* are the owned Short paintings) ----
const ART = {
  "durga-calm": ["m06", "m01"], "durga-battle": ["B007", "m03", "B060", "m02"], "durga-many-arms": ["m01", "m06"], "durga-armed": ["m06", "m04"], "durga-lion": ["m01", "B007"], "durga-leap": ["B060", "m02"],
  "mahisha-bull": ["m02", "m03", "B060"], "mahisha-emerge": ["m03"], "mahisha-throne": ["A015"], "gods-asuras-war": ["B045"], "asura-army": ["B045", "B008", "B007"], "gods-flee": ["A017"], "gods-court": ["A017", "A015"],
  "gods-angry": ["m04", "A017"], "gods-praise": ["m04", "A017", "A007"], "goddess-emerges": ["m04", "m01"], "vishnu-sleep": ["B057", "A007"], "brahma-lotus": ["A005", "B057"],
  "vishnu-fight": ["A001", "B054", "A004", "A002"], "raktabija": ["B052", "B033", "B008"],
  "mahisha-lion": ["m03"], "mahisha-man": ["m02"], "mahisha-elephant": ["B060"] };
const WORD_LABEL = { "mahisha-lion": "सिंह", "mahisha-man": "मनुष्य", "mahisha-elephant": "हाथी" };            // forms the demon takes: no public art exists, so the bull painting carries the word
const SCENE_FALLBACK = new Set(["king-forest", "two-men", "sage-ashram"]);                               // no public art either: drawn as dotted scenes until the owner supplies paintings

// ---- on-screen words for typography / diagram beats (taken from the script's own words) ----
const TEXT = {
  "devi-mahatmya": ["देवी महात्म्य", "सात सौ श्लोक"], question: ["उन्हीं के बारे में", "क्यों सोचते हैं?"], boon: ["तुम दोनों", "मेरे हाथों मारे जाओ"], request: ["अब आप ही", "उपाय सोचिए"], interpretation: ["व्याख्या"],
  twist: ["असली शक्ति", "सेना नहीं थी"], callback: ["यही वो क्षण"], vow: ["एक वचन"], "three-notes": ["तीन बातें"], "durga-name": ["'दुर्गा'", "ग्यारहवाँ अध्याय"], sources: ["स्रोत बताना", "ज़रूरी है"],
  "last-dab": ["देवता अकेले हारे।", "साथ मिले, तो देवी बन गए।"], "next-part": ["शुंभ · निशुंभ", "अगला भाग"], "roll-call": [] };
const NAMES = { d079: ["चिक्षुर", "चामर", "उदग्र", "महाहनु"], d080: ["असिलोमा", "बाष्कल", "परिवारित", "बिडाल"] }, POWERS = ["सूर्य", "इंद्र", "अग्नि", "वायु", "चंद्रमा", "यम", "वरुण"];

// ---- shots: runs of consecutive beats sharing a visual ref ----
const beats = BEATS.map((b, i) => { const s = SEGS[b.id]; return { ...b, i, t0: s ? s.start_seconds : 0, words: s && s.words ? s.words : [], seg: s }; });
beats.forEach((b, i) => { b.t0 = i === 0 ? -LEAD : b.t0 - 0.12; });
beats.forEach((b, i) => { b.t1 = i === beats.length - 1 ? DURATION : beats[i + 1].t0; });
const SHOTS = []; { const seen = {}; for (const b of beats) { const last = SHOTS[SHOTS.length - 1]; if (last && last.ref === b.visual.ref && b.visual.type === last.type && b.t1 - last.t0 < 16 && !b.card) { last.beats.push(b); last.t1 = b.t1; } else { const k = seen[b.visual.ref] = (seen[b.visual.ref] || 0); seen[b.visual.ref]++; SHOTS.push({ ref: b.visual.ref, type: b.visual.type, mode: b.visual.mode, run: k, t0: b.t0, t1: b.t1, beats: [b] }); } } }
for (const s of SHOTS) { const a = ART[s.ref]; s.img = a ? a[s.run % a.length] : null; }
const shotAt = n => { let s = SHOTS[0]; for (const q of SHOTS) if (n >= q.t0) s = q; return s; };

// ---- layers ----
const c = document.getElementById("c"), g = c.getContext("2d"), bloomTmp = L.makeLayer(W, H), mainM = L.makeLayer(), fxL = L.makeLayer(), frameTmp = document.createElement("canvas"); frameTmp.width = 96; frameTmp.height = 54; const fg = frameTmp.getContext("2d", { willReadFrequently: true });
let lastCap = null, lastStats = { mean: 0.2, blown: 0 }, lastCam = { x: W / 2, y: H / 2, zoom: 1 };

// ---- painting camera: auto-focus on the most detailed parts of each picture, move between them beat by beat ----
const RECT = {}, SAL = {};
const ready = k => IM[k] && IM[k].complete && IM[k].naturalWidth > 0;     // module-load frame 0 runs before images decode: never cache from an unready image
const fitOf = k => (IM[k].naturalWidth / IM[k].naturalHeight) < 1.25 ? "height" : "cover";   // portrait-ish pictures show whole in a landscape frame; wide ones fill it
const rectOf = k => { if (!ready(k)) return { x: 0, y: 0, w: W, h: H, s: 1 }; return RECT[k] || (RECT[k] = rectFor(IM[k], fitOf(k))); };
function salient(k) {          // top detail cells (u,v) from the baked image's size*detail channels, non-max suppressed; deterministic
  if (SAL[k]) return SAL[k]; if (!ready(k)) return [[0.5, 0.5]]; const im = IM[k], GW = 16, GH = 10, cv = document.createElement("canvas"); cv.width = GW * 6; cv.height = GH * 6; const x = cv.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0, cv.width, cv.height); const d = x.getImageData(0, 0, cv.width, cv.height).data;
  const cell = new Float32Array(GW * GH); for (let y = 0; y < cv.height; y++) for (let xx = 0; xx < cv.width; xx++) { const i = (y * cv.width + xx) * 4; cell[((y / 6) | 0) * GW + ((xx / 6) | 0)] += (d[i + 1] / 255) * (d[i + 2] / 255); }
  const out = []; for (let n = 0; n < 6; n++) { let bi = -1, bv = -1; for (let i = 0; i < cell.length; i++) if (cell[i] > bv) { bv = cell[i]; bi = i; } if (bv <= 0) break; const cx = bi % GW, cy = (bi / GW) | 0; out.push([(cx + 0.5) / GW, (cy + 0.5) / GH]); for (let j = 0; j < cell.length; j++) { const jx = j % GW, jy = (j / GW) | 0; if (Math.hypot(jx - cx, (jy - cy) * 1.4) < 3.2) cell[j] = 0; } }
  if (!out.length) out.push([0.5, 0.5]); return SAL[k] = out;
}
const ZOOM = { reveal: [1.0, 1.22], form: [1.04, 1.28], close: [1.3, 1.6], pan: [1.2, 1.2], scatter: [1.25, 1.02], dissolve: [1.25, 1.02], flow: [1.05, 1.25], orbit: [1.1, 1.25], morph: [1.05, 1.25], path: [1.15, 1.35], slow: [1.05, 1.2], callout: [1.25, 1.45], shake: [1.2, 1.4] };
function camFor(n, sk) {
  const u = clamp((n - sk.t0) / (sk.t1 - sk.t0)), r = rectOf(sk.img), sal = salient(sk.img), [z0, z1] = ZOOM[sk.mode] || [1.1, 1.3];
  const key = sk.beats.map((b, j) => ({ t: j === 0 ? sk.t0 : (b.t0 + b.t1) / 2 - (b.t1 - b.t0) * 0.2, p: sal[(j + sk.run) % sal.length] }));
  let p = key[0].p; for (let j = 0; j < key.length - 1; j++) if (n >= key[j].t) p = [mix(key[j].p[0], key[j + 1].p[0], smoother(seg(n, key[j].t, key[j + 1].t))), mix(key[j].p[1], key[j + 1].p[1], smoother(seg(n, key[j].t, key[j + 1].t)))];
  if (key.length === 1) p = [mix(0.5, key[0].p[0], smoother(u)), mix(0.5, key[0].p[1], smoother(u))];
  const zoom = mix(z0, z1, smoother(u)) * ov("zoom", sk.ref, 1), vw = W / (2 * zoom), vh = H / (2 * zoom);
  const fit = (v, lo, hi, mid) => lo > hi ? mid : clamp(v, lo, hi), x = fit(r.x + p[0] * r.w, r.x + vw, r.x + r.w - vw, r.x + r.w / 2), y = fit(r.y + p[1] * r.h, r.y + vh, r.y + r.h - vh, r.y + r.h / 2);
  const hv = Math.floor(n * 30), sh = sk.mode === "shake" ? 5 * (hash(hv) - 0.5) : 0;
  return { x, y, zoom, roll: 0, shx: sh * 2, shy: sh * 2 };
}

// ---- dotted drawing primitives (mask layer: R = brightness, G = tint, B>128 = crimson) ----
const GOLD = (a = 1) => `rgb(${255 * a | 0},235,0)`, WARM = (a = 1) => `rgb(${255 * a | 0},150,0)`, CRIM = (a = 1) => `rgb(${255 * a | 0},200,200)`, PALE = (a = 1) => `rgb(${255 * a | 0},70,0)`;
function begin() { L.clearLayer(fxL); const f = fxL.g; f.setTransform(0.5, 0, 0, 0.5, 0, 0); f.lineCap = "round"; f.lineJoin = "round"; return f; }
function text(f, lines, o = {}) { const size = o.size || 150, gap = size * 1.18, y0 = (o.y || H / 2) - (lines.length - 1) * gap / 2; f.font = FONT(size); f.textAlign = "center"; f.textBaseline = "middle"; lines.forEach((ln, i) => { if (ln.a <= 0.01) return; f.globalAlpha = ln.a; f.fillStyle = o.fill || GOLD(); f.fillText(ln.t, W / 2 + (ln.dx || 0), y0 + i * gap + (ln.dy || 0)); }); f.globalAlpha = 1; }
const circle = (f, x, y, r, w, fill) => { f.lineWidth = w; f.strokeStyle = fill; f.beginPath(); f.arc(x, y, r, 0, TAU); f.stroke(); };
const poly = (f, pts, w, fill, close) => { f.lineWidth = w; f.strokeStyle = fill; f.beginPath(); pts.forEach((p, i) => i ? f.lineTo(p[0], p[1]) : f.moveTo(p[0], p[1])); if (close) f.closePath(); f.stroke(); };
const partial = (pts, k) => { const n = (pts.length - 1) * k, i = Math.floor(n); return i >= pts.length - 1 ? pts : [...pts.slice(0, i + 1), [mix(pts[i][0], pts[i + 1][0], n - i), mix(pts[i][1], pts[i + 1][1], n - i)]]; };
const CX = W / 2, CY = H / 2 - 40;

const SYM = {
  yantra(f, u, n) { const k = smooth(u * 1.8); for (let i = 0; i < 4; i++) circle(f, CX, CY, 120 + i * 85, 9, GOLD(0.9 - i * 0.12)); const R = 330 * k;
    for (const s of [1, -1]) poly(f, partial([[CX, CY - s * R], [CX + R * 0.87, CY + s * R * 0.5], [CX - R * 0.87, CY + s * R * 0.5]], k), 11, GOLD(), true);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + n * 0.1; f.fillStyle = WARM(0.9); f.beginPath(); f.ellipse(CX + Math.cos(a) * 420 * k, CY + Math.sin(a) * 420 * k, 52, 22, a, 0, TAU); f.fill(); } },
  lotus(f, u, n) { const k = smooth(u * 1.6); for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 8 + ring * 2; i++) { const cnt = 8 + ring * 2, a = i / cnt * TAU + ring * 0.2 - Math.PI / 2, len = (210 + ring * 70) * k; f.save(); f.translate(CX, CY + 80); f.rotate(a + Math.PI / 2); f.fillStyle = ring === 0 ? PALE(0.55) : ring === 1 ? PALE(0.4) : PALE(0.28); f.beginPath(); f.ellipse(0, -len * 0.55, 46 + ring * 6, len * 0.5, 0, 0, TAU); f.fill(); f.lineWidth = 9; f.strokeStyle = ring === 0 ? GOLD(0.95) : ring === 1 ? WARM(0.85) : WARM(0.6); f.stroke(); f.restore(); } f.fillStyle = GOLD(); f.beginPath(); f.arc(CX, CY + 80, 38 * k, 0, TAU); f.fill(); },
  rings(f, u, n) { for (let i = 0; i < 5; i++) { const R = 90 + i * 80 + Math.sin(n * 1.5 + i) * 6; f.setLineDash([14 + i * 4, 22]); f.lineDashOffset = -n * (30 + i * 12) * (i % 2 ? 1 : -1); circle(f, CX, CY, R, 8, GOLD(0.95 - i * 0.12)); } f.setLineDash([]); for (let i = 0; i < 9; i++) { const a = n * (0.6 + i * 0.08) + i * 0.7, R = 150 + (i % 5) * 80; f.fillStyle = WARM(); f.beginPath(); f.arc(CX + Math.cos(a) * R, CY + Math.sin(a) * R, 14, 0, TAU); f.fill(); } },
  chakra(f, u, n) { const sp = n * (1.5 + 5 * (1 - smooth(u * 2))), R = 250 * smooth(u * 3); circle(f, CX, CY, R, 22, GOLD()); circle(f, CX, CY, R * 0.18, 14, WARM()); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + sp; poly(f, [[CX + Math.cos(a) * R * 0.2, CY + Math.sin(a) * R * 0.2], [CX + Math.cos(a) * R, CY + Math.sin(a) * R]], 10, GOLD(0.9)); poly(f, [[CX + Math.cos(a) * R, CY + Math.sin(a) * R], [CX + Math.cos(a + 0.12) * R * 1.22, CY + Math.sin(a + 0.12) * R * 1.22]], 14, WARM()); } },
  trident(f, u, n) { const k = smooth(u * 1.6), top = CY - 300, bot = CY + 330; poly(f, partial([[CX, bot], [CX, top]], k), 20, GOLD()); if (k > 0.5) { const q = smooth((k - 0.5) * 2); poly(f, [[CX, top + 60], [CX, top - 140 * q]], 20, GOLD()); for (const s of [-1, 1]) { poly(f, partial([[CX, top + 140], [CX + s * 90, top + 120], [CX + s * 130, top - 30], [CX + s * 120, top - 130 * q]], q), 18, GOLD()); } f.fillStyle = WARM(); f.beginPath(); f.moveTo(CX, top - 190 * q); f.lineTo(CX - 26, top - 120 * q); f.lineTo(CX + 26, top - 120 * q); f.fill(); } for (let i = 0; i < 14; i++) { const a = hash(i) * TAU + n * 0.5, R = 90 + 70 * hash(i + 4) + 20 * Math.sin(n * 2 + i); f.fillStyle = WARM(0.7); f.beginPath(); f.arc(CX + Math.cos(a) * R, top + Math.sin(a) * R * 0.8, 9, 0, TAU); f.fill(); } },
  "weapons-ring"(f, u, n) { const N = 8; for (let i = 0; i < N; i++) { const k = smooth(seg(u, i * 0.09, i * 0.09 + 0.25)); if (k <= 0) continue; const a = i / N * TAU - Math.PI / 2 + n * 0.12, x = CX + Math.cos(a) * 330, y = CY + Math.sin(a) * 260; f.save(); f.translate(x, y); f.rotate(a + Math.PI / 2); f.globalAlpha = k; const t = i % 4;
      if (t === 0) { poly(f, [[0, 70], [0, -70]], 16, GOLD()); poly(f, [[-30, 40], [30, 40]], 12, WARM()); } else if (t === 1) { f.lineWidth = 12; f.strokeStyle = GOLD(); f.beginPath(); f.arc(0, 0, 60, -1.2, 1.2); f.stroke(); poly(f, [[Math.cos(-1.2) * 60, Math.sin(-1.2) * 60], [Math.cos(1.2) * 60, Math.sin(1.2) * 60]], 5, WARM()); } else if (t === 2) { poly(f, [[0, 70], [0, -30]], 16, GOLD()); f.fillStyle = WARM(); f.beginPath(); f.arc(0, -45, 30, 0, TAU); f.fill(); } else { circle(f, 0, 0, 48, 12, GOLD()); circle(f, 0, 0, 16, 10, WARM()); } f.restore(); } circle(f, CX, CY, 100 * smooth(u * 2), 10, GOLD(0.9)); },
  bell(f, u, n) { const sw = Math.sin(n * 5) * 0.2 * (1 - smooth(u * 0.3)); f.save(); f.translate(CX, CY - 220); f.rotate(sw); f.fillStyle = GOLD(); f.beginPath(); f.moveTo(-60, 40); f.bezierCurveTo(-70, -60, -50, -110, 0, -120); f.bezierCurveTo(50, -110, 70, -60, 60, 40); f.lineTo(190, 200); f.lineTo(-190, 200); f.closePath(); f.fill(); f.fillStyle = WARM(); f.beginPath(); f.arc(0, 230 + Math.sin(n * 10) * 8, 36, 0, TAU); f.fill(); f.restore(); circle(f, CX, CY + 20, 330 + 40 * smooth(seg(u, 0.2, 1)), 8, GOLD(0.5 * (1 - smooth(seg(u, 0.5, 1))))); },
  cup(f, u, n) { const k = smooth(u * 1.8); f.save(); f.translate(CX, CY + 40); f.fillStyle = GOLD(0.95 * k); f.beginPath(); f.moveTo(-190, -170); f.bezierCurveTo(-190, 50, -80, 110, 0, 110); f.bezierCurveTo(80, 110, 190, 50, 190, -170); f.closePath(); f.fill(); f.fillStyle = WARM(k); f.fillRect(-18, 100, 36, 150); f.beginPath(); f.ellipse(0, 270, 130, 36, 0, 0, TAU); f.fill(); f.restore(); for (let i = 0; i < 18; i++) { const ph = (hash(i) + n * 0.25) % 1; f.fillStyle = GOLD(0.9 * Math.sin(ph * Math.PI) * k); f.beginPath(); f.arc(CX + (hash(i + 9) - 0.5) * 300, CY - 130 - ph * 330, 8 + 7 * hash(i + 2), 0, TAU); f.fill(); } },
  "falling-lights"(f, u, n) { for (let i = 0; i < 90; i++) { const sp = 0.07 + hash(i + 5) * 0.12, ph = (hash(i) + n * sp) % 1, x = hash(i * 3 + 1) * W, y = -40 + ph * (H + 80), a = Math.sin(ph * Math.PI) * 0.9; for (let k = 0; k < 5; k++) { f.fillStyle = (i % 3 ? GOLD : WARM)(a * (1 - k / 5) * (0.5 + 0.5 * hash(i + 2))); f.beginPath(); f.arc(x, y - k * 22, 9 - k * 1.3, 0, TAU); f.fill(); } } },
  "dark-water"(f, u, n) { for (let r = 0; r < 14; r++) { const y = 230 + r * 58, amp = 10 + r * 2.4; f.lineWidth = 8; f.strokeStyle = r % 4 ? PALE(0.5 + 0.3 * hash(r)) : GOLD(0.55); f.beginPath(); for (let x = -20; x <= W + 20; x += 24) { const yy = y + Math.sin(x * 0.008 + r * 0.9 + n * 0.8) * amp; x === -20 ? f.moveTo(x, yy) : f.lineTo(x, yy); } f.stroke(); } const m = smooth(u * 2); circle(f, CX + 380, 230, 70 * m, 12, GOLD(0.9 * m)); },
  shockwave(f, u, n) { for (let i = 0; i < 5; i++) { const k = clamp(u * 1.6 - i * 0.16); if (k <= 0 || k >= 1) continue; circle(f, CX, CY, 40 + k * 900, 18 * (1 - k) + 4, GOLD((1 - k) * 0.95)); } f.fillStyle = GOLD(Math.max(0, 1 - u * 2)); f.beginPath(); f.arc(CX, CY, 70 * (1 - u * 0.6), 0, TAU); f.fill(); },
  "light-burst"(f, u, n) { const k = smooth(u * 1.4); for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, r0 = 60, r1 = 80 + k * (400 + 220 * hash(i)); poly(f, [[CX + Math.cos(a) * r0, CY + Math.sin(a) * r0], [CX + Math.cos(a) * r1, CY + Math.sin(a) * r1]], 8 + 6 * hash(i + 3), i % 3 ? GOLD(0.9) : WARM(0.8)); } circle(f, CX, CY, 50 + k * 30, 22, GOLD()); },
  rays(f, u, n) { f.save(); f.translate(CX, CY); f.rotate(n * 0.06); f.translate(-CX, -CY); SYM["light-burst"](f, u * 0.8 + 0.2, n); f.restore(); },
  "light-mountain"(f, u, n) { const k = smooth(u * 1.3), base = CY + 330, top = CY - 330 * k; for (let i = -12; i <= 12; i++) { const bx = CX + i * 52, tx = CX + i * 52 * (1 - 0.92 * k), a = 0.95 - Math.abs(i) / 16; poly(f, [[bx, base], [tx, top + 40 * Math.abs(i) * k / 12 + 30]], 10, i % 2 ? GOLD(a) : WARM(a)); } for (let i = 0; i < 26; i++) { const ph = (hash(i) + n * 0.3) % 1, x = CX + (hash(i + 5) - 0.5) * 760 * (1 - 0.8 * ph); f.fillStyle = GOLD(Math.sin(ph * Math.PI)); f.beginPath(); f.arc(x, base - ph * 640 * k, 9 + 5 * hash(i + 1), 0, TAU); f.fill(); } },
  "energy-stream"(f, u, n) { const k = smooth(u * 1.2); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + n * 0.5; f.fillStyle = WARM(0.6); f.beginPath(); f.arc(CX + Math.cos(a) * (220 + 30 * Math.sin(n * 2 + i)), CY + Math.sin(a) * (150 + 20 * Math.sin(n * 2 + i)), 8, 0, TAU); f.fill(); } for (let s = 0; s < 10; s++) { const a = s / 10 * TAU + 0.3, sx = CX + Math.cos(a) * 900, sy = CY + Math.sin(a) * 520, sg = s % 2 ? 1 : -1; for (let i = 0; i < 24; i++) { const tt = clamp(k * 1.1 - i * 0.025), e = tt * tt * (3 - 2 * tt), cv = Math.sin(tt * Math.PI) * 140 * sg; f.fillStyle = (s % 3 ? GOLD : WARM)((1 - i / 24) * 0.95); f.beginPath(); f.arc(mix(sx, CX, e) - cv * Math.sin(a), mix(sy, CY, e) + cv * Math.cos(a), 12 - i * 0.35, 0, TAU); f.fill(); } } f.fillStyle = GOLD(smooth(seg(u, 0.5, 1))); f.beginPath(); f.arc(CX, CY, 70 * smooth(seg(u, 0.4, 1)), 0, TAU); f.fill(); },
};

function lineReveal(sk, n, texts, from = 0) { const bs = sk.beats, tot = sk.t1 - sk.t0; return texts.map((t, i) => ({ t, a: smooth((n - (sk.t0 + 0.15 + i * Math.min(1.4, tot * 0.35))) / 0.4) })); }
function drawNonPainting(sk, n) {
  const u = clamp((n - sk.t0) / (sk.t1 - sk.t0)), f = begin(), b0 = sk.beats[0], ref = sk.ref;
  if (b0.card) { const k = smooth(seg(n, sk.t0, sk.t0 + 0.5)) * (1 - smooth(seg(n, sk.t1 - 0.5, sk.t1))); const parts = b0.card.split(/\s*·\s*/); const dr = Math.sin(n * 0.8) * 10; text(f, [{ t: parts[0], a: k, dy: -90 + dr }, { t: parts.slice(1).join(" · "), a: k, dy: dr }], { size: 118, y: H / 2 }); for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + n * 0.35; f.fillStyle = WARM(0.8 * k); f.beginPath(); f.arc(CX + Math.cos(a) * 760, H / 2 + Math.sin(a) * 300, 7 + 3 * Math.sin(n * 2 + i), 0, TAU); f.fill(); } const w = 760 * k; poly(f, [[W / 2 - w / 2, H / 2 - 190], [W / 2 + w / 2, H / 2 - 190]], 8, WARM(k)); return; }
  if (SYM[ref]) { SYM[ref](f, u, n); return; }
  if (ref === "three-parts") { const hl = sk.beats.length > 1 || b0.id === "d011" ? 1 : 0, labels = ["१", "३", "९"]; for (let i = 0; i < 3; i++) { const k = smooth((n - sk.t0 - i * 0.5) / 0.5), dim = hl && i !== 1 ? 0.35 : 1, x = CX + (i - 1) * 520; circle(f, x, CY, 190 * k, 14, GOLD(k * dim)); f.font = FONT(210); f.textAlign = "center"; f.textBaseline = "middle"; f.globalAlpha = k * dim; f.fillStyle = GOLD(); f.fillText(labels[i], x, CY + 10); f.font = FONT(64); f.fillStyle = WARM(); f.fillText("अध्याय", x, CY + 270); f.globalAlpha = 1; } return; }
  if (ref === "powers-list") { const b = sk.beats[0], items = POWERS.map((t, i) => ({ t, a: smooth((n - ((b.words[i] && b.words[i].start) || sk.t0 + i * 0.5) + 0.05) / 0.3) })); f.font = FONT(120); f.textAlign = "center"; f.textBaseline = "middle"; items.forEach((q, i) => { const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4; f.globalAlpha = q.a; f.fillStyle = GOLD(); f.fillText(q.t, CX - 330 + col * 660, 190 + row * 190 + (1 - q.a) * 30); }); f.globalAlpha = 1; return; }
  if (ref === "army-count") { const k = smooth(u * 1.6); f.fillStyle = WARM(0.85); const cols = 54, rows = 20; for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const idx = r * cols + q; if (idx / (cols * rows) > k) continue; f.beginPath(); f.arc(110 + q * 31.5, 120 + r * 34 + (q % 2) * 8, 6 + 4 * hash(idx), 0, TAU); f.fill(); } text(f, [{ t: "करोड़ों रथ", a: smooth(seg(u, 0.25, 0.5)) }], { size: 190, y: H / 2, fill: GOLD() }); return; }
  if (ref === "roll-call") { const nm = NAMES[sk.beats[0].id]; if (nm) { const lines = nm.map((t, i) => ({ t, a: smooth((n - ((sk.beats[0].words[i] && sk.beats[0].words[i].start) || sk.t0 + i * 0.6) + 0.05) / 0.25) })); text(f, lines.map(q => ({ ...q })), { size: 118, y: H / 2 }); } else text(f, [{ t: "सेनापति", a: smooth((n - sk.t0) / 0.5) }], { size: 200 }); return; }
  if (ref === "lunar-days") { const lab = ["अष्टमी", "नवमी", "चतुर्दशी"], ph = [0.5, 0.75, 0.97]; for (let i = 0; i < 3; i++) { const k = smooth((n - sk.t0 - 0.8 - i * 1.0) / 0.5), x = CX + (i - 1) * 520, R = 150; f.globalAlpha = k; f.fillStyle = PALE(0.5); f.beginPath(); f.arc(x, CY - 40, R, 0, TAU); f.fill(); f.fillStyle = GOLD(); f.beginPath(); f.arc(x, CY - 40, R, -Math.PI / 2, Math.PI / 2); f.bezierCurveTo(x + R * (1 - 2 * ph[i]) * 1.33, CY - 40 + R, x + R * (1 - 2 * ph[i]) * 1.33, CY - 40 - R, x, CY - 40 - R); f.fill(); f.font = FONT(86); f.textAlign = "center"; f.fillStyle = GOLD(); f.fillText(lab[i], x, CY + 220); f.globalAlpha = 1; } return; }
  if (WORD_LABEL[ref]) return;
  const tx = TEXT[ref]; if (tx) { const big = tx.length === 1 ? 210 : tx.some(s => s.length > 16) ? 112 : 150; text(f, lineReveal(sk, n, tx), { size: big, y: H / 2 - 20 }); if (ref === "last-dab") circle(f, CX, CY, 560 * smooth(seg(u, 0.4, 1)), 6, GOLD(0.5 * smooth(seg(u, 0.4, 1)))); return; }
  SYM.rings(f, u, n);
}

// ---- dotted scenes where no painting exists: forest, hermitage, figures ----
function drawScene(sk, n) {
  const u = clamp((n - sk.t0) / (sk.t1 - sk.t0)), f = begin(), pan = (u - 0.5) * 140;
  const moon = smooth(seg(u, 0, 0.4)); f.fillStyle = PALE(0.9 * moon); f.beginPath(); f.arc(W * 0.78 - pan * 0.3, 230, 90, 0, TAU); f.fill();
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 9 - layer * 2; i++) { const x = ((hash(i * 7 + layer * 31) * (W + 400) - 200) - pan * (0.3 + layer * 0.5)), h2 = 560 + 300 * layer + 140 * hash(i + layer), a = 0.18 + layer * 0.22, w = 12 + layer * 12; f.fillStyle = (layer === 2 ? WARM : PALE)(a); f.fillRect(x - w / 2, H - h2, w, h2); for (let k = 0; k < 6; k++) { f.beginPath(); f.ellipse(x + (hash(i * 3 + k) - 0.5) * 220, H - h2 + 20 + k * 22, 120 + 40 * layer, 34, 0, 0, TAU); f.fill(); } }
  const man = (x, y, s, a) => { f.fillStyle = GOLD(a); f.beginPath(); f.arc(x, y - 150 * s, 26 * s, 0, TAU); f.fill(); f.beginPath(); f.moveTo(x - 20 * s, y - 120 * s); f.lineTo(x + 20 * s, y - 120 * s); f.lineTo(x + 60 * s, y + 90 * s); f.lineTo(x - 60 * s, y + 90 * s); f.closePath(); f.fill(); poly(f, [[x + 85 * s, y - 130 * s], [x + 85 * s, y + 90 * s]], 8 * s, WARM(a)); };
  const k = smooth(seg(u, 0.1, 0.5));
  if (sk.ref === "king-forest") man(mix(W * 0.25, W * 0.5, u), H - 230, 2.3, k); else if (sk.ref === "two-men") { man(W * 0.36 + u * 70, H - 230, 2.2, k); man(W * 0.64 - u * 70, H - 230, 2.2, k); }
  else { f.fillStyle = WARM(0.9 * k); f.beginPath(); f.moveTo(W * 0.3, H - 200); f.lineTo(W * 0.38, H - 360); f.lineTo(W * 0.46, H - 200); f.closePath(); f.fill(); f.beginPath(); f.moveTo(W * 0.5, H - 200); f.lineTo(W * 0.58, H - 340); f.lineTo(W * 0.66, H - 200); f.closePath(); f.fill(); man(W * 0.5, H - 230, 2.0, k); const fl = 0.7 + 0.3 * Math.sin(n * 9); f.fillStyle = GOLD(fl * k); f.beginPath(); f.ellipse(W * 0.78, H - 235, 28, 52 * fl, 0, 0, TAU); f.fill(); }
}

// ---- caption (burned in, word-lit) ----
function caption(n) {
  lastCap = null; const b = beats.find(q => q.words.length && n >= q.seg.start_seconds - 0.12 && n <= q.seg.end_seconds + 0.5); if (!b) return;
  const disp = b.text.split(/\s+/).filter(Boolean), tokens = disp.length === b.words.length ? disp : b.words.map(w => w.word), SZ = 54, LH2 = 76;
  g.save(); g.textBaseline = "middle"; g.textAlign = "left"; g.font = FONT(SZ); const spaceW = g.measureText(" ").width + 6, lines = [[]]; let wsum = 0;
  tokens.forEach((tk, i) => { const w = g.measureText(tk).width; if (wsum + w > 1480 && lines[lines.length - 1].length) { lines.push([]); wsum = 0; } lines[lines.length - 1].push({ tk, w, i }); wsum += w + spaceW; });
  const s0 = b.seg.start_seconds, e0 = b.seg.end_seconds, fadeIn = smooth((n - (s0 - 0.12)) / 0.2), fadeOut = 1 - smooth((n - (e0 + 0.25)) / 0.25), total = lines.length, y0 = H - 112 - (total - 1) * LH2 / 2;
  const maxLw = Math.max(...lines.map(ln => ln.reduce((a, q) => a + q.w + spaceW, -spaceW))); lastCap = { x0: W / 2 - maxLw / 2, x1: W / 2 + maxLw / 2, y0: y0 - 44, y1: y0 + (total - 1) * LH2 + 44 };
  const gr = g.createLinearGradient(0, H - 260, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(0,0,0,0.72)"); gr.addColorStop(1, "rgba(0,0,0,0.88)"); g.globalAlpha = fadeIn * fadeOut; g.fillStyle = gr; g.fillRect(0, H - 260, W, 260);
  lines.forEach((ln, li) => { const lw = ln.reduce((a, q) => a + q.w + spaceW, -spaceW); let x = W / 2 - lw / 2;
    for (const q of ln) { const wd = b.words[Math.min(q.i, b.words.length - 1)], state = n < wd.start ? 0 : n <= wd.end + 0.08 ? 1 : 2; g.shadowColor = "rgba(0,0,0,0.9)"; g.shadowBlur = 20; g.globalAlpha = fadeIn * fadeOut * (state === 0 ? 0.42 : 1); g.fillStyle = state === 1 ? "rgb(255,184,74)" : "#f6f8ff"; g.fillText(q.tk, x, y0 + li * LH2); x += q.w + spaceW; } });
  g.restore();
}

function renderFrame(t) {
  const n = t - LEAD, sk = shotAt(n); let k = 0; const u = clamp((n - sk.t0) / (sk.t1 - sk.t0));
  let dis = 0; for (const q of SHOTS.slice(1)) { const cb = q.t0; if (n >= cb - 0.28 && n < cb) dis = Math.max(dis, smooth((n - (cb - 0.28)) / 0.28)); if (n >= cb && n < cb + 0.28) dis = Math.max(dis, 1 - smooth((n - cb) / 0.28)); }
  if (t < 1.2) dis = Math.max(dis, 1 - smooth(t / 1.2)); if (sk.mode === "scatter" || sk.mode === "dissolve") dis = Math.max(dis, smooth(seg(u, 0.78, 1)) * 0.85);
  const fadeEnd = smooth(seg(t, DURATION - 1.0, DURATION));
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#07060a"; g.fillRect(0, 0, W, H); const bgg = g.createRadialGradient(W / 2, H * 0.42, 100, W / 2, H * 0.42, 1300); bgg.addColorStop(0, "#1a120c"); bgg.addColorStop(1, "#07060a"); g.fillStyle = bgg; g.fillRect(0, 0, W, H);
  let cam = { x: W / 2, y: H / 2, zoom: 1, roll: 0 }; L.drawStars(g, cam, t, 110, 3);
  if (sk.img && !(sk.type === "painting" && SCENE_FALLBACK.has(sk.ref))) {
    cam = camFor(n, sk); const r = rectOf(sk.img), gain = ov("dotGain", sk.ref, 1);
    L.clearLayer(mainM); drawPainting(mainM, IM[sk.img], cam, r, { alpha: 1 }); dotifyPalette(g, mainM, PALS[sk.img], { cell: 7, gain, dis, seed: 3, alpha: 1 });
    if (WORD_LABEL[sk.ref]) { const b = sk.beats[0], tw = (b.words[0] && b.words[0].start) || sk.t0, a = smooth((n - tw) / 0.3); const f = begin(); text(f, [{ t: WORD_LABEL[sk.ref], a }], { size: 230, y: H * 0.42 }); L.dotify(g, fxL, { cell: 6, gain: 1, seed: 5, alpha: 1 - dis }); }
  } else { if (sk.type === "painting") drawScene(sk, n); else drawNonPainting(sk, n); L.dotify(g, fxL, { cell: 7, gain: ov("dotGain", sk.ref, 1), dis, seed: 9 }); }
  lastCam = cam; L.bloom(g, bloomTmp, [[24, 0.2]]);
  L.embers(g, cam, t, { n: 46, seed: 33, x0: 0, x1: W, y0: 120, y1: H - 80, speed: 0.04, alpha: 0.4, p: 0.3 }); L.filmFinish(g, Math.floor(t * 24)); caption(n);
  if (fadeEnd > 0) { g.fillStyle = "rgba(0,0,0," + fadeEnd + ")"; g.fillRect(0, 0, W, H); }
  fg.drawImage(c, 0, 0, W, H, 0, 0, 96, 54); const d = fg.getImageData(0, 0, 96, 54).data; let sum = 0, bl = 0; for (let i = 0; i < d.length; i += 4) { const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; sum += lum; if (lum > 0.9) bl++; } lastStats = { mean: sum / (d.length / 4), blown: bl / (d.length / 4) };
}
window.getDuration = () => DURATION;
window.renderAt = t => { t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); };
window.__shots = { LEAD, DURATION, SHOTS: SHOTS.map(s => ({ ref: s.ref, type: s.type, img: s.img, t0: s.t0, t1: s.t1, beats: s.beats.map(b => b.id) })) };
window.__debug = t => { t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); const sk = shotAt(t - LEAD); return { t, shot: sk.ref, img: sk.img, cam: { x: lastCam.x, y: lastCam.y, zoom: lastCam.zoom }, caption: lastCap, frame: lastStats }; };
renderFrame(0);
