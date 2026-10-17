import * as L from "../../engine/dot-cinema/lib.js";
const { W, H, LW, LH, TAU, clamp, smooth, smoother, mix, hash, seg } = L;

// Mahishasura-mardini: iconic silhouettes (buffalo-demon, eight-armed goddess, lion, trident) as lit dot-matrix.
// Shot timing is derived from the narration beats so a re-picked voice take re-times the film automatically.
const DATA = window.DATA, SEGS = DATA.segments, OV = window.OVERRIDES || {};
const ov = (grp, key, def) => (OV[grp] && OV[grp][key] !== undefined) ? OV[grp][key] : def;
const LEAD = 0.9, TAIL = 1.9, DURATION = DATA.duration_seconds + LEAD + TAIL;
const beat = id => SEGS.find(s => s.beat_id === id);
const SHOTS = [["defeat", "m01"], ["shape", "m02"], ["throne", "m03"], ["radiance", "m04"], ["gifts", "m05"], ["ride", "m06"], ["battle", "m07"], ["trident", "m08"], ["dawn", "m09"]]
  .map(([k, id], i, a) => ({ k, t0: i === 0 ? -LEAD : beat(id).start_seconds - 0.3, t1: i === a.length - 1 ? DURATION : beat(a[i + 1][1]).start_seconds - 0.3 }));
const shotAt = n => { let s = SHOTS[0]; for (const q of SHOTS) if (n >= q.t0) s = q; return s; };
const kf = (keys, u) => { if (u <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (u <= b[0]) return mix(a[1], b[1], smoother((u - a[0]) / (b[0] - a[0]))); } return keys[keys.length - 1][1]; };

const c = document.getElementById("c"), g = c.getContext("2d");
const bloomTmp = L.makeLayer(W, H);
const skyL = L.makeLayer(), farL = L.makeLayer(), gndM = L.makeLayer(), gndL = L.makeLayer(), subM = L.makeLayer(), subL = L.makeLayer(), sub2M = L.makeLayer(), sub2L = L.makeLayer(), fxL = L.makeLayer();
let LIGHTS = [], lastCap = null, curMoon = null, lastCam = null;
const CX = 540;

