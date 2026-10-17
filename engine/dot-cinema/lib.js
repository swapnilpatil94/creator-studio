// Dot-cinema runtime: everything is a pure function of time t. No Math.random, no wall clock.
export const W = 1080, H = 1920, LW = 540, LH = 960, TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
export const smoother = v => { v = clamp(v); return v * v * v * (v * (v * 6 - 15) + 10); };
export const mix = (a, b, t) => a + (b - a) * t;
export const hash = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
export const easeOut = v => 1 - Math.pow(1 - clamp(v), 3);
export const easeIn = v => Math.pow(clamp(v), 3);
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const rad = d => d * Math.PI / 180;

export function makeLayer(w = LW, h = LH) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return { c, g: c.getContext("2d", { willReadFrequently: true }) };
}
export function clearLayer(L) { L.g.setTransform(1, 0, 0, 1, 0, 0); L.g.clearRect(0, 0, L.c.width, L.c.height); }

// Camera: {x,y,zoom,roll,shx,shy}. p = parallax depth (0 far .. 1 on the action plane)
export function applyCam(g, cam, p) {
  const s = Math.pow(cam.zoom, 0.35 + 0.65 * p);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(LW / 2 + (cam.shx || 0) * 0.5, LH / 2 + (cam.shy || 0) * 0.5);
  g.rotate(rad((cam.roll || 0) * (0.4 + 0.6 * p)));
  g.scale(0.5 * s, 0.5 * s);
  g.translate(-(W / 2 + (cam.x - W / 2) * p), -(H / 2 + (cam.y - H / 2) * p));
}
// world -> screen (1080 space) for direct-drawn elements
export function project(cam, p, x, y) {
  const s = Math.pow(cam.zoom, 0.35 + 0.65 * p);
  let dx = x - (W / 2 + (cam.x - W / 2) * p), dy = y - (H / 2 + (cam.y - H / 2) * p);
  const r = rad((cam.roll || 0) * (0.4 + 0.6 * p)), c = Math.cos(r), sn = Math.sin(r);
  return { x: W / 2 + (cam.shx || 0) + (dx * c - dy * sn) * s, y: H / 2 + (cam.shy || 0) + (dx * sn + dy * c) * s, s };
}

// ---------- dotify: luminance(R) + tint(G) layer -> hex dot matrix ----------
const COOL = [226, 236, 255], WARM = [255, 178, 70], GOLD = [255, 206, 110];
const CRIMSON = [226, 62, 48], TINTS = [COOL, [240, 222, 200], WARM, GOLD, CRIMSON];   // tint index 4 (crimson) is selected by the B channel > 128
export function dotify(g, L, o) {
  const cell = o.cell || 7, gain = o.gain === undefined ? 1 : o.gain, alpha = o.alpha === undefined ? 1 : o.alpha;
  const dis = o.dis || 0, seed = o.seed || 0, maxR = o.maxR || 0.52;
  const d = L.g.getImageData(0, 0, LW, LH).data;
  const NB = 8, buckets = [];
  for (let i = 0; i < NB * 5; i++) buckets.push(new Path2D());
  const rowH = cell * 0.866;
  let row = 0;
  for (let y = cell / 2; y < H; y += rowH, row++) {
    let col = 0;
    for (let x = (row & 1) * cell / 2 + cell / 2; x < W; x += cell, col++) {
      const i = (((y / 2) | 0) * LW + ((x / 2) | 0)) * 4;
      const a = d[i + 3];
      if (a < 6) continue;
      const Lm = Math.pow(d[i] * a / 65025 * gain, 1.3);
      if (Lm < 0.045) continue;
      const gt = d[i + 1];
      const tb = d[i + 2] > 128 ? 4 : gt < 40 ? 0 : gt < 110 ? 1 : gt < 190 ? 2 : 3;
      const rb = Math.min(NB - 1, (Math.min(1, Lm) * NB) | 0);
      let px = x, py = y;
      if (dis > 0) {
        const hv = hash(row * 977 + col + seed), ang = hv * TAU, mag = Math.pow(dis, 1.4) * (60 + 220 * hash(hv * 91 + 3));
        px += Math.cos(ang) * mag * 0.7; py += Math.sin(ang) * mag * 0.5 - dis * 90 * (0.3 + hv);
      }
      const r = cell * maxR * Math.pow((rb + 1) / NB, 0.75) * (1 - dis * 0.6);
      const p = buckets[tb * NB + rb];
      p.moveTo(px + r, py); p.arc(px, py, r, 0, TAU);
    }
  }
  g.save();
  g.globalAlpha = alpha * (1 - dis);
  for (let tb = 0; tb < 5; tb++) {
    const c = TINTS[tb]; g.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
    for (let rb = 0; rb < NB; rb++) g.fill(buckets[tb * NB + rb]);
  }
  g.restore();
}

