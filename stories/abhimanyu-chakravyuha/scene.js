import * as L from "../../engine/dot-cinema/lib.js";
const { W, H, TAU, clamp, smooth, smoother, mix, hash, seg } = L;

const DATA = window.DATA, SEGS = DATA.segments;
const OV = window.OVERRIDES || {};
const ov = (grp, key, def) => (OV[grp] && OV[grp][key] !== undefined) ? OV[grp][key] : def;
const LEAD = 0.9, TAIL = 1.9, DURATION = DATA.duration_seconds + LEAD + TAIL;
const c = document.getElementById("c"), g = c.getContext("2d", { willReadFrequently: true });
const bloomTmp = L.makeLayer(W, H);
let curN = 0;
const GLOW = () => ov("glow", shotKey(curN), 1);
const DOTGAIN = () => ov("dotGain", shotKey(curN), 1);

function shotKey(n) { return n < 3.4 ? "form" : n < 9.5 ? "rings" : n < 12.9 ? "arjuna" : n < 18.5 ? "arrive" : n < 21.0 ? "vow" : n < 24.4 ? "break" : n < 29.5 ? "siege" : "star"; }
function kf(keys, n) { if (n <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (n <= b[0]) return mix(a[1], b[1], smoother((n - a[0]) / (b[0] - a[0]))); } return keys[keys.length - 1][1]; }
function lin(keys, n) { if (n <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (n <= b[0]) return mix(a[1], b[1], (n - a[0]) / (b[0] - a[0])); } return keys[keys.length - 1][1]; }

// ---------- the formation ----------
const RINGS = 7, R0 = 150, RSTEP = 105, RS = i => R0 + i * RSTEP;
const TC = i => 21.2 + (6 - i) * 0.36;           // time the spark crosses ring i (outer first)
const dots = [];
for (let i = 0; i < RINGS; i++) { const N = Math.round(TAU * RS(i) / 22); for (let k = 0; k < N; k++) for (let h = 0; h < 3; h++) dots.push({ i, a0: k / N * TAU + (h * 0.01), h: h * 15, hv: hash(i * 977 + k * 13 + h), key: dots.length }); }
const PILLARS = Array.from({ length: RINGS }, (_, i) => ({ i, a0: hash(i * 31 + 5) * TAU }));
const dirOf = i => (i % 2 ? 1 : -1), omOf = (i, conv) => (0.1 + 0.03 * i) * (1 + 2.5 * conv);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const conv = n => smoother(seg(n, 24.6, 27.3)) * (1 - 0.0 * smooth(seg(n, 27.4, 29)));
const ringR = (i, n) => mix(RS(i), 64 + i * 26, conv(n));
const ringAngle = (a0, i, n) => { // integrate rotation so contraction speed-up does not jump
  const base = (0.1 + 0.03 * i) * n, extra = 0.1 * (0.1 + 0.03 * i) * 0 + 2.5 * (0.1 + 0.03 * i) * (Math.max(0, n - 24.6) - Math.max(0, n - 27.3) * 0.0) * 0.45 * smooth(seg(n, 24.6, 27.3));
  return a0 + dirOf(i) * (base + extra);
};

// ---------- the protagonist: a point of light ----------
const ZK = [[13.0, -1060], [19.8, -930], [21.0, -840], [21.2, -780], [21.56, -675], [21.92, -570], [22.28, -465], [22.64, -360], [23.0, -255], [23.36, -150], [23.9, 0], [40, 0]];
const sparkZ = n => lin(ZK, n);
const sparkY = n => 22 + Math.sin(n * 3) * 3 + 1500 * Math.pow(smoother(seg(n, 29.5, 33.2)), 1.5);
const sparkPos = n => [0, sparkY(n), sparkZ(n)];
const sparkVisible = n => n >= 13.0;