// ---------- drawing primitives (world coords, white mask) ----------
function line(gc, a, b, w) { gc.lineCap = "round"; gc.lineWidth = w; gc.beginPath(); gc.moveTo(a[0], a[1]); gc.lineTo(b[0], b[1]); gc.stroke(); }
function disc(gc, x, y, r) { gc.beginPath(); gc.arc(x, y, r, 0, TAU); gc.fill(); }
function drawBuffalo(gc, x, y, S, o = {}) {
  const P = (u, v) => [x + u * S, y + v * S], rage = o.rage || 0, tilt = o.tilt || 0;
  gc.save(); gc.translate(x, y); gc.rotate(tilt); gc.translate(-x, -y); gc.fillStyle = "#fff";
  gc.beginPath(); gc.moveTo(...P(0, -0.95));
  gc.bezierCurveTo(...P(0.55, -0.95), ...P(0.9, -0.5), ...P(0.85, 0)); gc.bezierCurveTo(...P(0.82, 0.5), ...P(0.6, 0.8), ...P(0.42, 1.15));
  gc.bezierCurveTo(...P(0.3, 1.4), ...P(-0.3, 1.4), ...P(-0.42, 1.15)); gc.bezierCurveTo(...P(-0.6, 0.8), ...P(-0.82, 0.5), ...P(-0.85, 0)); gc.bezierCurveTo(...P(-0.9, -0.5), ...P(-0.55, -0.95), ...P(0, -0.95)); gc.fill();
  for (const k of [-1, 1]) {
    const lift = 0.25 * rage;
    gc.beginPath(); gc.moveTo(...P(0.55 * k, -0.7));
    gc.bezierCurveTo(...P(1.5 * k, -0.35), ...P(2.15 * k, -0.8 - lift), ...P(1.85 * k, -1.75 - lift));
    gc.bezierCurveTo(...P(1.95 * k, -1.0 - lift * 0.6), ...P(1.35 * k, -0.62), ...P(0.8 * k, -0.98)); gc.closePath(); gc.fill();
    gc.save(); gc.translate(...P(1.02 * k, -0.28)); gc.rotate(0.6 * k); gc.beginPath(); gc.ellipse(0, 0, 0.3 * S, 0.14 * S, 0, 0, TAU); gc.fill(); gc.restore();
  }
  gc.restore();
}
function buffaloEyes(gl, x, y, S, glow, tilt = 0) {
  gl.save(); gl.translate(x, y); gl.rotate(tilt); gl.translate(-x, -y);
  for (const k of [-1, 1]) { gl.fillStyle = "rgb(255,150,0)"; gl.globalAlpha = 0.4 + 0.6 * glow; gl.beginPath(); gl.ellipse(x + 0.38 * k * S, y - 0.08 * S, 0.12 * S, 0.06 * S, 0.3 * k, 0, TAU); gl.fill(); }
  gl.restore(); gl.globalAlpha = 1;
}
function weapon(gc, type, p, ang, s, t) {
  gc.save(); gc.translate(p[0], p[1]); gc.rotate(ang); gc.fillStyle = "#fff"; gc.strokeStyle = "#fff";
  if (type === 0) { line(gc, [0, 0.4 * s], [0, -1.5 * s], s * 0.07); for (const k of [-1, 0, 1]) line(gc, [k * 0.28 * s, -1.0 * s], [k * 0.28 * s, -1.65 * s], s * 0.06); line(gc, [-0.28 * s, -1.0 * s], [0.28 * s, -1.0 * s], s * 0.06); }
  else if (type === 1) { gc.lineWidth = s * 0.07; gc.beginPath(); gc.arc(0, -0.5 * s, 0.42 * s, 0, TAU); gc.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 3; line(gc, [Math.cos(a) * 0.1 * s, -0.5 * s + Math.sin(a) * 0.1 * s], [Math.cos(a) * 0.55 * s, -0.5 * s + Math.sin(a) * 0.55 * s], s * 0.05); } }
  else if (type === 2) { gc.lineWidth = s * 0.07; gc.beginPath(); gc.arc(0.2 * s, -0.5 * s, 0.9 * s, Math.PI * 0.6, Math.PI * 1.4); gc.stroke(); line(gc, [-0.55 * s, 0.1 * s], [-0.55 * s, -1.1 * s], s * 0.025); }
  else if (type === 3) { line(gc, [0, 0.4 * s], [0, -1.0 * s], s * 0.08); disc(gc, 0, -1.15 * s, 0.26 * s); }
  else if (type === 4) { line(gc, [0, 0.3 * s], [0, -1.5 * s], s * 0.07); line(gc, [-0.3 * s, -0.1 * s], [0.3 * s, -0.1 * s], s * 0.07); }
  else if (type === 5) { disc(gc, 0, -0.4 * s, 0.32 * s); gc.clearRect(0, 0, 0, 0); }
  else if (type === 6) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; gc.beginPath(); gc.ellipse(Math.cos(a) * 0.28 * s, -0.4 * s + Math.sin(a) * 0.28 * s, 0.17 * s, 0.07 * s, a, 0, TAU); gc.fill(); } }
  else { line(gc, [0, 0.3 * s], [0, -1.3 * s], s * 0.06); gc.beginPath(); gc.moveTo(-0.16 * s, -1.25 * s); gc.lineTo(0, -1.8 * s); gc.lineTo(0.16 * s, -1.25 * s); gc.fill(); }
  gc.restore();
}
function drawGoddess(gc, x, y, S, t, o = {}) {
  const P = (u, v) => [x + u * S, y + v * S], sit = o.sit, arms = o.arms === undefined ? 8 : o.arms, spread = o.spread === undefined ? 1 : o.spread;
  gc.save(); gc.fillStyle = "#fff"; gc.strokeStyle = "#fff";
  gc.beginPath(); gc.moveTo(...P(-0.4, -0.95)); gc.bezierCurveTo(...P(-0.4, -0.3), ...P(-0.95, 0.35), ...P(sit ? -1.2 : -1.05, 1.45)); gc.lineTo(...P(sit ? 1.2 : 1.05, 1.45)); gc.bezierCurveTo(...P(0.95, 0.35), ...P(0.4, -0.3), ...P(0.4, -0.95)); gc.closePath(); gc.fill(); line(gc, P(-0.38, -0.88), P(0.38, -0.88), 0.2 * S);
  disc(gc, ...P(0, -1.3), 0.3 * S); line(gc, P(0, -1.1), P(0, -0.9), 0.2 * S);
  gc.beginPath(); gc.moveTo(...P(-0.3, -1.45)); gc.lineTo(...P(-0.22, -1.95)); gc.lineTo(...P(-0.08, -1.6)); gc.lineTo(...P(0, -2.1)); gc.lineTo(...P(0.08, -1.6)); gc.lineTo(...P(0.22, -1.95)); gc.lineTo(...P(0.3, -1.45)); gc.closePath(); gc.fill();
  for (let i = 0; i < arms; i++) {
    const f = arms === 1 ? 0 : (i / (arms - 1)) * 2 - 1, side = i < arms / 2 ? -1 : 1, idx = side < 0 ? i : arms - 1 - i, per = Math.max(1, arms / 2 - 1);
    const a = (-90 + side * (28 + (idx / per) * 100 * spread)) * Math.PI / 180 + Math.sin(t * 1.6 + i) * 0.04, sh = P(0.26 * side, -0.82), len = (0.95 + 0.12 * Math.sin(i * 1.7)) * (o.reach || 1);
    const hand = [sh[0] + Math.cos(a) * len * S, sh[1] + Math.sin(a) * len * S];
    const mid = [(sh[0] + hand[0]) / 2 + Math.cos(a + Math.PI / 2) * 0.1 * S * side, (sh[1] + hand[1]) / 2 + Math.sin(a + Math.PI / 2) * 0.1 * S * side];
    gc.lineCap = "round"; gc.lineWidth = 0.13 * S; gc.beginPath(); gc.moveTo(sh[0], sh[1]); gc.quadraticCurveTo(mid[0], mid[1], hand[0], hand[1]); gc.stroke();
    if (!o.noWeapons) weapon(gc, (i + (o.wshift || 0)) % 8, hand, a + Math.PI / 2, S * 0.55, t);
  }
  gc.restore();
}
function drawLion(gc, x, y, S, t, run = 1) {
  const ph = t * 7 * run, P = (u, v) => [x + u * S, y + v * S]; gc.fillStyle = "#fff"; gc.strokeStyle = "#fff";
  gc.beginPath(); gc.ellipse(...P(-0.1, -0.05), 1.05 * S, 0.5 * S, 0, 0, TAU); gc.fill();
  for (const [u, sp, bk] of [[0.65, 0, 0], [0.4, 2.2, 0], [-0.75, 1.1, 1], [-0.95, 3.3, 1]]) {
    const sw = Math.sin(ph + sp) * 0.38 * run, fx = u + sw, fy = 0.95 - Math.max(0, Math.cos(ph + sp)) * 0.18 * run;
    gc.lineCap = "round"; gc.lineWidth = 0.22 * S; gc.beginPath(); gc.moveTo(...P(u, 0.25)); gc.quadraticCurveTo(...P(u + sw * 0.4, 0.65), ...P(fx, fy)); gc.stroke();
  }
  gc.lineWidth = 0.1 * S; gc.beginPath(); gc.moveTo(...P(-1.1, -0.15)); gc.quadraticCurveTo(...P(-1.6, -0.2 + Math.sin(ph) * 0.1), ...P(-1.6, 0.35)); gc.stroke(); disc(gc, ...P(-1.62, 0.4), 0.13 * S);
  const hx = 1.05, hy = -0.4;
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = 0.62 + 0.14 * hash(i) + Math.sin(ph * 0.5 + i) * 0.03; gc.beginPath(); gc.moveTo(...P(hx, hy)); gc.lineTo(...P(hx + Math.cos(a - 0.17) * r * 0.8, hy + Math.sin(a - 0.17) * r * 0.8)); gc.lineTo(...P(hx + Math.cos(a) * r * 1.15, hy + Math.sin(a) * r * 1.15)); gc.lineTo(...P(hx + Math.cos(a + 0.17) * r * 0.8, hy + Math.sin(a + 0.17) * r * 0.8)); gc.closePath(); gc.fill(); }
  gc.beginPath(); gc.ellipse(...P(hx, hy), 0.55 * S, 0.55 * S, 0, 0, TAU); gc.fill(); gc.beginPath(); gc.ellipse(...P(hx + 0.55, hy + 0.12), 0.34 * S, 0.22 * S, 0, 0, TAU); gc.fill();
}
function drawTrident(gc, x, y, S, ang) {
  gc.save(); gc.translate(x, y); gc.rotate(ang); gc.fillStyle = "#fff"; gc.strokeStyle = "#fff"; gc.lineCap = "round";
  line(gc, [0, 1.6 * S], [0, -0.9 * S], 0.07 * S); line(gc, [-0.38 * S, -0.55 * S], [0.38 * S, -0.55 * S], 0.07 * S);
  for (const k of [-1, 0, 1]) { const px = k * 0.38 * S; line(gc, [px, -0.55 * S], [px, -1.1 * S], 0.06 * S); gc.beginPath(); gc.moveTo(px - 0.1 * S, -1.05 * S); gc.lineTo(px, -1.55 * S - (k === 0 ? 0.2 * S : 0)); gc.lineTo(px + 0.1 * S, -1.05 * S); gc.closePath(); gc.fill(); }
  gc.restore();
}
function drawDemon(gc, x, y, S, rise) { // humanoid horned silhouette rising from the severed neck
  gc.fillStyle = "#fff"; const P = (u, v) => [x + u * S, y + v * S];
  gc.save(); gc.beginPath(); gc.rect(x - 2 * S, y - 3 * S, 4 * S, 3 * S * (0.4 + 0.6 * rise) + 1.3 * S * (1 - rise) * 0 + 3 * S * 0); gc.clip();
  const oy = (1 - rise) * 1.6;
  gc.beginPath(); gc.moveTo(...P(-0.9, 0.6 + oy)); gc.bezierCurveTo(...P(-0.95, -0.2 + oy), ...P(-0.5, -0.45 + oy), ...P(-0.28, -0.55 + oy)); gc.lineTo(...P(0.28, -0.55 + oy)); gc.bezierCurveTo(...P(0.5, -0.45 + oy), ...P(0.95, -0.2 + oy), ...P(0.9, 0.6 + oy)); gc.closePath(); gc.fill();
  disc(gc, ...P(0, -0.85 + oy), 0.28 * S);
  for (const k of [-1, 1]) { gc.beginPath(); gc.moveTo(...P(0.14 * k, -1.0 + oy)); gc.quadraticCurveTo(...P(0.65 * k, -1.2 + oy), ...P(0.5 * k, -1.8 + oy)); gc.quadraticCurveTo(...P(0.38 * k, -1.25 + oy), ...P(0.05 * k, -1.08 + oy)); gc.closePath(); gc.fill(); }
  gc.restore();
}