export function bloom(g, tmp, strengths) {
  tmp.g.setTransform(1, 0, 0, 1, 0, 0); tmp.g.clearRect(0, 0, W, H); tmp.g.drawImage(g.canvas, 0, 0);
  g.save(); g.globalCompositeOperation = "lighter";
  for (const s of strengths) { g.globalAlpha = s[1]; g.filter = "blur(" + s[0] + "px)"; g.drawImage(tmp.c, 0, 0); }
  g.restore();
}

// ---------- the vanara hero rig (side profile, faces +x) ----------
const D = a => [Math.cos(a), Math.sin(a)];
const add = (p, v, l) => [p[0] + v[0] * l, p[1] + v[1] * l];
function capsule(g, a, ra, b, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6;
  const ang = Math.atan2(dy, dx), off = Math.acos(clamp((ra - rb) / d, -1, 1));
  g.beginPath(); g.arc(a[0], a[1], ra, ang + off, ang + TAU - off); g.arc(b[0], b[1], rb, ang - off, ang + off); g.closePath(); g.fill();
}
function disc(g, p, r) { g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fill(); }

export const POSES = {
  sit:   { spine: -52, head: 26, armF: [62, -8], armB: [74, -2], legF: [-32, 106, 10], legB: [-18, 100, 6], tail: [168, 13, 0.4], gada: { ang: -98, hand: "F" } },
  stand: { spine: -90, head: -4, armF: [74, 40], armB: [104, 112], legF: [82, 90, 6], legB: [100, 88, 178], tail: [160, 17, 0.5], gada: { ang: -82, hand: "F" } },
  power: { spine: -94, head: -28, armF: [30, -50], armB: [150, 200], legF: [60, 95, 5], legB: [118, 85, 178], tail: [176, 16, 0.6], gada: { ang: -100, hand: "F" } },
  coil:  { spine: -48, head: -22, armF: [100, 40], armB: [130, 60], legF: [20, 120, 8], legB: [50, 130, 2], tail: [160, 9, 0.5], gada: { ang: -110, hand: "B" } },
  leap:  { spine: -22, head: -14, armF: [-8, -4], armB: [-120, -60], legF: [168, 205, 190], legB: [176, 170, 160], tail: [196, 4, 1.0], gada: { ang: -150, hand: "B" } },
  glide: { spine: -12, head: -8, armF: [-6, -2], armB: [-125, -70], legF: [172, 196, 188], legB: [180, 176, 168], tail: [192, 3, 1.2], gada: { ang: -155, hand: "B" } },
  fly:   { spine: -94, head: -20, armF: [-80, -80], armB: [150, 205], legF: [88, 125, 105], legB: [106, 100, 92], tail: [122, 5, 1.0], gada: { ang: -118, hand: "B" } },
  bow:   { spine: -100, head: 34, armF: [-30, 20], armB: [140, 190], legF: [92, 130, 108], legB: [104, 108, 96], tail: [128, 6, 0.8], gada: { ang: -120, hand: "B" } }
};
export function lerpPose(a, b, t) {
  const L = (x, y) => x + (y - x) * t, A = (p, q) => p.map((v, i) => L(v, q[i]));
  return { spine: L(a.spine, b.spine), head: L(a.head, b.head), armF: A(a.armF, b.armF), armB: A(a.armB, b.armB), legF: A(a.legF, b.legF), legB: A(a.legB, b.legB), tail: A(a.tail, b.tail), gada: t < 0.5 ? a.gada : b.gada, gadaAng: L(a.gada.ang, b.gada.ang) };
}
export function solve(p, t) {
  const pel = [0, 0], aS = D(rad(p.spine));
  const neck = add(pel, aS, 1.0), chest = add(pel, aS, 0.66), waist = add(pel, aS, 0.28), sh = add(pel, aS, 0.84);
  const head = add(neck, aS, 0.3);
  const arm = (a, o) => { const e = add(sh, D(rad(a[0])), 0.78), w = add(e, D(rad(a[1])), 0.72); return { s: sh, e, w }; };
  const aF = arm(p.armF), aB = arm(p.armB);
  const leg = l => { const k = add(pel, D(rad(l[0])), 0.95), a = add(k, D(rad(l[1])), 0.95), t2 = add(a, D(rad(l[2])), 0.4); return { h: pel, k, a, t: t2 }; };
  const lF = leg(p.legF), lB = leg(p.legB);
  const tail = [add(pel, D(rad(p.tail[0] + 180 > 360 ? p.tail[0] : p.tail[0])), 0)]; // placeholder root
  const tailPts = [[-0.05, 0.05]]; let ang = rad(p.tail[0]), cur = [-0.05, 0.05];
  for (let i = 0; i < 9; i++) {
    ang += rad(p.tail[1]) * (1 + i * 0.05) + Math.sin((t || 0) * 3.2 - i * 0.7) * rad(9) * (i / 9) * (p.tail[2] || 0.4);
    cur = add(cur, D(ang), 0.31); tailPts.push(cur);
  }
  return { pel, neck, chest, waist, sh, head, aF, aB, lF, lB, tailPts, spineDir: aS, headAng: rad(p.head) };
}
export function groundShift(p) { const j = solve(p, 0); let m = -1e9; for (const l of [j.lF, j.lB]) m = Math.max(m, l.a[1] + 0.09, l.t[1] + 0.09); return m; }

