// GL Transitions (MIT, gl-transitions/gl-transitions; see assets/transitions) as film transitions: plan params.transition = "gl:<Name>".
// The two beats are drawn offscreen by core.js, uploaded as textures and mixed by the shader on one shared WebGL canvas, then copied onto the film canvas, so every frame stays a pure function of t.
import SHADERS from "./gltransitions.js";
export const GL_NAMES = Object.keys(SHADERS);
const VERT = "attribute vec2 p; varying vec2 _uv; void main() { _uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";
let cv = null, gl = null, buf = null, texs = null; const progs = {};
function init(W, H) { if (cv && cv.width === W && cv.height === H) return true; cv = document.createElement("canvas"); cv.width = W; cv.height = H; gl = cv.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false }); if (!gl) { cv = null; return false; } for (const k in progs) delete progs[k];
  buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); texs = [0, 1].map(() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; }); return true; }
function program(name) { if (progs[name] !== undefined) return progs[name]; const frag = SHADERS[name]; if (!frag) return (progs[name] = null); const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }, v = mk(gl.VERTEX_SHADER, VERT), f = mk(gl.FRAGMENT_SHADER, frag); if (!v || !f) return (progs[name] = null); const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr); return (progs[name] = gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : null); }
// draws transition `name` between canvases A and B at progress p (0..1) onto the 2D context g; returns false if WebGL or the shader is unavailable (the caller falls back to a dissolve)
export function glTransition(name, A, B, p, W, H, g) {
  if (!init(W, H)) return false; const pr = program(name); if (!pr) return false;
  gl.viewport(0, 0, W, H); gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, buf); const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); [A, B].forEach((c, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texs[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); });
  gl.uniform1i(gl.getUniformLocation(pr, "from"), 0); gl.uniform1i(gl.getUniformLocation(pr, "to"), 1); gl.uniform1f(gl.getUniformLocation(pr, "progress"), Math.min(1, Math.max(0, p))); gl.uniform1f(gl.getUniformLocation(pr, "ratio"), W / H);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); g.drawImage(cv, 0, 0); return true; }