// ---------- environment ----------
const MOON = { x: 720, y: 560, r: 190 };
const LIGHT = { light: [0.5, -0.55, 0.65], rim: [0.78, -0.62] };
function drawSky(cam, scene) { L.clearLayer(skyL); L.applyCam(skyL.g, cam, 0.05); const m = scene.moon || MOON; L.paintMoon(skyL.g, m.x, m.y, m.r, scene.moonGain ?? 0.8); L.dotify(g, skyL, { cell: 6, gain: 0.95, dis: scene.dis, seed: 1 }); }
function drawHills(cam, scene, warm) {
  L.clearLayer(farL); L.applyCam(farL.g, cam, 0.45); farL.g.fillStyle = "rgb(" + (warm ? 70 : 38) + "," + (warm ? 90 : 0) + ",0)";
  L.rockPoly(farL.g, [[-1500, 1010], [-1100, 930], [-700, 985], [-300, 910], [100, 985], [560, 940], [1100, 1000], [1800, 920], [2400, 985], [3200, 945], [5200, 1010], [5200, 1200], [-1500, 1200]], 11, 28);
  L.dotify(g, farL, { cell: 6, gain: 0.95, dis: scene.dis, seed: 3 });
}
function drawGround(cam, scene, tint) {
  L.clearLayer(gndM); L.applyCam(gndM.g, cam, 1); gndM.g.fillStyle = "#fff"; L.rockPoly(gndM.g, [[-1600, 2300], [-1600, 1262], [-600, 1252], [200, 1268], [900, 1255], [1700, 1270], [2600, 1262], [2600, 2300]], 5, 8);
  L.shade(gndM, gndL, { ...LIGHT, blur: 7, K: 9, amb: 0.03, dif: 0.2, rimGain: 0.8, wide: 4, wideMix: 2, tint: 0, tintRim: tint || 0 });
  L.dotify(g, gndL, { cell: 9, gain: 0.45, dis: scene.dis, seed: 5 });
}
function glowDisc(gl, x, y, r, a, rgb = "rgb(255,255,0)") { const gr = gl.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgb.replace("rgb", "rgba").replace(")", "," + a + ")")); gr.addColorStop(1, rgb.replace("rgb", "rgba").replace(")", ",0)")); gl.fillStyle = gr; gl.beginPath(); gl.arc(x, y, r, 0, TAU); gl.fill(); }
function shadeSub(maskL, outL, o) { L.shade(maskL, outL, { ...LIGHT, blur: 4, K: 11, amb: 0.04, dif: 0.35, rimGain: 1.7, wide: 5, wideMix: 3, top: 0.12, ...o }); }

