import * as L from "../../engine/dot-cinema/lib.js";
const { W, H, LW, LH, TAU, clamp, smooth, smoother, mix, hash, seg } = L;

const DATA = window.DATA, SEGS = DATA.segments;
const OV = window.OVERRIDES || {};
const ov = (grp, key, def) => (OV[grp] && OV[grp][key] !== undefined) ? OV[grp][key] : def;
function shotKey(n) { return n < 3.4 ? 'establish' : n < 7.6 ? 'army' : n < 12.0 ? 'sitclose' : n < 17.5 ? 'face' : n < 22.3 ? 'rise' : n < 27.6 ? 'flight' : n < 30.6 ? 'bow' : n < 34.4 ? 'moral' : 'lanka'; }
const MOON_BY_SHOT = { establish: [720, 540, 200], army: [760, 520, 200], sitclose: [930, 330, 165], face: [900, 430, 190], rise: [760, 520, 200], flight: [720, 540, 200], bow: [900, 400, 170], moral: [640, 780, 230], lanka: [740, 520, 200] };
const LEAD = 0.9, TAIL = 1.9, DURATION = DATA.duration_seconds + LEAD + TAIL;
const beat = id => SEGS.find(s => s.beat_id === id);
const word = (id, w) => { const b = beat(id); const x = b.words.find(q => q.word.replace(/[।…—,.?!]/g, "") === w); return x ? x.start : b.start_seconds; };

const c = document.getElementById("c"), g = c.getContext("2d");
const bloomTmp = L.makeLayer(W, H);
const mnkM = L.makeLayer(), mnkL = L.makeLayer(), armyM = L.makeLayer(), armyL = L.makeLayer(), skyL = L.makeLayer(), farL = L.makeLayer(), rockL = L.makeLayer(), rockM = L.makeLayer(), heroL = L.makeLayer(), heroM = L.makeLayer();

// key-framed scalar with eased segments (times in narration seconds)
function kf(keys, n) {
  if (n <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (n <= b[0]) return mix(a[1], b[1], smoother((n - a[0]) / (b[0] - a[0]))); }
  return keys[keys.length - 1][1];
}

// ---- hero flight path: integrate a speed profile once, deterministic ----
const SPEED = [[22.55, 0], [23.0, 900], [24.4, 760], [27.0, 700], [27.7, 70], [27.95, 0], [29.9, 0], [30.4, 520], [31.2, 820], [34.0, 900], [36.5, 380], [40, 200]];
const XT = []; { let x = 430; for (let n = 22.55; n <= 41; n += 0.02) { const sp = kf(SPEED, n); x += sp * 0.02; XT.push(x); } }
const heroX = n => n <= 22.55 ? 430 : XT[Math.min(XT.length - 1, Math.round((n - 22.55) / 0.02))];
const speedAt = n => kf(SPEED, n);
const YK = [[22.55, 1040], [23.3, 820], [24.5, 720], [26.5, 790], [27.8, 880], [29.9, 880], [31, 760], [33, 640], [34.4, 660], [36.5, 800], [40, 840]];
const heroY = n => kf(YK, n);