// draw the full silhouette (white) into g in WORLD px coords: origin = pelvis position, S = px per unit
export const HEAD_R = 0.33;
// head profile in head-local units (R=1): x forward, y down. Vanara: brow ridge, muzzle, jaw.
const HEAD_PATH = [[-0.85,0.05],[-0.95,-0.6,-0.5,-1.0,0.1,-1.0],[0.55,-1.0,0.8,-0.75,0.9,-0.55],[1.0,-0.5,1.05,-0.38,0.95,-0.3],[0.88,-0.2,0.95,-0.05,1.05,0.05],[1.25,0.08,1.5,0.12,1.62,0.28],[1.72,0.42,1.65,0.62,1.5,0.66],[1.35,0.68,1.2,0.68,1.1,0.66],[1.2,0.8,1.25,0.95,1.1,1.08],[0.9,1.2,0.5,1.2,0.15,1.05],[-0.2,0.95,-0.5,0.85,-0.7,0.7],[-0.85,0.55,-0.95,0.3,-0.85,0.05]];
const _sh = v => v > 1.0 ? 1.0 + (v - 1.0) * 0.42 : v;
for (const pt of HEAD_PATH) for (let i = 0; i < pt.length; i += 2) pt[i] = _sh(pt[i]);
const EAR_PATH = [[-0.4,-0.35],[-0.55,-0.75,-1.05,-0.7,-1.1,-0.2],[-1.12,0.2,-0.8,0.35,-0.55,0.2]];
function localPath(g, pts, T) {
  g.beginPath(); const m = T(pts[0][0], pts[0][1]); g.moveTo(m[0], m[1]);
  for (let i = 1; i < pts.length; i++) { const q = pts[i], a = T(q[0], q[1]), b = T(q[2], q[3]), c = T(q[4], q[5]); g.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); }
  g.closePath();
}
export function drawHeroMask(g, pose, S, ox, oy, t, opt = {}) {
  const j = solve(pose, t); const rot = rad(opt.rot || 0), cr = Math.cos(rot), sr = Math.sin(rot);
  const P = p => { const x = p[0] * S, y = p[1] * S; return [ox + x * cr - y * sr, oy + x * sr + y * cr]; };
  g.save(); g.fillStyle = "#fff";
  g.globalAlpha = 0.55;
  for (let i = 0; i < j.tailPts.length - 1; i++) capsule(g, P(j.tailPts[i]), S * (0.115 - i * 0.0085), P(j.tailPts[i + 1]), S * (0.115 - (i + 1) * 0.0085));
  const legDraw = l => { capsule(g, P(l.h), S * 0.31, P(l.k), S * 0.2); capsule(g, P(l.k), S * 0.2, P(l.a), S * 0.125); capsule(g, P(l.a), S * 0.125, P(l.t), S * 0.085); disc(g, P(l.k), S * 0.205);
    const m = [l.h[0] * 0.6 + l.k[0] * 0.4, l.h[1] * 0.6 + l.k[1] * 0.4]; disc(g, P(m), S * 0.27); };
  const armDraw = a => { capsule(g, P(a.s), S * 0.25, P(a.e), S * 0.185); capsule(g, P(a.e), S * 0.185, P(a.w), S * 0.125); disc(g, P(a.w), S * 0.15);
    const m = [a.s[0] * 0.55 + a.e[0] * 0.45, a.s[1] * 0.55 + a.e[1] * 0.45]; disc(g, P(m), S * 0.225); };
  g.globalAlpha = 1;
  legDraw(j.lB); armDraw(j.aB);
  // heroic torso: narrow waist, huge chest, wide shoulders
  capsule(g, P(j.pel), S * 0.33, P(j.waist), S * 0.25);
  capsule(g, P(j.waist), S * 0.25, P(j.chest), S * 0.5);
  disc(g, P(j.sh), S * 0.36);
  capsule(g, P(j.chest), S * 0.5, P(j.neck), S * 0.22);
  g.beginPath(); const lc = P(j.pel); const dn = D(rad(pose.legF[0]));
  { const A = P([-0.34, -0.08]), B = P([0.34, -0.08]), C2 = P([dn[0] * 0.55 + 0.12, dn[1] * 0.55]), D2 = P([-0.1, 0.5]), E2 = P([-0.3, 0.35]); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(C2[0], C2[1]); g.lineTo(D2[0], D2[1]); g.lineTo(E2[0], E2[1]); } g.closePath(); g.fill();
  legDraw(j.lF);
  const hand = pose.gada.hand === "F" ? j.aF.w : pose.gada.hand === "B" ? j.aB.w : null;
  let gadaHead = null;
  if (hand && !opt.noGada) {
    const dg = D(rad(pose.gadaAng !== undefined ? pose.gadaAng : pose.gada.ang));
    const base = add(hand, dg, -0.4), top = add(hand, dg, 1.0);
    capsule(g, P(base), S * 0.05, P(top), S * 0.055); gadaHead = add(hand, dg, 1.38);
    capsule(g, P(top), S * 0.12, P(gadaHead), S * 0.26); disc(g, P(add(hand, dg, 1.32)), S * 0.27);
  }
  armDraw(j.aF);
  // head from the profile path
  const R = S * HEAD_R, ha = j.headAng + rot, hf = D(ha), hd = [-hf[1], hf[0]], hc = P(add(j.neck, j.spineDir, 0.3));
  const T = (x, y) => [hc[0] + hf[0] * x * R + hd[0] * y * R, hc[1] + hf[1] * x * R + hd[1] * y * R];
  capsule(g, P(j.neck), S * 0.24, hc, S * 0.22);
  localPath(g, HEAD_PATH, T); g.fill();
  { const e = T(-0.5, 0.02); disc(g, e, R * 0.34); }
  // crown (mukut): wide band with three modest peaks, not a horn
  const C = (x, y) => T(x, y - 0.7);
  g.beginPath(); const cp = [[-0.62, 0.3], [0.62, 0.3], [0.56, -0.08], [0.44, -0.08], [0.4, -0.45], [0.24, -0.14], [0.05, -0.78], [-0.14, -0.14], [-0.32, -0.45], [-0.44, -0.08], [-0.56, -0.08]];
  const crownPts = cp.map(q => C(q[0], q[1])); crownPts.forEach((w, i) => { if (i) g.lineTo(w[0], w[1]); else g.moveTo(w[0], w[1]); }); g.closePath(); g.fill();
  g.globalCompositeOperation = "destination-out"; g.lineCap = "round";
  g.lineWidth = Math.max(1.4, R * 0.045); g.beginPath(); let m0 = T(1.02, 0.5), m1 = T(1.5, 0.52); g.moveTo(m0[0], m0[1]); g.quadraticCurveTo(...T(1.3, 0.62), m1[0], m1[1]); g.stroke();
  const eye = T(0.74, -0.3); g.beginPath(); g.ellipse(eye[0], eye[1], R * 0.13, R * 0.07, ha + 0.15, 0, TAU); g.fill();
  const nos = T(1.5, 0.3); g.beginPath(); g.arc(nos[0], nos[1], R * 0.04, 0, TAU); g.fill();
  g.restore();
  return { j, P, eye, crown: crownPts, gadaHead: gadaHead && P(gadaHead), hc, neck: P(j.neck), chest: P(j.chest), pel: P(j.pel), hand: hand && P(hand), S, R, T };
}

