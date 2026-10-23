// Cinema lens and film-look pass (owner 2026-10-23): one WebGL shader over the picture layer of every frame, before the chrome and the captions so text stays crisp.
// Order follows the grading advice we found (normalise -> look -> texture): filmic tone curve + split tone by the colour-arc tone -> bloom (all highlights) -> halation (warm bleed from the brightest edges)
// -> anamorphic streak (horizontal blue-ish flare from the hottest points) -> chromatic aberration (radial, stronger at the edges) -> vignette.
// Film grain is NOT in this pass: core.js already lays a seeded overlay grain per frame (24 fps), a second layer would double it. Everything is a pure function of the frame, no state.
// If WebGL is unavailable the pass returns false and the frame is left as drawn.
const VERT = "attribute vec2 p; varying vec2 uv; void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";
const FRAG = `precision highp float; varying vec2 uv; uniform sampler2D tex; uniform vec2 px; uniform float curve, bloom, hal, streak, ca, vig, split; uniform vec3 shadow, light;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 src(vec2 u) { return texture2D(tex, u).rgb; }
vec3 hot(vec2 u, float th) { vec3 c = src(u); float l = lum(c); return c * smoothstep(th, th + 0.25, l); }
vec3 filmic(vec3 x) { x = max(x, 0.0); return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14); }   // ACES-style curve (Narkowicz fit)
void main() {
  vec2 c = uv - 0.5; float r2 = dot(c, c);
  vec2 off = c * ca * (0.4 + 3.0 * r2);                                   // chromatic aberration: R and B pulled apart along the radius
  vec3 col = vec3(src(uv + off).r, src(uv).g, src(uv - off).b);
  vec3 b = vec3(0.0); float wsum = 0.0;                                   // bloom: golden-angle spiral over thresholded highlights
  for (int i = 0; i < 20; i++) { float f = float(i) + 0.5, a = f * 2.39996, rr = sqrt(f / 20.0) * 0.018; vec2 d = vec2(cos(a), sin(a) * px.x / px.y) * rr; float w = 1.0 - f / 22.0; b += hot(uv + d, 0.62) * w; wsum += w; }
  b /= wsum;
  vec3 h = vec3(0.0);                                                     // halation: a wider, warm, red-biased bleed from the very brightest areas
  for (int i = 0; i < 16; i++) { float f = float(i) + 0.5, a = f * 2.39996 + 1.0, rr = sqrt(f / 16.0) * 0.05; vec2 d = vec2(cos(a), sin(a) * px.x / px.y) * rr; h += hot(uv + d, 0.8); }
  h = (h / 16.0) * vec3(1.0, 0.42, 0.18);
  vec3 s = vec3(0.0);                                                     // anamorphic streak: horizontal smear of the hottest points, cool tint
  for (int i = -10; i <= 10; i++) { float k = float(i) / 10.0; s += hot(uv + vec2(k * 0.14, 0.0), 0.86) * (1.0 - abs(k)); }
  s = (s / 10.0) * vec3(0.55, 0.75, 1.0);
  col += bloom * b + hal * h + streak * s;
  vec3 g = filmic(col * 1.05);                                            // tone curve, blended so the picture keeps its own contrast
  col = mix(col, g, curve);
  float l = lum(col);                                                     // split tone: tinted shadows and highlights (colour-arc tone)
  col = mix(col, col * (1.0 + (shadow - 0.0) * 4.0 * (1.0 - l)) , split * (1.0 - l));
  col = mix(col, col * light / max(0.001, lum(light)), split * smoothstep(0.55, 1.0, l) * 0.5);
  col *= 1.0 - vig * smoothstep(0.18, 0.62, r2 * 2.2);                    // vignette
  gl_FragColor = vec4(col, 1.0);
}`;
// colour-arc tone -> look (kept subtle: the sources agree that strong full-strength looks double-apply contrast on AI pictures)
export const LOOKS = {
  cold: { shadow: [0.03, 0.06, 0.14], light: [0.93, 0.96, 1.0], bloom: 0.22, hal: 0.10, streak: 0.12, ca: 0.0016, vig: 0.28, curve: 0.35, split: 0.5 },
  ember: { shadow: [0.0, 0.05, 0.07], light: [1.0, 0.82, 0.6], bloom: 0.30, hal: 0.26, streak: 0.18, ca: 0.0018, vig: 0.32, curve: 0.4, split: 0.6 },
  fire: { shadow: [0.09, 0.0, 0.0], light: [1.0, 0.7, 0.45], bloom: 0.40, hal: 0.40, streak: 0.24, ca: 0.0022, vig: 0.36, curve: 0.4, split: 0.6 },
  gold: { shadow: [0.0, 0.04, 0.05], light: [1.0, 0.9, 0.7], bloom: 0.32, hal: 0.22, streak: 0.24, ca: 0.0014, vig: 0.26, curve: 0.35, split: 0.5 } };
let cv = null, gl = null, pr = null, tex = null, loc = {};
function init(W, H) { if (cv && cv.width === W && cv.height === H) return !!pr; cv = document.createElement("canvas"); cv.width = W; cv.height = H; gl = cv.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false }); pr = null; if (!gl) { cv = null; return false; }
  const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; }, v = mk(gl.VERTEX_SHADER, VERT), f = mk(gl.FRAGMENT_SHADER, FRAG); if (!v || !f) return false;
  const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return false; pr = p; gl.useProgram(p);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); const a = gl.getAttribLocation(p, "p"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); for (const [k, x] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, x);
  for (const n of ["tex", "px", "curve", "bloom", "hal", "streak", "ca", "vig", "split", "shadow", "light"]) loc[n] = gl.getUniformLocation(p, n); return true; }
// g: the film's 2D context (its canvas is read, then painted over); tone: cold | ember | fire | gold; boost: 1 normally, >1 on the peak beat
export function lensPass(g, W, H, tone, boost = 1, strength = 1) {
  if (!strength || !init(W, H) || !pr) return false; const L = LOOKS[tone] || LOOKS.ember, k = strength;
  gl.viewport(0, 0, W, H); gl.useProgram(pr); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, g.canvas);
  gl.uniform1i(loc.tex, 0); gl.uniform2f(loc.px, W, H); gl.uniform1f(loc.curve, L.curve * k); gl.uniform1f(loc.bloom, L.bloom * k * boost); gl.uniform1f(loc.hal, L.hal * k * boost); gl.uniform1f(loc.streak, L.streak * k * boost); gl.uniform1f(loc.ca, L.ca * k); gl.uniform1f(loc.vig, L.vig * k); gl.uniform1f(loc.split, L.split * k); gl.uniform3f(loc.shadow, ...L.shadow); gl.uniform3f(loc.light, ...L.light);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.drawImage(cv, 0, 0); g.restore(); return true; }