let lastInfo = null, lastCam = null, lastCap = null, curMoon = null;
const GROUND = 1244, S_SIT = 150;
const sitUp = { ...L.POSES.sit, head: -20, spine: -74 };
function heroState(n) {
  let pose, rot = 0, S, ox, oy;
  S = n < 17.5 ? S_SIT : mix(S_SIT, 300, smooth(seg(n, 17.6, 22.2)));
  if (n < 12.2) pose = L.POSES.sit;
  else if (n < 17.5) pose = L.lerpPose(L.POSES.sit, sitUp, smoother(seg(n, 13.4, 15.4)));
  else if (n < 19.8) pose = L.lerpPose(sitUp, L.POSES.stand, smoother(seg(n, 17.7, 19.8)));
  else if (n < 21.4) pose = L.lerpPose(L.POSES.stand, L.POSES.power, smoother(seg(n, 19.8, 21.4)));
  else if (n < 22.5) pose = L.lerpPose(L.POSES.power, L.POSES.coil, smoother(seg(n, 21.4, 22.5)));
  else if (n < 23.1) { pose = L.lerpPose(L.POSES.coil, L.POSES.fly, smoother(seg(n, 22.5, 23.1))); rot = 62 * smoother(seg(n, 22.55, 23.3)); }
  else if (n < 27.6) { pose = L.POSES.fly; rot = 62 + Math.sin(n * 1.3) * 3; }
  else if (n < 28.2) { pose = L.lerpPose(L.POSES.fly, L.POSES.bow, smoother(seg(n, 27.6, 28.2))); rot = mix(62, 14, smoother(seg(n, 27.6, 28.2))); }
  else if (n < 30.0) { pose = L.POSES.bow; rot = 14 + Math.sin(n * 2) * 1.5; pose = { ...pose, head: 34 + 18 * smooth(seg(n, 28.9, 29.4)) * (1 - smooth(seg(n, 29.7, 30.0))) }; }
  else if (n < 30.6) { pose = L.lerpPose(L.POSES.bow, L.POSES.fly, smoother(seg(n, 30.0, 30.6))); rot = mix(14, 62, smoother(seg(n, 30.0, 30.6))); }
  else { pose = L.POSES.fly; rot = 62 + Math.sin(n * 1.1) * 3; }
  if (pose.gadaAng === undefined) pose = { ...pose, gadaAng: pose.gada.ang };
  if (n >= 11.8 && n < 17.5) pose = { ...pose, gada: { ang: pose.gada.ang, hand: null } };
  const breathe = Math.sin(n * 1.6) * 1.2; pose = { ...pose, spine: pose.spine + breathe };
  const groundOy = GROUND - L.groundShift(pose) * S;
  if (n < 17.5) { ox = 190; oy = groundOy; }
  else if (n < 22.55) { ox = mix(190, 430, smoother(seg(n, 17.7, 19.8))); oy = groundOy; }
  else { ox = heroX(n); oy = mix(groundOy, heroY(n), smoother(seg(n, 22.55, 23.4))); }
  return { pose, rot, S, ox, oy };
}
function headWorld(h) { const j = L.solve(h.pose, 0); const nk = j.neck, sd = j.spineDir; return [h.ox + (nk[0] + sd[0] * 0.3) * h.S, h.oy + (nk[1] + sd[1] * 0.3) * h.S]; }

// ---- camera ----
function camBase(n) {
  const h = heroState(Math.max(n, 0));
  let x, y, zoom, roll = 0, shake = 0;
  if (n < 7.6) { x = kf([[-0.9, 540], [3.4, 500], [4.6, 700], [5.8, 640], [7.6, 230]], n); y = kf([[-0.9, 1020], [3.4, 1100], [4.6, 1290], [7.6, 1210]], n); zoom = kf([[-0.9, 0.78], [3.4, 0.95], [4.6, 1.55], [7.6, 1.75]], n); }
  else if (n < 12.0) { x = kf([[7.6, 200], [12, 222]], n); y = kf([[7.6, 1135], [12, 1112]], n); zoom = kf([[7.6, 2.7], [12, 3.25]], n); }
  else if (n < 17.5) { const hw = headWorld(h); x = hw[0] + 135; y = hw[1] + 20; zoom = kf([[12, 3.6], [17.5, 4.4]], n); roll = kf([[12, -2.5], [17.5, 1.5]], n); }
  else if (n < 22.3) { x = kf([[17.5, 300], [19.8, 400], [22.3, 470]], n); y = kf([[17.5, 1130], [19.5, 1010], [22.3, 760]], n); zoom = kf([[17.5, 1.7], [19.8, 1.0], [22.3, 0.62]], n); shake = 16 * smooth(seg(n, 18.5, 19.4)) * (1 - smooth(seg(n, 21.2, 22.3))) + 8 * smooth(seg(n, 19.8, 21.4)); }
  else {
    x = heroX(n - 0.25) + kf([[22.3, 80], [24, 330], [27, 260], [27.9, 90], [30, 90], [31, 260], [34, 300], [38, 120]], n);
    y = heroY(n - 0.25) + kf([[22.3, 120], [24, 20], [27.9, -20], [30, -20], [32, 40], [36.5, 20]], n);
    zoom = kf([[22.3, 0.7], [23.3, 0.58], [25.5, 0.7], [27.0, 0.95], [27.9, 1.25], [29.2, 1.5], [29.9, 1.25], [30.6, 0.85], [32, 0.56], [34.4, 0.62], [36.5, 0.95], [38.9, 1.12]], n);
    roll = kf([[22.3, 0], [23.0, -4], [24.5, 1], [27, 0], [30.6, 2], [32, -1.5], [36, 0]], n);
    shake = 10 * smooth(seg(n, 22.55, 22.9)) * (1 - smooth(seg(n, 22.9, 23.8)));
  }
  const sh = shake * (hash(Math.floor(n * 30)) - 0.5), sv = shake * (hash(Math.floor(n * 30) + 99) - 0.5);
  return { x, y, zoom, roll, shx: sh * 2, shy: sv * 2 };
}