// emboss lighting from a blurred height-field: gives volume + rim, written as R=luma G=tint
const _tmp = { c: null, g: null };
export function shade(maskL, outL, o) {
  if (!_tmp.c) { _tmp.c = document.createElement("canvas"); _tmp.c.width = LW; _tmp.c.height = LH; _tmp.g = _tmp.c.getContext("2d", { willReadFrequently: true }); }
  const tg = _tmp.g; tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, LW, LH); tg.filter = "blur(" + (o.blur || 6) + "px)"; tg.drawImage(maskL.c, 0, 0); tg.filter = "none";
  if (!_tmp.c2) { _tmp.c2 = document.createElement("canvas"); _tmp.c2.width = LW; _tmp.c2.height = LH; _tmp.g2 = _tmp.c2.getContext("2d", { willReadFrequently: true }); }
  const tg2 = _tmp.g2; tg2.setTransform(1, 0, 0, 1, 0, 0); tg2.clearRect(0, 0, LW, LH); tg2.filter = "blur(" + ((o.blur || 6) * (o.wide || 5)) + "px)"; tg2.drawImage(maskL.c, 0, 0); tg2.filter = "none"; const b2 = tg2.getImageData(0, 0, LW, LH).data;
  const m = maskL.g.getImageData(0, 0, LW, LH).data, b = tg.getImageData(0, 0, LW, LH).data;
  const od = outL.g.createImageData(LW, LH), out = od.data;
  const Lx = o.light[0], Ly = o.light[1], Lz = o.light[2], rx = o.rim[0], ry = o.rim[1];
  const K = o.K || 7, amb = o.amb === undefined ? 0.1 : o.amb, dif = o.dif === undefined ? 0.5 : o.dif, rimG = o.rimGain === undefined ? 1.2 : o.rimGain;
  const tint = o.tint || 0, tintRim = o.tintRim || 0;
  for (let y = 1; y < LH - 1; y++) {
    for (let x = 1; x < LW - 1; x++) {
      const i = (y * LW + x) * 4, mk = m[i + 3];
      if (mk < 8) continue;
      const hx = (b[i + 3 + 4] - b[i + 3 - 4]) / 255, hy = (b[i + 3 + LW * 4] - b[i + 3 - LW * 4]) / 255;
      const hx2 = (b2[i + 3 + 4] - b2[i + 3 - 4]) / 255, hy2 = (b2[i + 3 + LW * 4] - b2[i + 3 - LW * 4]) / 255; let nx = -hx * K - hx2 * K * (o.wideMix || 3), ny = -hy * K - hy2 * K * (o.wideMix || 3), nz = 1; const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1); nx *= inv; ny *= inv; nz *= inv;
      const lam = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
      const ed = Math.sqrt(nx * nx + ny * ny), facing = ed > 1e-3 ? Math.max(0, (nx * rx + ny * ry) / ed) : 0;
      const rim = Math.pow(ed, 1.2) * facing;
      let L = amb + dif * lam + rimG * rim; if (o.fur) L *= 1 - o.fur + o.fur * 2 * hash(((x >> 1) * 7 + (y >> 1) * 131) * 0.37); if (o.top) L *= 1 - o.top + o.top * (1 - y / LH); if (L > 1) L = 1;
      out[i] = (L * 255 * (mk / 255)) | 0; out[i + 1] = Math.min(255, (tint + tintRim * rim) * 255) | 0; out[i + 3] = 255;
    }
  }
  outL.g.setTransform(1, 0, 0, 1, 0, 0); outL.g.putImageData(od, 0, 0);
}