// ---------- camera ----------
function camBase(n, sk) {
  const u = clamp((n - sk.t0) / (sk.t1 - sk.t0)), k = sk.k; let x = CX, y = 960, zoom = 1, roll = 0, shake = 0;
  if (k === "defeat") { x = 540; y = kf([[0, 1020], [1, 900]], u); zoom = kf([[0, 0.8], [1, 1.12]], u); }
  else if (k === "shape") { x = 540; y = 900; zoom = kf([[0, 1.0], [1, 1.28]], u); roll = kf([[0, -2], [1, 2]], u); shake = 5 * Math.sin(u * 30); }
  else if (k === "throne") { x = 540; y = kf([[0, 1000], [1, 1130]], u); zoom = kf([[0, 1.05], [0.6, 0.95], [1, 0.8]], u); roll = kf([[0, 0], [0.7, 3], [1, 5]], u); shake = 10 * smooth(seg(u, 0.2, 0.45)) * (1 - smooth(seg(u, 0.5, 0.8))); }
  else if (k === "radiance") { x = 540; y = 900; zoom = kf([[0, 0.78], [0.6, 0.95], [1, 1.12]], u); shake = 8 * smooth(seg(u, 0.38, 0.5)) * (1 - smooth(seg(u, 0.5, 0.65))); }
  else if (k === "gifts") { x = 540; y = 900; zoom = kf([[0, 1.1], [1, 0.9]], u); }
  else if (k === "ride") { x = kf([[0, 300], [1, 760]], u); y = 1050; zoom = kf([[0, 0.9], [1, 0.82]], u); }
  else if (k === "battle") { x = kf([[0, 560], [1, 640]], u); y = 1000; zoom = kf([[0, 0.72], [1, 0.8]], u); shake = 7 * Math.sin(u * 50) * smooth(seg(u, 0.1, 0.4)); }
  else if (k === "trident") { x = 540; y = kf([[0, 960], [0.45, 900], [0.8, 940], [1, 900]], u); zoom = kf([[0, 0.78], [0.45, 0.95], [0.5, 1.1], [0.62, 0.96], [1, 0.85]], u); shake = 22 * smooth(seg(u, 0.44, 0.5)) * (1 - smooth(seg(u, 0.5, 0.75))); }
  else { x = 540; y = kf([[0, 980], [1, 900]], u); zoom = kf([[0, 0.9], [1, 0.8]], u); }
  const hv = Math.floor(n * 30), sh = shake * (hash(hv) - 0.5), sv = shake * (hash(hv + 99) - 0.5);
  return { x, y, zoom, roll, shx: sh * 2, shy: sv * 2 };
}
const camAt = n => { const sk = shotAt(n), c0 = camBase(n, sk); return { ...c0, x: c0.x + ov("camDx", sk.k, 0), y: c0.y + ov("camDy", sk.k, 0), zoom: c0.zoom * ov("zoom", sk.k, 1) }; };