function camAt(n) { const c = camBase(n), k = shotKey(n); return { ...c, x: c.x + ov('camDx', k, 0), y: c.y + ov('camDy', k, 0), zoom: c.zoom * ov('zoom', k, 1) }; }
const MOON = { x: 720, y: 540, r: 200 };
const LIGHT = { light: [0.5, -0.55, 0.65], rim: [0.78, -0.62] };

// ---- static anchors computed from the camera path ----
const MAINAKA_X = (() => { const cm = camAt(28.5), hx = heroX(28.5); const s1 = Math.pow(cm.zoom, 1.0), s85 = Math.pow(cm.zoom, 0.35 + 0.65 * 0.85); const heroScreen = W / 2 + (hx - cm.x) * s1; const target = heroScreen + 230; return W / 2 + (cm.x - W / 2) * 0.85 + (target - W / 2) / s85; })();
const LANKA_X = (() => { const cm = camAt(36.0); return W / 2 + (cm.x - W / 2) * 0.5 + 40; })();

const ROCK = [[-400, 2100], [-400, 1236], [-150, 1226], [100, 1240], [300, 1239], [430, 1245], [480, 1312], [640, 1323], [700, 1411], [900, 1427], [980, 1541], [1500, 1701], [1500, 2100]];
function armyList() { const out = []; for (let i = 0; i < 6; i++) { const x = i < 3 ? 520 + i * 92 : 745 + (i - 3) * 100, gy = i < 3 ? 1323 : 1427; out.push({ x, gy, S: 62 + hash(i * 3) * 8, v: i }); } return out; }
const ARMY = armyList();