// ---------- camera ----------
function cam3(n) {
  const k = shotKey(n);
  let tx, ty, tz;
  if (n < 12.85) { tx = kf([[-0.9, 0], [8.4, 0], [10.4, -420], [12.8, -1250]], n); ty = 0; tz = kf([[-0.9, 0], [8.4, 0], [11, 330], [12.8, 560]], n); }
  else { const sp = sparkPos(n - (n > 29.5 ? 0 : 0)); tx = 0; tz = sp[2]; ty = n < 29.5 ? 18 : sp[1] * 0.55; }
  const yaw = kf([[-0.9, 0], [3.3, 24], [9.2, -16], [10.4, -24], [12.8, -34], [12.9, 0], [21.0, 0], [23.9, 0], [24.4, 0], [29.3, 165], [32.6, 190]], n) + (n > 12.9 && n < 24.4 ? Math.sin(n * 0.9) * 2.2 : 0);
  const pitch = kf([[-0.9, 62], [3.3, 56], [9.2, 40], [12.8, 34], [12.9, 34], [15.2, 33], [18.3, 32], [21.0, 22], [23.9, 24], [24.4, 34], [27, 50], [29.3, 28], [30.4, 6], [32.6, -26]], n);
  const D = kf([[-0.9, 2000], [3.3, 1900], [9.2, 1500], [12.8, 1900], [12.9, 520], [14.6, 380], [16.0, 700], [18.4, 560], [19.8, 320], [21.0, 430], [23.9, 520], [24.4, 640], [28, 420], [29.3, 560], [31, 900], [32.6, 1500]], n);
  let shake = 0;
  for (let i = 0; i < RINGS; i++) { const dt = n - TC(i); if (dt > 0 && dt < 0.5) shake += 11 * Math.exp(-dt * 7); }
  if (n > 19.6 && n < 20.4) shake += 16 * Math.exp(-(n - 19.6) * 4);
  if (n > 29.0 && n < 29.9) shake += 14 * Math.exp(-(n - 29.0) * 3);
  const q = Math.floor(n * 30);
  return { tx, ty, tz, yaw: yaw * Math.PI / 180, pitch: pitch * Math.PI / 180, D, f: 1300 * ov("zoom", k, 1), roll: (n > 20 && n < 24 ? Math.sin(n * 2.3) * 0.03 : 0), sx: ov("camDx", k, 0) + shake * (hash(q) - 0.5) * 2, sy: ov("camDy", k, 0) + shake * (hash(q + 99) - 0.5) * 2 };
}
function pj(cm, X, Y, Z) {
  const x = X - cm.tx, y = Y - cm.ty, z = Z - cm.tz, cy = Math.cos(cm.yaw), sy = Math.sin(cm.yaw);
  const x1 = x * cy - z * sy, z1 = x * sy + z * cy, cp = Math.cos(cm.pitch), sp = Math.sin(cm.pitch);
  const y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp, d = z2 + cm.D; if (d < 40) return null;
  const s = cm.f / d; let sx = x1 * s, sy2 = -y2 * s;
  if (cm.roll) { const cr = Math.cos(cm.roll), sr = Math.sin(cm.roll); const rx = sx * cr - sy2 * sr, ry = sx * sr + sy2 * cr; sx = rx; sy2 = ry; }
  return { x: W / 2 + sx + cm.sx, y: H / 2 + sy2 + cm.sy, d, s };
}

// ---------- batched dot drawing ----------
const TINT = [[226, 236, 255], [255, 178, 70], [255, 96, 70], [150, 196, 255]];
class Batch { constructor() { this.b = []; for (let i = 0; i < 32; i++) this.b.push(new Path2D()); this.cnt = 0; }
  add(x, y, r, a, t) { if (a < 0.03 || x < -40 || x > W + 40 || y < -40 || y > H + 40) return; const bi = Math.min(7, (a * 8) | 0) + 8 * t; this.b[bi].moveTo(x + r, y); this.b[bi].arc(x, y, r, 0, TAU); this.cnt++; }
  flush(g, mul = 1) { for (let t = 0; t < 4; t++) { const c = TINT[t]; g.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; for (let a = 0; a < 8; a++) { g.globalAlpha = Math.min(1, (a + 0.5) / 8 * mul); g.fill(this.b[t * 8 + a]); } } g.globalAlpha = 1; } }