// ---------- environment ----------
export function paintMoon(g, x, y, r, gain = 0.82) {
  const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
  gr.addColorStop(0, "rgb(" + (255 * gain | 0) + ",0,0)"); gr.addColorStop(0.75, "rgb(" + (200 * gain | 0) + ",0,0)"); gr.addColorStop(1, "rgb(" + (120 * gain | 0) + ",0,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  for (let i = 0; i < 16; i++) { const a = hash(i * 3.3) * TAU, d = hash(i * 7.1) * r * 0.82, cr = r * (0.05 + hash(i * 1.9) * 0.14);
    g.fillStyle = "rgba(0,0,0," + (0.18 + hash(i) * 0.25) + ")"; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, 0, TAU); g.fill(); }
  g.restore();
}
export function rockPoly(g, pts, seed, jag = 18) {
  g.beginPath(); let first = true;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(2, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 30));
    for (let k = 0; k < n; k++) { const u = k / n, nx = a[0] + (b[0] - a[0]) * u + (hash(seed + i * 31 + k) - 0.5) * jag, ny = a[1] + (b[1] - a[1]) * u + (hash(seed + i * 17 + k * 3) - 0.5) * jag; if (first) { g.moveTo(nx, ny); first = false; } else g.lineTo(nx, ny); }
  }
  const l = pts[pts.length - 1]; g.lineTo(l[0], l[1]); g.closePath(); g.fill();
}