function drawSky(cam, n, scene) {
  L.clearLayer(skyL); L.applyCam(skyL.g, cam, 0.05);
  const m = scene.moon || MOON; L.paintMoon(skyL.g, m.x, m.y, m.r, 0.8);
  L.dotify(g, skyL, { cell: 6, gain: 0.95, dis: scene.dis, seed: 1 });
}
function drawRockAndArmy(cam, n, tint) {
  L.clearLayer(rockM); L.applyCam(rockM.g, cam, 1); rockM.g.fillStyle = "#fff";
  L.rockPoly(rockM.g, ROCK, 5, 7);
  L.shade(rockM, rockL, { ...LIGHT, blur: 7, K: 9, amb: 0.03, dif: 0.2, rimGain: 0.75, wide: 4, wideMix: 2, tint: 0, tintRim: tint || 0 });
}
function drawArmy(cam, n, dis) {
  L.clearLayer(armyM); L.applyCam(armyM.g, cam, 1); armyM.g.fillStyle = "#fff";
  const rockM = armyM;
  for (const a of ARMY) {
    const pose = { ...L.POSES.sit, head: 22 + (hash(a.v) - 0.5) * 30, spine: -60 + (hash(a.v * 3) - 0.5) * 16, gadaAng: -90, gada: { ang: -90, hand: null } };
    if (a.v === 2) pose.armF = [-30, -60];
    L.drawHeroMask(rockM.g, pose, a.S, a.x, a.gy - L.groundShift(pose) * a.S, n, { noGada: true });
  }
  L.shade(armyM, armyL, { ...LIGHT, blur: 3, K: 12, amb: 0.07, dif: 0.45, rimGain: 1.2, wide: 4, wideMix: 2 });
  L.dotify(g, armyL, { cell: 6, gain: 0.9, dis, seed: 9 });
}
function drawHero(cam, n, h, glow, tintRim, scene) {
  L.clearLayer(heroM); L.applyCam(heroM.g, cam, 1);
  const info = L.drawHeroMask(heroM.g, h.pose, h.S, h.ox, h.oy, n, { rot: h.rot });
  L.shade(heroM, heroL, { ...LIGHT, blur: 4, K: 11, amb: 0.025, dif: 0.3, rimGain: 1.7, wide: 5, wideMix: 3, tint: 0, tintRim: tintRim, top: 0.15 });
  L.applyCam(heroL.g, cam, 1); const gg = heroL.g;
  gg.fillStyle = "rgb(255,255,0)";
  const er = info.R * (0.075 + 0.05 * glow);
  gg.globalAlpha = 0.35 + 0.65 * glow; gg.beginPath(); gg.arc(info.eye[0], info.eye[1], er, 0, TAU); gg.fill();
  if (glow > 0.01) { gg.globalAlpha = glow * 0.3; gg.fillStyle = "rgb(255,200,0)"; gg.beginPath(); gg.arc(info.eye[0], info.eye[1], er * 1.9, 0, TAU); gg.fill(); }
  if (info.crown) { gg.strokeStyle = 'rgb(255,255,0)'; gg.globalAlpha = 0.95; gg.lineWidth = Math.max(2, info.R * 0.07); gg.lineJoin = 'round'; gg.beginPath(); info.crown.forEach((q, i) => i ? gg.lineTo(q[0], q[1]) : gg.moveTo(q[0], q[1])); gg.closePath(); gg.stroke(); }
  if (info.gadaHead) { gg.fillStyle = "rgb(255,255,0)"; gg.globalAlpha = 0.5 + 0.4 * glow; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; gg.beginPath(); gg.arc(info.gadaHead[0] + Math.cos(a) * h.S * 0.2, info.gadaHead[1] + Math.sin(a) * h.S * 0.2, h.S * 0.03, 0, TAU); gg.fill(); } }
  gg.globalAlpha = 1;
  L.dotify(g, heroL, { cell: 6, gain: ov('heroGain', 'all', 1), dis: scene.dis, seed: 7 });
  return info;
}
function towerShape(gl, x, base, w, tiers, th, grow) {
  // gopuram: stepped tiers narrowing upward, ledges, kalasha finial
  let y = base;
  for (let t = 0; t < tiers; t++) {
    const tw = w * (1 - t * 0.17), hh = th * 0.5 * grow;
    gl.fillStyle = "rgb(" + (130 + (t % 2) * 70) + ",255,0)"; gl.fillRect(x - tw / 2, y - hh, tw, hh);
    gl.fillStyle = "rgb(225,255,0)"; gl.fillRect(x - tw / 2 - 7, y - hh - 5, tw + 14, 6);
    for (let k = 0; k < 4; k++) { gl.fillStyle = "rgb(30,255,0)"; gl.fillRect(x - tw / 2 + 8 + k * (tw - 24) / 3, y - hh * 0.65, 8, hh * 0.35); }
    y -= hh + 5;
  }
  gl.fillStyle = "rgb(240,255,0)"; gl.beginPath(); gl.arc(x, y - 12 * grow, 11 * grow, 0, TAU); gl.fill(); gl.fillRect(x - 2, y - 40 * grow, 4, 30 * grow);
}
function drawFar(cam, n, scene) {
  L.clearLayer(farL);
  // distant mountains on the horizon
  L.applyCam(farL.g, cam, 0.5); farL.g.fillStyle = "rgb(26,0,0)"; L.rockPoly(farL.g, [[-1500, 1010], [-1100, 940], [-700, 985], [-300, 920], [100, 990], [600, 960], [1100, 1000], [1800, 930], [2400, 990], [3200, 950], [5200, 1010], [5200, 1100], [-1500, 1100]], 11, 30);
  // Lanka: tiered golden towers assemble from the sea
  const build = smooth(seg(n, 34.2, 36.6));
  if (build > 0.001) {
    L.applyCam(farL.g, cam, 0.5); const gl = farL.g; const base = 1012;
    const T = [[-470, 110, 3, 60], [-250, 140, 5, 80], [-40, 190, 6, 90], [190, 140, 5, 80], [400, 110, 4, 60]];
    T.forEach((t, i) => { const gr = smooth(seg(build, i * 0.06, 0.55 + i * 0.06)); if (gr > 0) towerShape(gl, LANKA_X + t[0] * 1.5, base, t[1] * 1.5, t[2], t[3] * 1.5, gr); });
  }
  L.dotify(g, farL, { cell: 6, gain: 0.95, dis: scene.dis, seed: 3 });
}