function stars(n, cm) {
  const reveal = 0.35 + 0.65 * smooth(seg(n, 28, 31.5));
  g.save();
  for (let i = 0; i < 200; i++) { const sx = hash(i * 3.1) * W, sy = hash(i * 7.7) * H * 0.85, b = 0.25 + 0.75 * hash(i * 5.5), tw = 0.6 + 0.4 * Math.sin(n * (0.8 + hash(i) * 2) + i);
    const px = ((sx - cm.yaw * 140 + W * 4) % W), py = sy - cm.pitch * 60 + (cm.pitch < 0 ? -cm.pitch * 400 : 0);
    g.fillStyle = "rgba(235,242,255," + (b * tw * 0.8 * reveal) + ")"; g.beginPath(); g.arc(px, py, 0.8 + hash(i * 9) * 1.8, 0, TAU); g.fill(); }
  g.restore();
}
function groundGrid(n, cm) {
  const a = 0.5 * (1 - smooth(seg(n, 29.6, 31.4))) * smooth(seg(n, 0.2, 2)); if (a < 0.02) return; const B = new Batch();
  for (let gx = -1300; gx <= 1300; gx += 110) for (let gz = -1300; gz <= 1300; gz += 110) { const r = Math.hypot(gx, gz); if (r > 1300) continue; const p = pj(cm, gx, 0, gz); if (!p) continue; B.add(p.x, p.y, Math.max(0.8, Math.min(4, 2.2 * p.s)), a * (1 - r / 1500) * clamp(1.2 - p.d / (cm.D * 2.6)), 0); }
  B.flush(g);
}

function formation(n, cm) {
  const B = new Batch(); let inFrame = 0, total = 0;
  const assembleEnd = 3.4, dissolve = smoother(seg(n, 29.6, 32.2));
  for (const d of dots) {
    const Ri = ringR(d.i, n), a = ringAngle(d.a0, d.i, n);
    let X = Ri * Math.cos(a), Z = Ri * Math.sin(a), Y = d.h;
    const e = smoother(clamp((n - (-0.3 + d.i * 0.14 + d.hv * 0.55)) / 1.8));
    if (e < 1) { X = mix((d.hv - 0.5) * 3600, X, e); Z = mix((hash(d.key * 3) - 0.5) * 3600 + 400, Z, e); Y = mix(300 + hash(d.key) * 900, Y, e); }
    let bright = 0.42 + 0.08 * d.i * 0 + 0.12 * Math.sin(n * 1.7 + d.hv * 9), tint = 0, size = 1;
    // ring pulse while "सात घेरे" is spoken
    const pulseT = 4.45 + d.i * 0.27, pp = n - pulseT; if (pp > 0 && pp < 0.9) { const w = Math.exp(-pp * 3.4); bright += 0.6 * w; size += 0.7 * w; tint = w > 0.35 ? 1 : tint; }
    // the spark breaks this ring
    const tc = TC(d.i), tau = n - tc;
    if (tau > -0.05) { const dAng = angDiff(a, -Math.PI / 2), wid = (dAng * Ri) / 95, w = Math.exp(-wid * wid); if (w > 0.02) { const pulse = tau < 0.14 ? Math.max(0, (tau + 0.05) / 0.19) : Math.exp(-(tau - 0.14) / 0.55); const u = w * pulse; X += Math.cos(a) * 190 * u + (d.hv - 0.5) * 140 * u; Z += Math.sin(a) * 190 * u; Y += 160 * u * (0.4 + d.hv); bright += 0.9 * u; size += 1.6 * u; tint = u > 0.15 ? 1 : tint; } }
    // siege: pressure flicker
    if (n > 24.6 && n < 29.2) { const f = smooth(seg(n, 24.6, 26)) * (0.5 + 0.5 * Math.sin(n * 9 + d.hv * 20)); bright += 0.25 * f; }
    if (dissolve > 0) { Y += dissolve * (500 + 1300 * d.hv); X += (d.hv - 0.5) * 900 * dissolve; Z += (hash(d.key * 5) - 0.5) * 900 * dissolve; bright *= (1 - dissolve * 0.55); }
    const p = pj(cm, X, Y, Z); total++; if (!p) continue;
    if (p.x > 0 && p.x < W && p.y > 0 && p.y < H) inFrame++;
    const fog = clamp(1.35 - p.d / (cm.D * 2.6)); const r = Math.max(0.9, Math.min(11, 5.2 * size * p.s));
    B.add(p.x, p.y, r, clamp(bright * DOTGAIN()) * fog * (0.55 + 0.45 * smooth(seg(n, -0.8, 0.6))), tint);
  }
  B.flush(g, GLOW() * 0.92 > 1 ? 1 : 1);
  return total ? inFrame / total : 0;
}