// ---------- shots: each draws its subject(s) into subM/sub2M and lights; returns { moon, extra } ----------
const GODS = [[200, 360], [880, 360], [120, 760], [960, 760], [220, 1160], [860, 1160], [540, 220], [540, 1250]];
function sigil(gl, x, y, r, a, t, i) { gl.save(); gl.globalAlpha = a; gl.fillStyle = "rgb(255,255,0)"; for (let k = 0; k < 22; k++) { const an = k / 22 * TAU + t * 0.6 * (i % 2 ? 1 : -1); gl.beginPath(); gl.arc(x + Math.cos(an) * r, y + Math.sin(an) * r, 3.2, 0, TAU); gl.fill(); } gl.globalAlpha = a * 0.7; for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + t * 0.3; gl.beginPath(); gl.arc(x + Math.cos(an) * r * 0.5, y + Math.sin(an) * r * 0.5, 2.6, 0, TAU); gl.fill(); } gl.beginPath(); gl.arc(x, y, 7, 0, TAU); gl.fill(); gl.restore(); }
function renderShot(n, t, sk, cam, scene) {
  const u = clamp((n - sk.t0) / (sk.t1 - sk.t0)), k = sk.k; let hero = null;
  LIGHTS = []; const LT = f => LIGHTS.push(f); L.clearLayer(subM); L.clearLayer(sub2M); L.clearLayer(subL); L.clearLayer(sub2L);
  const gm = subM.g, g2 = sub2M.g; L.applyCam(gm, cam, 1); L.applyCam(g2, cam, 1);
  let tintMain = 0.55, tintRim = 0.4;
  if (k === "defeat") {
    // eight god-sigils flicker and gutter out while horns rise over the moon
    LT(() => { L.applyCam(subL.g, cam, 1);
    GODS.forEach((q, i) => sigil(subL.g, q[0], q[1] + (1 - smooth(seg(u, 0.1 + i * 0.03, 0.9))) * 0 + smooth(seg(u, 0.45 + i * 0.03, 0.95)) * 130, 46 + 10 * Math.sin(t * 2 + i), (0.9 - smooth(seg(u, 0.35 + i * 0.04, 0.85))) * (0.8 + 0.2 * Math.sin(t * 9 + i * 3)), t, i)); });
    const rise = smoother(seg(u, 0.12, 0.8)); drawBuffalo(gm, 540, 1400 - 560 * rise, 255, { rage: rise });
    tintMain = 0.35; LT(() => { L.applyCam(subL.g, cam, 1); buffaloEyes(subL.g, 540, 1400 - 560 * rise, 255, smooth(seg(u, 0.5, 0.8))); });
    hero = "sub";
  } else if (k === "shape") {
    const ph = u * 3, which = Math.floor(ph) % 3, fr = ph % 1, f = Math.sin(clamp((fr - 0.35) / 0.6) * Math.PI);
    const jit = (hash(Math.floor(t * 18)) - 0.5);
    // buffalo head whose horns stretch and whose edge breaks into spikes between forms
    drawBuffalo(gm, 540, 900, 255 * (1 + 0.06 * Math.sin(t * 4)), { rage: 0.5 + 0.5 * Math.sin(ph * 2), tilt: 0.05 * jit });
    if (f > 0.05) { gm.fillStyle = "#fff"; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + ph, r = 380 + 150 * hash(i + which * 7); gm.beginPath(); gm.moveTo(540 + Math.cos(a - 0.08) * 200, 900 + Math.sin(a - 0.08) * 200); gm.lineTo(540 + Math.cos(a) * r * f, 900 + Math.sin(a) * r * f); gm.lineTo(540 + Math.cos(a + 0.08) * 200, 900 + Math.sin(a + 0.08) * 200); gm.closePath(); gm.fill(); } }
    tintMain = 0.45; LT(() => { L.applyCam(subL.g, cam, 1); buffaloEyes(subL.g, 540, 900, 255, 1); });
    hero = "sub";
  } else if (k === "throne") {
    // Indra's throne: tall arch + stepped dais; it tilts, cracks and sinks as the lights fall away
    const fall = smooth(seg(u, 0.25, 0.9)), rot = fall * 0.22, sink = fall * 260;
    gm.save(); gm.translate(540, 1120 + sink); gm.rotate(rot); gm.translate(-540, -1120); gm.fillStyle = "#fff";
    gm.beginPath(); gm.moveTo(300, 1180); gm.lineTo(300, 700); gm.bezierCurveTo(300, 380, 780, 380, 780, 700); gm.lineTo(780, 1180); gm.lineTo(730, 1180); gm.lineTo(730, 720); gm.bezierCurveTo(730, 450, 350, 450, 350, 720); gm.lineTo(350, 1180); gm.closePath(); gm.fill();
    gm.fillRect(380, 960, 320, 50); gm.fillRect(330, 1010, 420, 50); gm.fillRect(280, 1060, 520, 56); gm.fillRect(230, 1116, 620, 64); gm.restore();
    LT(() => { L.applyCam(subL.g, cam, 1); for (let i = 0; i < 34; i++) { const ph = (hash(i * 3) + u * (0.6 + hash(i))) % 1, x = 300 + hash(i * 5) * 480, y = 640 + ph * 900; subL.g.fillStyle = "rgb(255,255,0)"; subL.g.globalAlpha = (1 - ph) * smooth(seg(u, 0.3, 0.55)); subL.g.beginPath(); subL.g.arc(x, y, 2 + hash(i) * 4, 0, TAU); subL.g.fill(); } subL.g.globalAlpha = 1;
    glowDisc(subL.g, 540, 700 + sink * 0.4, 260, 0.5 * (1 - fall), "rgb(255,255,0)"); });
    tintMain = 0.95; hero = "sub";
  } else if (k === "radiance") {
    const conv = smooth(seg(u, 0.05, 0.5)), flash = Math.exp(-Math.pow((u - 0.5) / 0.05, 2)), form = smoother(seg(u, 0.5, 0.88));
    LT(() => { L.applyCam(subL.g, cam, 1); const gl = subL.g;
    GODS.forEach((q, i) => { for (let s = 0; s < 26; s++) { const tt = clamp(conv - s * 0.012), curve = Math.sin(tt * Math.PI) * 140 * (i % 2 ? 1 : -1); const x = mix(q[0], 540, tt * tt * (3 - 2 * tt)) + curve * 0.4, y = mix(q[1], 820, tt * tt * (3 - 2 * tt)) + curve; gl.fillStyle = "rgb(255,255,0)"; gl.globalAlpha = (1 - s / 26) * (1 - form * 0.7); gl.beginPath(); gl.arc(x, y, 7 - s * 0.22, 0, TAU); gl.fill(); } });
    gl.globalAlpha = 1; glowDisc(gl, 540, 820, 120 + 520 * flash + 160 * form, 0.25 + 0.7 * flash, "rgb(255,255,0)");
    if (form > 0) { for (let r = 0; r < 4; r++) { const R = (240 + r * 110) * form; for (let i = 0; i < 12 + r * 10; i++) { const a = i / (12 + r * 10) * TAU + t * 0.25 * (r % 2 ? 1 : -1); gl.fillStyle = "rgb(255,230,0)"; gl.globalAlpha = 0.5 * (1 - r * 0.15); gl.beginPath(); gl.arc(540 + Math.cos(a) * R, 820 + Math.sin(a) * R, 3.4, 0, TAU); gl.fill(); } } gl.globalAlpha = 1; } });
    gm.globalAlpha = smooth(seg(u, 0.62, 0.92)); drawGoddess(gm, 540, 950, 300 * (0.7 + 0.3 * form), t, { noWeapons: false, spread: 1 }); gm.globalAlpha = 1;
    tintMain = 1; tintRim = 1; hero = u > 0.7 ? "sub" : null;
  } else if (k === "gifts") {
    drawGoddess(gm, 540, 980, 300, t, { arms: 8, spread: 1, noWeapons: u < 0.7 });
    // chakra, bow and the lion arrive and dock at her hands
    const a1 = smoother(seg(u, 0.08, 0.38)), a2 = smoother(seg(u, 0.28, 0.58)), a3 = smoother(seg(u, 0.5, 0.85));
    const dock = (from, to, f) => [mix(from[0], to[0], f), mix(from[1], to[1], f) - Math.sin(f * Math.PI) * 120];
    if (u < 0.7) { const cp = dock([1050, 360], [760, 560], a1); L.applyCam(g2, cam, 1); weapon(g2, 1, cp, 0, 360, t); const bp = dock([30, 420], [340, 600], a2); weapon(g2, 2, bp, 0.2, 340, t); drawLion(g2, mix(1500, 790, a3), 1340, 150, t, 1 - a3 * 0.6); }
    tintMain = 1; tintRim = 1; hero = "sub";
  } else if (k === "ride") {
    const lx = mix(-200, 1250, u), bob = Math.sin(t * 7) * 8;
    drawLion(gm, lx, 1170 + bob, 200, t, 1); drawGoddess(gm, lx + 20, 960 + bob * 0.6, 150, t, { sit: true, arms: 8, spread: 0.9, reach: 0.9 });
    L.embers(g, cam, t, { n: 90, seed: 41, x0: lx - 900, x1: lx + 200, y0: 1000, y1: 1280, speed: 0.55, alpha: 0.8, color: "rgba(255,200,120,", p: 1 });
    tintMain = 1; tintRim = 1; hero = "sub";
  } else if (k === "battle") {
    const approach = smooth(seg(u, 0, 0.35)), hit = Math.sin(t * 9) * 0.5 + 0.5;
    const bx = mix(1450, 930, approach) + (u > 0.35 ? Math.sin(t * 14) * 14 : 0), form = Math.floor(t * 2.2) % 3;
    drawBuffalo(g2, bx, 960, 235, { rage: 1, tilt: -0.1 + 0.08 * Math.sin(t * 6) });
    if (form === 1) { g2.fillStyle = "#fff"; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t, r = 520 + 100 * hash(i); g2.beginPath(); g2.moveTo(bx + Math.cos(a - 0.1) * 260, 960 + Math.sin(a - 0.1) * 260); g2.lineTo(bx + Math.cos(a) * r, 960 + Math.sin(a) * r); g2.lineTo(bx + Math.cos(a + 0.1) * 260, 960 + Math.sin(a + 0.1) * 260); g2.closePath(); g2.fill(); } }
    drawLion(gm, 330 + Math.sin(t * 3) * 10, 1170, 180, t, 0.5); drawGoddess(gm, 350 + Math.sin(t * 3) * 10, 980, 135, t, { sit: true, arms: 8, spread: 1, reach: 1.15 + 0.15 * hit });
    LT(() => { L.applyCam(subL.g, cam, 1); const gl = subL.g; for (let i = 0; i < 6; i++) { const ph = (t * 1.8 + i / 6) % 1; if (ph < 0.3) { gl.strokeStyle = "rgb(255,255,0)"; gl.globalAlpha = 1 - ph / 0.3; gl.lineWidth = 6; gl.beginPath(); gl.arc(mix(520, 820, ph / 0.3), 900 + (i - 3) * 50, 70 + ph * 120, -1.2, 1.2); gl.stroke(); } } gl.globalAlpha = 1; });
    tintMain = 1; tintRim = 1; hero = "sub"; LT(() => { L.applyCam(sub2L.g, cam, 1); buffaloEyes(sub2L.g, bx, 960, 235, 1, -0.1); });
  } else if (k === "trident") {
    const thrust = smoother(seg(u, 0.18, 0.46)), cut = smooth(seg(u, 0.46, 0.62)), emerge = smoother(seg(u, 0.52, 0.8)), die = smooth(seg(u, 0.76, 0.92));
    const bx = 540, by = 1150;
    // buffalo head: split by a diagonal cut, the upper half falls away
    g2.save(); drawBuffalo(g2, bx, by, 240, { rage: 1 }); g2.restore();
    if (cut > 0) { const cx0 = bx, cy0 = by - 40; g2.save(); g2.globalCompositeOperation = "destination-out"; g2.beginPath(); g2.moveTo(cx0 - 700, cy0 + 120); g2.lineTo(cx0 + 700, cy0 - 120); g2.lineTo(cx0 + 700, cy0 - 1200); g2.lineTo(cx0 - 700, cy0 - 1200); g2.closePath(); g2.fill(); g2.restore();
      g2.save(); g2.translate(cut * 160, -cut * 50 + cut * cut * 480); g2.rotate(cut * 0.4); g2.translate(bx, by); g2.translate(-bx, -by); drawBuffalo(g2, bx, by, 240, { rage: 1 }); g2.globalCompositeOperation = "destination-in"; g2.beginPath(); g2.moveTo(cx0 - 700, cy0 + 120); g2.lineTo(cx0 + 700, cy0 - 120); g2.lineTo(cx0 + 700, cy0 - 1400); g2.lineTo(cx0 - 700, cy0 - 1400); g2.closePath(); g2.fill(); g2.restore(); }
    if (emerge > 0) drawDemon(gm, bx - 10, by - 150, 260, emerge);
    const ty = mix(-500, 640, thrust) + cut * 0, tx = bx + 40 - (1 - thrust) * 60; if (thrust > 0.01) drawTrident(gm, tx, ty - 20, 430, 0.08);
    LT(() => { L.applyCam(subL.g, cam, 1); if (u > 0.44 && u < 0.62) glowDisc(subL.g, bx, by - 60, 420 * (1 - Math.abs(u - 0.5) / 0.12 * 0.5), 0.4 * (1 - smooth(seg(u, 0.5, 0.62))), "rgb(255,255,0)"); });
    scene.subDis = die; tintMain = 0.7; tintRim = 0.8; scene.soft = true; hero = "sub";
  } else { // dawn
    const t2 = smooth(seg(u, 0, 0.3));
    LT(() => { L.applyCam(subL.g, cam, 1); GODS.forEach((q, i) => sigil(subL.g, mix(540, q[0], t2), mix(900, q[1] * 0.85 + 100, t2), 40 + 8 * Math.sin(t + i), 0.9 * t2, t, i));
    glowDisc(subL.g, 540, 760, 520, 0.35, "rgb(255,255,0)"); }); drawGoddess(gm, 540, 1040, 330, t, { arms: 8, spread: 1, reach: 1.05 });
    L.rings(g, cam, t, { n: 4, t0: sk.t0 + 0.4, speed: 0.25, maxR: 1300, cx: 540, cy: 1270 });
    tintMain = 1; tintRim = 1; hero = "sub"; scene.moonGain = 0.75; scene.moon = { x: 900, y: 470 - 30 * u, r: 190 };
  }
  shadeSub(subM, subL, { tint: tintMain, tintRim: tintRim, rimGain: scene.soft ? 0.9 : 1.7, dif: scene.soft ? 0.22 : 0.35, amb: scene.soft ? 0.02 : 0.04 });
  if (k === "battle" || k === "trident" || k === "gifts") shadeSub(sub2M, sub2L, { tint: k === "battle" ? 0.45 : 1, tintRim: k === "battle" ? 0.55 : 1 });
  for (const f of LIGHTS) f();
  return hero;
}