function drawMainaka(cam, n, dis) {
  const rise = smoother(seg(n, 24.5, 26.8)), out = smooth(seg(n, 31.5, 33.0)); if (rise < 0.002 || out > 0.998) return;
  L.clearLayer(mnkM); L.applyCam(mnkM.g, cam, 0.85); const gl = mnkM.g; gl.fillStyle = "#fff";
  const baseY = 1030, X = MAINAKA_X, pk = 480 * rise;
  const peaks = [[-380, 0.55], [-170, 0.8], [30, 1.0], [220, 0.75], [420, 0.5]];
  peaks.forEach((q, i) => { const px = X + q[0], top = baseY - pk * q[1]; L.rockPoly(gl, [[px - 300, baseY + 60], [px - 90, top + 90 * (1 - rise)], [px, top], [px + 100, top + 100], [px + 300, baseY + 60]], 40 + i, 14); });
  L.shade(mnkM, mnkL, { ...LIGHT, blur: 6, K: 10, amb: 0.04, dif: 0.45, rimGain: 1.3, wide: 5, wideMix: 2, tint: 0.55, tintRim: 1 });
  L.applyCam(mnkL.g, cam, 0.85); mnkL.g.fillStyle = "rgb(255,255,255)"; mnkL.g.globalAlpha = 0.9;
  for (let i = 0; i < 46; i++) { const u = hash(i * 3), v = hash(i * 7), px = X - 420 + u * 840, py = baseY - (0.1 + v * 0.8) * pk * (1 - Math.abs(u - 0.5) * 0.9); mnkL.g.beginPath(); mnkL.g.arc(px, py, 3 + hash(i) * 4, 0, TAU); mnkL.g.fill(); }
  L.dotify(g, mnkL, { cell: 7, gain: 0.72, dis, seed: 11 });
}
function caption(n, t) {
  lastCap = null;
  const b = SEGS.find(s => n >= s.start_seconds - 0.12 && n <= s.end_seconds + 0.5); if (!b) return;
  const disp = b.text.split(/\s+/).filter(Boolean), tokens = disp.length === b.words.length ? disp : b.words.map(w => w.word);
  g.save(); g.textBaseline = "middle"; g.textAlign = "left";
  g.font = "800 62px 'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari',sans-serif";
  const lines = [[]]; let wsum = 0; const spaceW = g.measureText(" ").width + 6;
  tokens.forEach((tk, i) => { const w = g.measureText(tk).width; if (wsum + w > 880 && lines[lines.length - 1].length) { lines.push([]); wsum = 0; } lines[lines.length - 1].push({ tk, w, i }); wsum += w + spaceW; });
  const fadeIn = smooth((n - (b.start_seconds - 0.12)) / 0.2), fadeOut = 1 - smooth((n - (b.end_seconds + 0.25)) / 0.25);
  const total = lines.length, y0 = 1560 - (total - 1) * 44; lastCap = { x0: W / 2 - 440, x1: W / 2 + 440, y0: y0 - 46, y1: y0 + (total - 1) * 88 + 46 };
  const gr = g.createLinearGradient(0, 1380, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.6)"); g.globalAlpha = fadeIn * fadeOut; g.fillStyle = gr; g.fillRect(0, 1380, W, H - 1380);
  lines.forEach((ln, li) => {
    const lw = ln.reduce((a, q) => a + q.w + spaceW, -spaceW); let x = W / 2 - lw / 2;
    for (const q of ln) {
      const wd = b.words[Math.min(q.i, b.words.length - 1)], state = n < wd.start ? 0 : n <= wd.end + 0.08 ? 1 : 2;
      g.shadowColor = "rgba(0,0,0,0.9)"; g.shadowBlur = 22; g.globalAlpha = fadeIn * fadeOut * (state === 0 ? 0.42 : 1);
      g.fillStyle = state === 1 ? "rgb(255,184,74)" : "#f6f8ff"; g.fillText(q.tk, x, y0 + li * 88); x += q.w + spaceW;
    }
  });
  g.restore();
}