function pillars(n, cm) {
  const B = new Batch(), heads = [];
  for (const P of PILLARS) {
    const i = P.i, Ri = ringR(i, n), a = ringAngle(P.a0, i, n), e = smoother(clamp((n - (0.4 + i * 0.16)) / 1.6)); if (e < 0.01) continue;
    const dissolve = smoother(seg(n, 29.6, 31.8)), pp = n - (4.45 + i * 0.27), flare = pp > 0 && pp < 1 ? Math.exp(-pp * 2.6) : 0, siege = smooth(seg(n, 24.6, 26));
    const X = Ri * Math.cos(a), Z = Ri * Math.sin(a), hgt = 150 * e * (1 + 0.15 * siege) * (1 - dissolve * 0.5);
    for (let k = 0; k < 12; k++) { const y = hgt * k / 11 + dissolve * 700 * hash(i * 7 + k); const p = pj(cm, X, y, Z); if (!p) continue; B.add(p.x, p.y, Math.max(1, Math.min(7, 4.2 * p.s)), clamp((0.55 + 0.6 * flare + 0.3 * siege) * clamp(1.35 - p.d / (cm.D * 2.6))) * (1 - dissolve * 0.7), k > 9 ? 2 : 1); }
    const hp = pj(cm, X, hgt + dissolve * 700 * hash(i * 7), Z); if (hp) heads.push({ p: hp, flare, i, X, Z, hgt });
  }
  B.flush(g);
  g.save(); g.globalCompositeOperation = "lighter";
  for (const h of heads) { const r = Math.max(8, Math.min(34, 13 * h.p.s * (1 + h.flare * 1.4))); const gr = g.createRadialGradient(h.p.x, h.p.y, 0, h.p.x, h.p.y, r * 2.4); gr.addColorStop(0, "rgba(255,150,90," + (0.55 + 0.4 * h.flare) + ")"); gr.addColorStop(1, "rgba(255,90,40,0)"); g.fillStyle = gr; g.beginPath(); g.arc(h.p.x, h.p.y, r * 2.4, 0, TAU); g.fill(); }
  g.restore();
  // beams from every maharathi to the spark while he is surrounded
  const siege = smooth(seg(n, 25.2, 27)) * (1 - smooth(seg(n, 29.3, 30.2)));
  if (siege > 0.02) { const sp = sparkPos(n), BB = new Batch(); for (const h of heads) for (let k = 0; k < 9; k++) { const u = ((n * 0.9 + h.i * 0.13 + k / 9) % 1), X = mix(h.X, sp[0], u), Y = mix(h.hgt, sp[1], u), Z = mix(h.Z, sp[2], u), p = pj(cm, X, Y, Z); if (p) BB.add(p.x, p.y, Math.max(1, Math.min(5, 3.2 * p.s)), siege * 0.75 * Math.sin(u * Math.PI), 2); } BB.flush(g); }
}

const arjX = n => -1000 - 1500 * smoother(seg(n, 10.3, 12.9)), arjZ = n => 420 + 500 * smoother(seg(n, 10.3, 12.9));
function arjuna(n, cm) {
  if (n < 8.5 || n > 13.2) return;
  const fade = smooth(seg(n, 8.6, 9.3)) * (1 - smooth(seg(n, 12.3, 12.9)));
  const away = smoother(seg(n, 10.3, 12.9)), X = arjX(n), Z = arjZ(n), Y = 40 + 30 * away;
  const p = pj(cm, X, Y, Z); if (!p) return;
  const B = new Batch();
  for (let k = 1; k < 26; k++) { const q = pj(cm, X + k * 55 * (0.3 + away), Y, Z - k * 22 * (0.3 + away)); if (q) B.add(q.x, q.y, Math.max(1, 3.4 * q.s), fade * (1 - k / 26) * 0.7, 3); }
  for (let k = 0; k < 30; k++) { const ang = n * 1.6 + k * 0.7 + hash(k) * 3, rr = 130 + hash(k * 3) * 160, q = pj(cm, X + Math.cos(ang) * rr + 300 * away * hash(k), 20 + hash(k * 5) * 60, Z + Math.sin(ang) * rr); if (q) B.add(q.x, q.y, Math.max(1.2, 4 * q.s), fade * 0.85, 2); }
  B.flush(g);
  g.save(); g.globalCompositeOperation = "lighter"; const r = Math.max(14, Math.min(80, 30 * p.s)), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3); gr.addColorStop(0, "rgba(220,235,255," + 0.9 * fade + ")"); gr.addColorStop(1, "rgba(120,170,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r * 3, 0, TAU); g.fill(); g.restore();
}