export function drawStars(g, cam, t, n, seed) {
  for (let i = 0; i < n; i++) {
    const wx = hash(i * 3 + seed) * 2400 - 660, wy = hash(i * 7 + seed) * 1150 - 80;
    const p = project(cam, 0.08, wx, wy), b = 0.3 + 0.7 * hash(i * 5 + seed), tw = 0.65 + 0.35 * Math.sin(t * (1 + hash(i) * 2) + i);
    g.fillStyle = "rgba(235,242,255," + (b * tw * 0.9) + ")"; g.beginPath(); g.arc(p.x, p.y, 0.8 + hash(i * 11 + seed) * 2.0, 0, TAU); g.fill();
  }
}

// perspective dot ocean (direct-drawn). refl: [{sx, w, str, tint}] light reflection columns in screen x
export function drawOcean(g, cam, t, o) {
  const hy = project(cam, 0.6, 0, o.horizon || 1000).y, so = Math.pow(cam.zoom, 0.35 + 0.65 * 0.6);
  const amp = (o.amp === undefined ? 14 : o.amp), rows = 76, alphaMul = o.alpha === undefined ? 1 : o.alpha, dis = o.dis || 0;
  const buckets = []; for (let i = 0; i < 12; i++) buckets.push(new Path2D());
  const camPhase = cam.x * 0.6 * 0.02;
  for (let r = 0; r < rows; r++) {
    const k = r / rows, d = Math.pow(k, 2.15), y0 = hy + d * (H - hy + 80);
    if (y0 > H + 20) break;
    const sp = (4 + d * 30) * so, size = (0.7 + d * 4.4) * Math.min(so, 1.8);
    for (let x = -30 + (r % 2) * sp / 2; x < W + 30; x += sp) {
      const wv = Math.sin(x * 0.011 + r * 0.8 + t * 1.1 + camPhase) * amp * d + Math.sin(x * 0.027 - r * 0.45 + t * 1.7) * amp * 0.5 * d;
      let dy = wv, boost = 0;
      if (o.disturb) for (const q of o.disturb) { const dx = (x - q.x) / (q.r * (0.5 + d)); const e = Math.exp(-dx * dx) * q.str; dy -= e * 70 * d * Math.sin(r * 0.7 - (q.t || t) * 5); boost += e * 0.7; }
      let refl = 0, tb = 0;
      if (o.refl) for (const q of o.refl) { const rr = Math.exp(-Math.pow((x - q.sx) / (q.w * (0.35 + d * 1.1)), 2)) * q.str * (0.55 + 0.45 * Math.sin(r * 1.9 + x * 0.045 + t * 1.5)); if (rr > refl) { refl = rr; tb = q.tint ? 1 : 0; } }
      const crest = Math.max(0, Math.sin(x * 0.011 + r * 0.8 + t * 1.1 + camPhase)) * 0.25 * d;
      const a = clamp((0.1 + d * 0.28 + refl * 0.9 + crest + boost * 0.5) * alphaMul);
      if (a < 0.06) continue;
      const bi = Math.min(5, (a * 6) | 0) + tb * 6;
      let px = x, py = y0 + dy;
      if (dis > 0) { const hv = hash(r * 313 + (x | 0)); px += (hv - 0.5) * dis * 180; py += (hash(hv * 7) - 0.7) * dis * 160; }
      const rr = size * (0.6 + refl * 0.8 + boost * 0.4) * (1 - dis * 0.5);
      buckets[bi].moveTo(px + rr, py); buckets[bi].arc(px, py, rr, 0, TAU);
    }
  }
  g.save();
  for (let tb = 0; tb < 2; tb++) for (let ai = 0; ai < 6; ai++) {
    g.globalAlpha = (0.18 + ai * 0.17) * (1 - dis); g.fillStyle = tb ? "rgb(255,196,110)" : "rgb(176,198,232)"; g.fill(buckets[tb * 6 + ai]);
  }
  g.restore();
  return hy;
}