function renderFrame(t) {
  const n = t - LEAD, cam = camAt(n), h = heroState(n);
  // dot-dissolve cuts
  const cuts = [7.7, 12.0, 17.5]; let dis = 0;
  for (const cb of cuts) { const a = 1 - smooth(seg(n, cb - 0.32, cb)); const b = smooth(seg(n, cb, cb + 0.34)); if (n >= cb - 0.32 && n < cb) dis = Math.max(dis, 1 - a); if (n >= cb && n < cb + 0.34) dis = Math.max(dis, 1 - b); }
  if (t < 1.3) dis = Math.max(dis, 1 - smooth(t / 1.3));
  const fadeEnd = smooth(seg(t, DURATION - 0.7, DURATION));
  const sk = shotKey(n), mb = MOON_BY_SHOT[sk], ms = OV.moonShift && OV.moonShift[sk] || { dx: 0, dy: 0 };
  const scene = { dis, moon: { x: mb[0] + ms.dx, y: mb[1] + ms.dy, r: mb[2] } };
  { const mpp = L.project(cam, 0.05, scene.moon.x, scene.moon.y); curMoon = { x: mpp.x, y: mpp.y, r: scene.moon.r * mpp.s }; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#020306"; g.fillRect(0, 0, W, H);
  const bgg = g.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H * 0.4, 1300); bgg.addColorStop(0, "#0b1018"); bgg.addColorStop(1, "#020306"); g.fillStyle = bgg; g.fillRect(0, 0, W, H);
  L.drawStars(g, cam, t, 140, 3);
  drawSky(cam, n, scene);
  drawFar(cam, n, scene);
  drawMainaka(cam, n, dis);
  // ocean
  const mp = L.project(cam, 0.05, scene.moon.x, scene.moon.y), refl = [{ sx: mp.x, w: 150, str: 0.95 }];
  const lankaBuilt = smooth(seg(n, 34.4, 36.6)); if (lankaBuilt > 0) refl.push({ sx: L.project(cam, 0.5, LANKA_X, 1012).x, w: 330, str: 0.9 * lankaBuilt, tint: true });
  const disturb = []; if (n > 22.5 && n < 25.5) { const p = L.project(cam, 1, heroX(n) - 200, 1100); disturb.push({ x: p.x, r: 260, str: 1.0 * (1 - smooth(seg(n, 23.5, 25.5))), t: n }); }
  const mRise = smoother(seg(n, 24.5, 26.8)); if (mRise > 0 && mRise < 1) { const p = L.project(cam, 0.85, MAINAKA_X, 1030); disturb.push({ x: p.x, r: 520, str: 0.9 * Math.sin(mRise * Math.PI), t: n }); }
  const oceanVisible = n < 12 || n > 19.8; // closeups and the rise happen above the waterline
  if (oceanVisible) L.drawOcean(g, cam, t, { horizon: 1000, amp: n > 22 ? 18 : 12, refl, disturb, dis });
  drawRockAndArmy(cam, n, 0); L.dotify(g, rockL, { cell: 9, gain: 0.9, dis, seed: 5 }); drawArmy(cam, n, dis);
  const glow = smooth(seg(n, 14.2, 15.2)), tintRim = (smooth(seg(n, 14.4, 17.0)) * 0.6 + smooth(seg(n, 18.4, 21.6)) * 0.4) * (n > 22.5 ? 0.4 : 1);
  lastInfo = drawHero(cam, n, h, glow, tintRim, { dis }); lastCam = cam;
  // fx
  if (n > 12.8 && n < 17.8) L.windStreams(g, cam, t, { n: 16, cx: h.ox + 200, cy: headWorld(h)[1], h: 380, w: 1500, seed: 4, str: 0.8 * smooth(seg(n, 13.2, 14.4)) * (1 - smooth(seg(n, 16.9, 17.5))), p: 1 });
  if (n > 14 && n < 22.6) L.embers(g, cam, t, { n: 90, seed: 7, x0: h.ox - 260, x1: h.ox + 260, y0: h.oy - h.S * 3.4, y1: h.oy + 80, speed: 0.22, alpha: (n < 17.5 ? smooth(seg(n, 14.4, 16)) : 1) * (1 - smooth(seg(n, 22.0, 22.6))) });
  if (n > 18.4 && n < 22.6) L.rings(g, cam, t, { n: 5, t0: 18.4, speed: 0.34, maxR: 1100, cx: h.ox, cy: GROUND + 20 });
  if (n > 22.5 && n < 38) { // speed streaks + spray
    const hp = L.project(cam, 1, h.ox, h.oy), sp = speedAt(n) / 900;
    g.save(); for (let s = 0; s < 34; s++) { const yy = hp.y + (hash(s * 3) - 0.5) * 360 * Math.pow(cam.zoom, 0.5), len = (160 + hash(s * 5) * 520) * sp; const cnt = Math.floor(len / 10);
      for (let i = 0; i < cnt; i++) { const a = (1 - i / cnt) * 0.8 * sp; g.fillStyle = "rgba(255," + (190 + hash(s) * 50 | 0) + ",120," + a + ")"; g.beginPath(); g.arc(hp.x - 150 * sp - i * 10 - hash(s) * 60, yy + i * 0.3, 1.2 + a * 2.2, 0, TAU); g.fill(); } } g.restore(); }
  if ((n > 22.5 && n < 25) || (n > 24.5 && n < 27)) L.embers(g, cam, t, { n: 70, seed: 21, x0: heroX(Math.min(n, 24)) - 600, x1: heroX(Math.min(n, 24)) + 600, y0: 760, y1: 1100, speed: 0.5, alpha: 0.9, color: "rgba(220,235,255,", p: 0.8 });
  L.embers(g, cam, t, { n: 38, seed: 33, x0: 0, x1: W, y0: 300, y1: 1500, speed: 0.04, alpha: 0.45, p: 0.3 });
  L.bloom(g, bloomTmp, [[30, 0.55], [10, 0.4]]);
  L.filmFinish(g, Math.floor(t * 24));
  caption(n, t);
  if (fadeEnd > 0) { g.fillStyle = "rgba(0,0,0," + fadeEnd + ")"; g.fillRect(0, 0, W, H); }
}