function caption(n) {
  lastCap = null; const b = SEGS.find(s => n >= s.start_seconds - 0.12 && n <= s.end_seconds + 0.5); if (!b) return;
  const disp = b.text.split(/\s+/).filter(Boolean), tokens = disp.length === b.words.length ? disp : b.words.map(w => w.word);
  g.save(); g.textBaseline = "middle"; g.textAlign = "left"; g.font = "800 62px 'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif";
  const lines = [[]]; let wsum = 0; const spaceW = g.measureText(" ").width + 6;
  tokens.forEach((tk, i) => { const w = g.measureText(tk).width; if (wsum + w > 880 && lines[lines.length - 1].length) { lines.push([]); wsum = 0; } lines[lines.length - 1].push({ tk, w, i }); wsum += w + spaceW; });
  const fadeIn = smooth((n - (b.start_seconds - 0.12)) / 0.2), fadeOut = 1 - smooth((n - (b.end_seconds + 0.25)) / 0.25), total = lines.length, y0 = 1560 - (total - 1) * 44;
  const maxLw = Math.max(...lines.map(ln => ln.reduce((a, q) => a + q.w + spaceW, -spaceW))); lastCap = { x0: W / 2 - maxLw / 2, x1: W / 2 + maxLw / 2, y0: y0 - 46, y1: y0 + (total - 1) * 88 + 46 };
  const gr = g.createLinearGradient(0, 1380, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.6)"); g.globalAlpha = fadeIn * fadeOut; g.fillStyle = gr; g.fillRect(0, 1380, W, H - 1380);
  lines.forEach((ln, li) => { const lw = ln.reduce((a, q) => a + q.w + spaceW, -spaceW); let x = W / 2 - lw / 2;
    for (const q of ln) { const wd = b.words[Math.min(q.i, b.words.length - 1)], state = n < wd.start ? 0 : n <= wd.end + 0.08 ? 1 : 2;
      g.shadowColor = "rgba(0,0,0,0.9)"; g.shadowBlur = 22; g.globalAlpha = fadeIn * fadeOut * (state === 0 ? 0.42 : 1); g.fillStyle = state === 1 ? "rgb(255,184,74)" : "#f6f8ff"; g.fillText(q.tk, x, y0 + li * 88); x += q.w + spaceW; } });
  g.restore();
}