function paths(n, cm) {
  if (n < 15.6 || n > 21.2) return;
  const B = new Batch(), inP = smooth(seg(n, 15.7, 17.2)), outP = smooth(seg(n, 17.4, 18.3)), fadeAll = 1 - smooth(seg(n, 20.4, 21.2));
  for (let z = -1020; z < -1020 + inP * 1020; z += 26) { const p = pj(cm, 0, 4, z); if (p) B.add(p.x, p.y, Math.max(1, 3 * p.s), 0.8 * fadeAll, 1); }
  const sz = sparkZ(n);
  for (let z = sz - 30; z > sz - 30 - outP * 420; z -= 26) { const p = pj(cm, 0, 4, z); const dead = (sz - 30 - z) / 420; if (p) B.add(p.x, p.y, Math.max(1, 3 * p.s), 0.8 * fadeAll * (1 - 0.7 * smooth(seg(n, 18.0, 18.6)) * dead), 3); }
  const bar = smooth(seg(n, 18.0, 18.7)) * fadeAll; if (bar > 0.02) for (let k = -14; k <= 14; k++) { const ang = k * 0.035, X = Math.sin(ang) * 420, Z = sz - 520 - (1 - Math.cos(ang)) * -160; const p = pj(cm, X, 6, Z); if (p) B.add(p.x, p.y, Math.max(1.5, 4 * p.s), bar * 0.9, 2); }
  B.flush(g);
}

function spark(n, cm) {
  if (!sparkVisible(n)) return null;
  const sp = sparkPos(n), p = pj(cm, sp[0], sp[1], sp[2]); if (!p) return null;
  const appear = smooth(seg(n, 13.0, 13.7)), vow = n > 19.3 && n < 20.6 ? Math.exp(-Math.abs(n - 19.75) * 3.2) : 0;
  const flare = n > 29.0 ? Math.exp(-Math.abs(n - 29.35) * 4.5) : 0, crown = n > 31 ? smooth(seg(n, 31, 33)) : 0;
  const size = (1 + 1.2 * vow + 1.8 * flare) * appear, base = Math.max(14, Math.min(120, 17 * p.s)) * size * GLOW();
  // trail
  const T = new Batch(); const speed = Math.abs(sparkZ(n) - sparkZ(n - 0.1)) / 0.1;
  for (let k = 1; k < 46; k++) { const tn = n - k * 0.035, tp = sparkPos(tn), q = pj(cm, tp[0] + (hash(k) - 0.5) * 24, tp[1] + (hash(k * 3) - 0.5) * 24, tp[2] - k * 6 * Math.min(1, speed / 300)); if (q) T.add(q.x, q.y, Math.max(1, (1 - k / 46) * 5 * q.s), appear * (1 - k / 46) * clamp(0.25 + speed / 500), 1); }
  T.flush(g);
  g.save(); g.globalCompositeOperation = "lighter";
  const halo = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, base * 4.2); halo.addColorStop(0, "rgba(255,196,90," + 0.55 * appear + ")"); halo.addColorStop(0.35, "rgba(255,140,50," + 0.2 * appear + ")"); halo.addColorStop(1, "rgba(255,100,30,0)"); g.fillStyle = halo; g.beginPath(); g.arc(p.x, p.y, base * 4.2, 0, TAU); g.fill();
  const core = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, base); core.addColorStop(0, "rgba(255,252,235," + appear + ")"); core.addColorStop(0.5, "rgba(255,214,120," + 0.8 * appear + ")"); core.addColorStop(1, "rgba(255,170,60,0)"); g.fillStyle = core; g.beginPath(); g.arc(p.x, p.y, base, 0, TAU); g.fill();
  const spikes = Math.max(flare, crown * 0.7, vow * 0.5);
  if (spikes > 0.03) { g.strokeStyle = "rgba(255,236,190," + spikes * 0.85 + ")"; g.lineWidth = 2; for (const a of [0, Math.PI / 2]) { const L2 = base * (3 + 6 * spikes); g.beginPath(); g.moveTo(p.x - Math.cos(a) * L2, p.y - Math.sin(a) * L2); g.lineTo(p.x + Math.cos(a) * L2, p.y + Math.sin(a) * L2); g.stroke(); } }
  g.restore();
  // vow shockwave rings on the ground
  if (n > 19.6 && n < 21.0) { const R = new Batch(); for (let r = 0; r < 3; r++) { const u = (n - 19.7) * 0.9 - r * 0.15; if (u <= 0 || u >= 1) continue; const rad = u * 700, cnt = Math.floor(rad / 8) + 20; for (let k = 0; k < cnt; k++) { const a = k / cnt * TAU, q = pj(cm, sp[0] + Math.cos(a) * rad, 4, sp[2] + Math.sin(a) * rad); if (q) R.add(q.x, q.y, Math.max(1, 3 * q.s), Math.sin(u * Math.PI) * 0.9, 1); } } R.flush(g); }
  return { p, r: base };
}