export function embers(g, cam, t, o) { // o: n, seed, x0,x1,y0,y1 (world), speed, p, color
  const p = o.p === undefined ? 1 : o.p;
  g.save();
  for (let i = 0; i < o.n; i++) {
    const ph = (hash(i * 5 + o.seed) + t * (o.speed || 0.12) * (0.6 + hash(i * 3 + o.seed))) % 1;
    const wx = o.x0 + hash(i * 3 + o.seed) * (o.x1 - o.x0) + Math.sin(ph * 9 + i) * 30, wy = o.y1 - ph * (o.y1 - o.y0);
    const q = project(cam, p, wx, wy), a = Math.sin(ph * Math.PI) * (0.4 + 0.6 * hash(i * 7 + o.seed)) * (o.alpha || 1);
    g.fillStyle = (o.color || "rgba(255,170,70,") + a + ")"; g.beginPath(); g.arc(q.x, q.y, (1.2 + hash(i * 9 + o.seed) * 2.4) * Math.min(q.s, 2), 0, TAU); g.fill();
  }
  g.restore();
}

export function windStreams(g, cam, t, o) { // dotted wavy streamlines flowing across a focus point
  g.save();
  for (let s = 0; s < o.n; s++) {
    const yy = o.cy + (hash(s * 3 + o.seed) - 0.5) * o.h, ph = hash(s * 7 + o.seed), sp = 0.35 + hash(s * 5 + o.seed) * 0.5, amp = 18 + hash(s) * 40;
    for (let k = 0; k < 22; k++) {
      const u = ((k / 22 + t * sp * 0.5 + ph) % 1), wx = o.cx - o.w / 2 + u * o.w, wy = yy + Math.sin(u * 9 + ph * 6 + t * 1.5) * amp;
      const q = project(cam, o.p === undefined ? 1 : o.p, wx, wy), a = Math.sin(u * Math.PI) * o.str;
      g.fillStyle = "rgba(220,235,255," + a + ")"; g.beginPath(); g.arc(q.x, q.y, 1.4 + 2.2 * (1 - k / 22) * Math.min(q.s, 2.5), 0, TAU); g.fill();
    }
  }
  g.restore();
}

export function rings(g, cam, t, o) { // expanding dotted ellipses on the ground plane
  g.save();
  for (let r = 0; r < o.n; r++) {
    const u = ((t - o.t0) * o.speed - r * 0.12), fade = Math.sin(clamp(u) * Math.PI);
    if (u <= 0 || u >= 1) continue;
    const R = u * o.maxR, cnt = Math.floor(R * 0.55 + 20);
    for (let i = 0; i < cnt; i++) { const a = i / cnt * TAU, q = project(cam, 1, o.cx + Math.cos(a) * R, o.cy + Math.sin(a) * R * 0.22);
      g.fillStyle = "rgba(255," + (190 - u * 60 | 0) + "," + (110 - u * 50 | 0) + "," + fade * 0.85 + ")"; g.beginPath(); g.arc(q.x, q.y, (1.6 + 2.4 * (1 - u)) * Math.min(q.s, 2), 0, TAU); g.fill(); }
  }
  g.restore();
}

export function filmFinish(g, frameKey) {
  const gr = g.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.46, H * 0.78);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.82)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); for (let i = 0; i < 1400; i++) { g.fillStyle = "rgba(255,255,255," + (hash(i * 13 + frameKey) * 0.05) + ")"; g.fillRect(hash(i * 3 + frameKey) * W, hash(i * 5 + frameKey * 2) * H, 2, 2); } g.restore();
}