function renderFrame(t) {
  const n = t - LEAD, sk = shotAt(n), cam = camAt(n); lastCam = cam;
  let dis = 0; for (const q of SHOTS.slice(1)) { const cb = q.t0 + 0.3; const a = smooth(seg(n, cb - 0.3, cb)), b = smooth(seg(n, cb, cb + 0.3)); if (n >= cb - 0.3 && n < cb) dis = Math.max(dis, a); if (n >= cb && n < cb + 0.3) dis = Math.max(dis, 1 - b); }
  if (t < 1.2) dis = Math.max(dis, 1 - smooth(t / 1.2));
  const fadeEnd = smooth(seg(t, DURATION - 0.8, DURATION));
  const scene = { dis, moon: { ...MOON, x: MOON.x + ov("moonShift", sk.k, { dx: 0, dy: 0 }).dx, y: MOON.y + ov("moonShift", sk.k, { dx: 0, dy: 0 }).dy } };
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#020306"; g.fillRect(0, 0, W, H);
  const bgg = g.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H * 0.4, 1300); bgg.addColorStop(0, "#0b1018"); bgg.addColorStop(1, "#020306"); g.fillStyle = bgg; g.fillRect(0, 0, W, H);
  L.drawStars(g, cam, t, 140, 3);
  const outdoors = !["throne", "radiance", "gifts", "trident"].includes(sk.k);
  renderShot(n, t, sk, cam, scene);
  if (scene.moon && sk.k !== "radiance") { drawSky(cam, scene); const mpp = L.project(cam, 0.05, scene.moon.x, scene.moon.y); curMoon = { x: mpp.x, y: mpp.y, r: scene.moon.r * mpp.s }; }
  else curMoon = { x: -999, y: -999, r: 1 };
  if (outdoors) { drawHills(cam, scene, sk.k === "dawn"); }
  if (sk.k === "ride" || sk.k === "battle" || sk.k === "dawn") drawGround(cam, scene, 0.3);
  // subject layers (dotted) then glow overlays
  const sd = scene.subDis || 0;
  L.dotify(g, sub2L, { cell: 6, gain: ov("heroGain", "all", 1), dis: Math.max(dis, 0), seed: 17 });
  L.dotify(g, subL, { cell: 6, gain: ov("heroGain", "all", 1), dis: Math.max(dis, sd), seed: 7 });
  L.bloom(g, bloomTmp, [[30, 0.55], [10, 0.4]]);
  L.embers(g, cam, t, { n: 38, seed: 33, x0: 0, x1: W, y0: 300, y1: 1500, speed: 0.04, alpha: 0.45, p: 0.3 });
  L.filmFinish(g, Math.floor(t * 24));
  caption(n);
  if (fadeEnd > 0) { g.fillStyle = "rgba(0,0,0," + fadeEnd + ")"; g.fillRect(0, 0, W, H); }
}
window.getDuration = () => DURATION;
window.renderAt = t => { t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); };
window.__shots = { LEAD, DURATION, SHOTS };
window.__debug = t => {
  t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); const n = t - LEAD, sk = shotAt(n);
  const m = subM.g.getImageData(0, 0, LW, LH).data, hl = subL.g.getImageData(0, 0, LW, LH).data;
  let cnt = 0, minx = LW, miny = LH, maxx = -1, maxy = -1, border = 0, blown = 0, inMoon = 0, moonLum = 0, inCap = 0, lumSum = 0;
  const mr = curMoon.r / 2, mx = curMoon.x / 2, my = curMoon.y / 2;
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const i = (y * LW + x) * 4; if (m[i + 3] < 128) continue; cnt++;
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
    if (x < 2 || y < 2 || x >= LW - 2 || y >= LH - 2) border++;
    const lum = hl[i] / 255; lumSum += lum; if (lum > 0.85) blown++;
    const dx = x - mx, dy = y - my; if (dx * dx + dy * dy < mr * mr) { inMoon++; moonLum += lum; }
    if (lastCap && x * 2 >= lastCap.x0 && x * 2 <= lastCap.x1 && y * 2 >= lastCap.y0 && y * 2 <= lastCap.y1) inCap++;
  }
  return { t, n, shot: sk.k, cam: { x: lastCam.x, y: lastCam.y, zoom: lastCam.zoom }, moon: curMoon, caption: lastCap,
    hero: cnt > 150 ? { area: cnt / (LW * LH), bbox: [minx * 2, miny * 2, maxx * 2, maxy * 2], border: border / cnt, blown: blown / cnt, meanLum: lumSum / cnt, moonOverlap: inMoon / cnt, moonLum: inMoon ? moonLum / inMoon : 0, capOverlap: inCap / cnt } : null };
};
renderFrame(0);