function caption(n) {
  lastCap = null; lastCapBg = null;
  const b = SEGS.find(s => n >= s.start_seconds - 0.12 && n <= s.end_seconds + 0.5); if (!b) return;
  const disp = b.text.split(/\s+/).filter(Boolean), tokens = disp.length === b.words.length ? disp : b.words.map(w => w.word);
  g.save(); g.textBaseline = "middle"; g.textAlign = "left"; g.font = "800 62px 'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif";
  const lines = [[]]; let wsum = 0; const spaceW = g.measureText(" ").width + 6;
  tokens.forEach((tk, i) => { const w = g.measureText(tk).width; if (wsum + w > 880 && lines[lines.length - 1].length) { lines.push([]); wsum = 0; } lines[lines.length - 1].push({ tk, w, i }); wsum += w + spaceW; });
  const fadeIn = smooth((n - (b.start_seconds - 0.12)) / 0.2), fadeOut = 1 - smooth((n - (b.end_seconds + 0.25)) / 0.25);
  const total = lines.length, y0 = 1560 - (total - 1) * 44; const maxLw = Math.max(...lines.map(ln => ln.reduce((a, q) => a + q.w + spaceW, -spaceW))); lastCap = { x0: W / 2 - maxLw / 2, x1: W / 2 + maxLw / 2, y0: y0 - 46, y1: y0 + (total - 1) * 88 + 46 };
  { const dim = ov("capDim", shotKey(n), 0.6), y0b = lastCap.y0 - 120, y1b = lastCap.y1 + 120; const gr = g.createLinearGradient(0, y0b, 0, y1b);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.28, "rgba(0,0,0," + dim + ")"); gr.addColorStop(0.72, "rgba(0,0,0," + dim + ")"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = fadeIn * fadeOut; g.fillStyle = gr; g.fillRect(0, y0b, W, y1b - y0b); g.globalAlpha = 1; }
  { const rx = Math.max(0, lastCap.x0 | 0), ry = lastCap.y0 | 0, rw = Math.max(1, (lastCap.x1 - lastCap.x0) | 0), rh = Math.max(1, (lastCap.y1 - lastCap.y0) | 0); const dd = g.getImageData(rx, ry, rw, rh).data; let sm = 0, ct = 0; for (let i = 0; i < dd.length; i += 40) { if ((dd[i] * 0.3 + dd[i + 1] * 0.59 + dd[i + 2] * 0.11) / 255 > 0.45) sm++; ct++; } lastCapBg = fadeIn * fadeOut > 0.9 ? sm / ct : null; }
  lines.forEach((ln, li) => { const lw = ln.reduce((a, q) => a + q.w + spaceW, -spaceW); let x = W / 2 - lw / 2;
    for (const q of ln) { const wd = b.words[Math.min(q.i, b.words.length - 1)], state = n < wd.start ? 0 : n <= wd.end + 0.08 ? 1 : 2;
      g.shadowColor = "rgba(0,0,0,0.9)"; g.shadowBlur = 22; g.globalAlpha = fadeIn * fadeOut * (state === 0 ? 0.42 : 1); g.fillStyle = state === 1 ? "rgb(255,184,74)" : "#f6f8ff"; g.fillText(q.tk, x, y0 + li * 88); x += q.w + spaceW; } });
  g.restore();
}