window.getDuration = () => DURATION;
window.renderAt = t => { t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); };
window.__shots = { LEAD, DURATION };
window.__debug = t => {
  t = clamp(Number(t) || 0, 0, DURATION); renderFrame(t); const n = t - LEAD, k = shotKey(n);
  const m = heroM.g.getImageData(0, 0, LW, LH).data, hl = heroL.g.getImageData(0, 0, LW, LH).data;
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
  let head = null;
  if (lastInfo && lastInfo.T) { const pts = [[0.05, -2.1], [1.4, 0.3], [0.15, 1.05], [-1.1, -0.2], [-0.9, 0.6]].map(q => { const w = lastInfo.T(q[0], q[1]); return L.project(lastCam, 1, w[0], w[1]); }); head = [Math.min(...pts.map(p => p.x)), Math.min(...pts.map(p => p.y)), Math.max(...pts.map(p => p.x)), Math.max(...pts.map(p => p.y))]; }
  let headCap = 0; if (head && lastCap) { const ox = Math.max(0, Math.min(head[2], lastCap.x1) - Math.max(head[0], lastCap.x0)), oy = Math.max(0, Math.min(head[3], lastCap.y1) - Math.max(head[1], lastCap.y0)); headCap = (ox * oy) / Math.max(1, (head[2] - head[0]) * (head[3] - head[1])); }
  return { t, n, shot: k, headCap, cam: { x: lastCam.x, y: lastCam.y, zoom: lastCam.zoom }, moon: curMoon, caption: lastCap,
    hero: cnt > 150 ? { area: cnt / (LW * LH), bbox: [minx * 2, miny * 2, maxx * 2, maxy * 2], border: border / cnt, blown: blown / cnt, meanLum: lumSum / cnt, moonOverlap: inMoon / cnt, moonLum: inMoon ? moonLum / inMoon : 0, capOverlap: inCap / cnt } : null, head };
};
renderFrame(0);
