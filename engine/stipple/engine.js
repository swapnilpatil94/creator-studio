// KATHAAYA stipple engine: every dot is a real GPU particle whose position is an ANALYTIC function of (home, attributes, uniforms, time).
// No simulation history: renderAt(t) is a pure function of t, so frame 100 before frame 20 gives the same pixels as frame 20 first.
// Modes (all in the vertex shader, driven by per-cloud uniforms that the scene's timeline sets from t):
//   reveal (contours first)   form / scatter+reform (staggered)   flow (dots advected through a curl-noise field; time-reversible)   orbit
//   morph (paired clouds, arc through the field)   path-follow (Catmull-Rom streams)   layered parallax (z per dot + perspective camera)   skinning (2D bones, per-dot weights)
import * as THREE from "three";
import { unpack } from "./format.mjs";
export { THREE, unpack };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); }, smoother = v => { v = clamp(v); return v * v * v * (v * (v * 6 - 15) + 10); }, mix = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a));
export function kf(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) return mix(a[1], b[1], smoother((t - a[0]) / (b[0] - a[0]))); } return keys[keys.length - 1][1]; }
const STEPS = 12;
const VERT = /* glsl */`
precision highp float;
attribute vec3 aCol; attribute vec3 aCol2; attribute float aSize; attribute float aSeed; attribute float aOrder; attribute float aRegion; attribute float aEdge; attribute vec3 aTarget; attribute vec4 aBone;
uniform float uPx, uViewH, uTanHalf, uSize, uAlpha, uColorMix, uInk;
uniform float uForm, uFormSpread, uFormStagger, uReveal, uRevealSoft, uMorph, uMorphArc, uFlow, uFlowAmp, uFlowFreq, uFlowSpeed, uFlowT0, uOrbit, uOrbitSpeed, uPathAmt, uPathPhase, uPathWidth, uPathGate, uUseBones, uTime, uBlink;
uniform vec2 uOrbitC; uniform vec2 uPathPts[8]; uniform float uRegionFlow[16]; uniform mat3 uBone[12]; uniform vec3 uInkCol;
varying vec3 vCol; varying float vA;
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.-15.)+10.); return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p, float t){ return vnoise(p + vec2(t * .37, -t * .21)) * .65 + vnoise(p * 2.07 - vec2(t * .31, t * .27) + 7.3) * .35; }
vec2 curl(vec2 p, float t){ float e = .02; float a = fbm(p + vec2(0., e), t) - fbm(p - vec2(0., e), t); float b = fbm(p + vec2(e, 0.), t) - fbm(p - vec2(e, 0.), t); return vec2(a, -b) / (2. * e); }
vec2 advect(vec2 p, float tau, float t0){ float hh = tau / float(${STEPS}); for (int i = 0; i < ${STEPS}; i++) p += curl(p * uFlowFreq, t0 + float(i) * hh * uFlowSpeed) * hh * uFlowAmp; return p; }
vec2 catmull(float s){ float f = s * 7.; int i = int(floor(f)); float t = f - float(i); vec2 p0 = uPathPts[int(max(0., float(i) - 1.))], p1 = uPathPts[i], p2 = uPathPts[int(min(7., float(i) + 1.))], p3 = uPathPts[int(min(7., float(i) + 2.))];
  return .5 * ((2. * p1) + (-p0 + p2) * t + (2. * p0 - 5. * p1 + 4. * p2 - p3) * t * t + (-p0 + 3. * p1 - 3. * p2 + p3) * t * t * t); }
float smoother(float x){ x = clamp(x, 0., 1.); return x*x*x*(x*(x*6.-15.)+10.); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
void main(){
  vec2 home = position.xy; float z = position.z; vec2 p = home; int reg = int(aRegion + .5);
  if (uUseBones > .5) { int b0 = int(aBone.x + .5), b1 = int(aBone.y + .5); vec3 h3 = vec3(home, 1.); p = mix((uBone[b1] * h3).xy, (uBone[b0] * h3).xy, aBone.z); }
  if (uMorph > 0.) { vec2 tg = aTarget.xy; float m = smoother(clamp(uMorph * 1.7 - aOrder * .7, 0., 1.)); vec2 d = tg - home, perp = normalize(vec2(-d.y, d.x) + 1e-5);
    p = mix(p, tg, m) + perp * sin(m * 3.14159) * uMorphArc * (aSeed - .5) * length(d); z = mix(z, aTarget.z, m); }
  float fl = uFlow * uRegionFlow[reg]; if (fl > 0.) p = advect(p, fl, uFlowT0);
  if (uOrbit != 0.) { vec2 r = p - uOrbitC; float th = uOrbit * uOrbitSpeed / (.12 + length(r)) * (.6 + .8 * aSeed); p = uOrbitC + rot(th) * r; }
  float ff = smoother(clamp(uForm * (1. + uFormStagger) - aOrder * uFormStagger, 0., 1.));
  if (ff < 1.) { float a = aSeed * 43.758; vec2 dir = vec2(cos(a), sin(a)); vec2 sc = p + dir * uFormSpread * (.35 + .65 * h11(aSeed * 91.7)) + curl(p * 2.5, 3.1 + aSeed) * uFormSpread * .35; p = mix(sc, p, ff); }
  if (uPathAmt > 0.) { float s = fract(aSeed * 3.17 + uPathPhase); vec2 pp = catmull(s) + vec2(0., (h11(aSeed * 17.3) - .5) * uPathWidth * (.4 + 1.2 * sin(s * 3.14159))); float g = step(aOrder, uPathGate); p = mix(p, pp, uPathAmt * g); z = mix(z, 0., uPathAmt * g); }
  vec4 mv = modelViewMatrix * vec4(p, z, 1.); gl_Position = projectionMatrix * mv;
  float vis = clamp((uReveal * (1. + uRevealSoft) - aOrder) / max(uRevealSoft, 1e-3), 0., 1.);
  float ps = uSize * aSize * mix(1., .6, ff < 1. ? 1. - ff : 0.) * viewScale(mv.z);
  gl_PointSize = max(1., ps); vA = vis * uAlpha;
  vec3 src = mix(aCol, aCol2, smooth01(uMorph)) / 255.; vCol = mix(uInkCol, src, uColorMix);
}`.replace("viewScale(mv.z)", "(uPx * uViewH / (2. * uTanHalf * max(-mv.z, 1e-3)))").replace("smooth01(uMorph)", "(uMorph * uMorph * (3. - 2. * uMorph))");
const FRAG = /* glsl */`precision highp float; varying vec3 vCol; varying float vA;
void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); if (vA < .01 || d > .5) discard; float a = smoothstep(.5, .36, d) * vA; gl_FragColor = vec4(vCol, a); }`;
const BG_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.); }`;
const BG_F = `precision highp float; varying vec2 vUv; uniform vec3 uPaper; uniform vec3 uPaper2; uniform float uGrain;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
void main(){ float f = n(vUv * 7.) * .5 + n(vUv * 23.) * .3 + n(vUv * 90.) * .2; vec3 c = mix(uPaper, uPaper2, f); float v = smoothstep(1.05, .25, length(vUv - .5) * 1.5); c *= mix(.78, 1., v); c += (h(vUv * 900.) - .5) * uGrain; gl_FragColor = vec4(c, 1.); }`;
export class StippleScene {
  constructor({ canvas, width = 1080, height = 1920, fov = 30, paper = [0.92, 0.86, 0.72], paper2 = [0.86, 0.78, 0.62], bg = "paper" } = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }); this.renderer.setPixelRatio(1); this.renderer.setSize(width, height, false); this.renderer.setClearColor(new THREE.Color(...paper), 1);
    this.W = width; this.H = height; this.fov = fov; this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(fov, width / height, 0.01, 50); this.clouds = {}; this.tanHalf = Math.tan(fov * Math.PI / 360);
    if (bg === "paper") { const m = new THREE.ShaderMaterial({ vertexShader: BG_V, fragmentShader: BG_F, uniforms: { uPaper: { value: new THREE.Color(...paper) }, uPaper2: { value: new THREE.Color(...paper2) }, uGrain: { value: 0.05 } }, depthTest: false, depthWrite: false }), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; q.renderOrder = -1; this.scene.add(q); }
  }
  // set: unpack()ed .stip (or the same arrays built in code). opts: { size, ink: [r,g,b], colorMix }
  addCloud(name, set, opts = {}) {
    const g = new THREE.BufferGeometry(), n = set.n, A = (k, a, c) => g.setAttribute(k, new THREE.BufferAttribute(a, c));
    A("position", set.pos, 3); A("aCol", Float32Array.from(set.col), 3); A("aCol2", Float32Array.from(set.col2 || set.col), 3); A("aSize", set.size, 1); A("aSeed", set.seed, 1); A("aOrder", set.order, 1); A("aRegion", Float32Array.from(set.region || new Uint8Array(n)), 1); A("aEdge", set.edge || new Float32Array(n), 1);
    A("aTarget", set.pos2 || set.pos, 3); A("aBone", set.bone || new Float32Array(n * 4), 4);
    const U = { uPx: { value: 1 }, uViewH: { value: this.H }, uTanHalf: { value: this.tanHalf }, uSize: { value: opts.size ?? 0.0042 }, uAlpha: { value: 1 }, uColorMix: { value: opts.colorMix ?? 1 }, uInk: { value: 0 }, uInkCol: { value: new THREE.Color(...(opts.ink || [0.09, 0.06, 0.045])) },
      uForm: { value: 1 }, uFormSpread: { value: 0.6 }, uFormStagger: { value: 0.8 }, uReveal: { value: 1 }, uRevealSoft: { value: 0.08 }, uMorph: { value: 0 }, uMorphArc: { value: 0.35 },
      uFlow: { value: 0 }, uFlowAmp: { value: 0.35 }, uFlowFreq: { value: 2.2 }, uFlowSpeed: { value: 1 }, uFlowT0: { value: 0 }, uOrbit: { value: 0 }, uOrbitSpeed: { value: 0.1 }, uOrbitC: { value: new THREE.Vector2() },
      uPathAmt: { value: 0 }, uPathPhase: { value: 0 }, uPathWidth: { value: 0.05 }, uPathGate: { value: 1 }, uPathPts: { value: Array.from({ length: 8 }, (_, i) => new THREE.Vector2(i / 7 - 0.5, 0)) },
      uRegionFlow: { value: new Float32Array(16).fill(1) }, uBone: { value: Array.from({ length: 12 }, () => new THREE.Matrix3()) }, uUseBones: { value: 0 }, uTime: { value: 0 }, uBlink: { value: 0 } };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = opts.order ?? 0; this.scene.add(pts); const c = { name, n, pts, U, meta: set.meta }; this.clouds[name] = c; return c;
  }
  setCamera({ x = 0, y = 0, dist = 1.6, yaw = 0, pitch = 0, roll = 0 }) { const cam = this.camera, ya = yaw * Math.PI / 180, pa = pitch * Math.PI / 180; cam.position.set(x + Math.sin(ya) * dist * Math.cos(pa), y + Math.sin(pa) * dist, Math.cos(ya) * dist * Math.cos(pa)); cam.up.set(Math.sin(roll * Math.PI / 180), Math.cos(roll * Math.PI / 180), 0); cam.lookAt(x, y, 0); cam.updateMatrixWorld(); }
  render() { this.renderer.render(this.scene, this.camera); }
  stats() { return { calls: this.renderer.info.render.calls, points: this.renderer.info.render.points }; }
}
// 2D skeleton FK for stippled characters (rest pose joints come from the .stip meta so Node and browser agree)
export function skeletonMatrices(skel, angles, root = { x: 0, y: 0, rot: 0 }) {
  // skel.bones: [{ name, parent, a:[x,y] (pivot = rest joint), b:[x,y], r }]; angles[name] = rotation (radians, relative to parent). Returns THREE.Matrix3[] that map rest positions to posed positions.
  const M = [], out = [];
  skel.bones.forEach((b, i) => {
    const px = b.a[0], py = b.a[1], th = (angles[b.name] || 0) + (b.parent < 0 ? root.rot : 0), c = Math.cos(th), s = Math.sin(th);
    // local: rotate about pivot (px,py): p' = R(p-pivot)+pivot
    let m = [c, -s, px - c * px + s * py, s, c, py - s * px - c * py]; // [a b tx; c d ty]
    if (b.parent >= 0) { const P = M[b.parent]; m = mul2(P, m); } else m = mul2([1, 0, root.x, 0, 1, root.y], m);
    M[i] = m; const t = new THREE.Matrix3(); t.set(m[0], m[1], m[2], m[3], m[4], m[5], 0, 0, 1); out.push(t);
  }); return out;
}
const mul2 = (A, B) => [A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2], A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5]];