let lastCapBg = null, lastCap = null, lastSpark = null, lastForm = 0, lastCam = null;
function renderFrame(t) {
  const n = t - LEAD, cm = cam3(n); lastCam = cm; curN = n;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = "#020306"; g.fillRect(0, 0, W, H);
  const bg = g.createRadialGradient(W / 2, H * 0.42, 100, W / 2, H * 0.42, 1300); bg.addColorStop(0, "#0a0f18"); bg.addColorStop(1, "#020306"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  stars(n, cm); groundGrid(n, cm);
  lastForm = formation(n, cm); pillars(n, cm); arjuna(n, cm); paths(n, cm);
  lastSpark = spark(n, cm);
  L.bloom(g, bloomTmp, [[30, 0.5 * GLOW()], [9, 0.34 * GLOW()]]);
  L.filmFinish(g, Math.floor(t * 24)); caption(n);
  // dip-to-black cut between the Arjuna chase and the young warrior; fade in / out
  let dip = 0; if (n > 12.4 && n < 13.4) dip = n < 12.9 ? smooth(seg(n, 12.4, 12.9)) : 1 - smooth(seg(n, 12.9, 13.4));
  dip = Math.max(dip, 1 - smooth(t / 0.9), smooth(seg(t, DURATION - 0.8, DURATION)));
  if (dip > 0) { g.fillStyle = "rgba(0,0,0," + dip + ")"; g.fillRect(0, 0, W, H); }
}

window.getDuration = () => DURATION;
window.renderAt = t => { t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); };
window.__debug = t => {
  t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); const n = t - LEAD, k = shotKey(n);
  let hero = null;
  if (lastSpark) { const p = lastSpark.p, r = Math.max(20, lastSpark.r * 1.4); const bbox = [p.x - r, p.y - r, p.x + r, p.y + r];
    let capOverlap = 0; if (lastCap) { const ox = Math.max(0, Math.min(bbox[2], lastCap.x1) - Math.max(bbox[0], lastCap.x0)), oy = Math.max(0, Math.min(bbox[3], lastCap.y1) - Math.max(bbox[1], lastCap.y0)); capOverlap = (ox * oy) / ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])); }
    hero = { area: Math.PI * r * r / (W * H), bbox, border: 0, blown: 0, meanLum: 0.6, moonOverlap: 0, moonLum: 0, capOverlap }; }
  const d = g.getImageData(0, 0, W, H).data; let sum = 0, blown = 0, cnt = 0;
  for (let i = 0; i < d.length; i += 64) { const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255; sum += l; if (l > 0.9) blown++; cnt++; }
  const expect = { inFrame: n >= 13.7 && n < 33.5, size: false, notCropped: false, formation: n >= 0.8 && n < 29.0 && n < 12.4 || (n >= 13.4 && n < 29.0) };
  return { t, n, dur: DURATION, shot: k, cam: { x: lastCam.tx, y: lastCam.tz, zoom: lastCam.f / lastCam.D }, cuts: [12.9], moon: null, mustSee: (n >= 9.2 && n < 12.3 ? [{ name: 'Arjuna', p: (() => { const q = pj(lastCam, arjX(n), 40, arjZ(n)); return q && { x: q.x, y: q.y }; })() }] : []), caption: lastCap, hero, head: null, headCap: 0, expect, formationVisible: lastForm, frame: { mean: sum / cnt, blown: blown / cnt }, capBgLum: lastCapBg };
};
renderFrame(0);
