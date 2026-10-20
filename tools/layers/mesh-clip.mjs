#!/usr/bin/env node
// Mesh camera clips: an alternative to DepthFlow for beats that want a TRUE camera move through depth (orbit, crane) rather than planar 2.5D parallax.
// Builds the textured depth-displacement mesh (depth_to_mesh.py, cached) once per scene, then drives a real perspective camera through it with Three.js,
// rendered deterministically with the same software-WebGL path proven in engine/scripts/render.mjs (Playwright + ANGLE/SwiftShader -- GPU WebGL blanks mid-render
// on this Mac, software doesn't), straight to a JPEG frame sequence with the exact contract camera-clips.mjs already expects from DepthFlow (clips/<beat>/NNNN.jpg + .done).
// The mesh's own single-view limit (no back side, "skirt" stretching past the camera's original cone) caps how far these moves can safely swing -- stay inside
// about +-20deg orbit / 15% push, same range DepthFlow itself is kept inside.
// usage: node tools/layers/mesh-clip.mjs <img.jpg> <depth.png> <outDir> <fx> <seconds> <width> <height> <fps>
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { fileURLToPath, pathToFileURL } from "node:url"; import { spawnSync } from "node:child_process";
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs";
import { build } from "/Users/swapnil/creator-studio/engine/node_modules/esbuild/lib/main.js";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const PY = path.join(os.homedir(), ".venvs/kathaaya-layers/bin/python");

export const MESH_FX = new Set(["mesh_orbit_reveal", "mesh_crane_push"]);

// Camera paths: t in [0,1]. Kept inside the mesh's safe cone (+-20deg orbit, <=15% push) so edges never show the single-view stretch artifact.
const PATHS = {
  // a slow horizontal arc with a gentle push-in: foreground shifts against background in a real arc, not a planar slide -- the thing a flat 2.5D shader can't do.
  mesh_orbit_reveal: `(e) => { const az = THREE.MathUtils.lerp(-14, 14, e) * Math.PI/180, el = 10 * Math.PI/180, dist = THREE.MathUtils.lerp(1.0, 0.90, e) * baseDist;
    camera.position.set(Math.sin(az)*dist*Math.cos(el), Math.sin(el)*dist, Math.cos(az)*dist*Math.cos(el)); camera.lookAt(0,0,0); }`,
  // a crane rise with a slight downward tilt to compensate, plus a small push: the classic reveal move.
  mesh_crane_push: `(e) => { const rise = THREE.MathUtils.lerp(-0.10, 0.14, e), dist = THREE.MathUtils.lerp(1.0, 0.88, e) * baseDist;
    camera.position.set(0, rise, dist); camera.lookAt(0, rise*0.35, 0); }`,
};
const ease = "(x) => x<.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2"; // easeInOutQuad, applied to e before indexing PATHS

function sceneSource(glbB64, fx, duration, width, height) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{display:block}</style></head>
<body><script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const W = ${width}, H = ${height};
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, true);
document.body.appendChild(renderer.domElement);
let baseDist = 1.68, ready = false; // recomputed from the loaded mesh's real bounding box once it's in (trimesh's glb export may not preserve raw units 1:1)
window.__meshReady = false;
const loader = new GLTFLoader();
loader.load("data:model/gltf-binary;base64,${glbB64}", (gltf) => {
  gltf.scene.traverse(o => { if (o.isMesh && o.material && o.material.map) { o.material = new THREE.MeshBasicMaterial({ map: o.material.map }); } }); // unlit: shows the baked photo exactly, geometry only drives parallax -- a lit low-poly displacement mesh facets badly under directional light
  const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  gltf.scene.position.sub(center); // recenter at origin regardless of whatever offset the exporter wrote
  baseDist = (size.y / 2) / Math.tan(35 * Math.PI / 360) * 1.06;
  scene.add(gltf.scene); ready = true; window.__meshReady = true; window.__meshBox = { size: [size.x, size.y, size.z] }; renderer.render(scene, camera);
}, undefined, (err) => { console.error("GLTF load failed", err); });
const ease = ${ease};
const path = ${PATHS[fx]};
window.getDuration = () => ${duration};
window.renderAt = (seconds) => { if (!ready) return; const e = ease(Math.max(0, Math.min(1, seconds / ${duration}))); path(e); renderer.render(scene, camera); };
window.renderAt(0);
if (new URLSearchParams(window.location.search).get("render") === "1") document.body.style.margin = "0";
<\/script></body></html>`;
}

async function bundleSceneHtml(html) {
  const scripts = [...html.matchAll(/<script\b(?=[^>]*\btype\s*=\s*["']module["'])[^>]*>([\s\S]*?)<\/script\s*>/gi)];
  const result = await build({ stdin: { contents: scripts[0][1], resolveDir: path.join(root, "engine"), sourcefile: "mesh-clip.js", loader: "js" }, bundle: true, write: false, platform: "browser", format: "iife", target: "es2022", minify: false, legalComments: "none" });
  return html.replace(scripts[0][0], `<script>\n${result.outputFiles[0].text}\n</script>`);
}

function ensureGlb(img, depth, outDir) {
  const glb = path.join(outDir, "mesh.glb"), infoF = path.join(outDir, "mesh.json");
  const sig = fs.statSync(img).mtimeMs + "|" + fs.statSync(depth).mtimeMs;
  if (fs.existsSync(glb) && fs.existsSync(infoF) && JSON.parse(fs.readFileSync(infoF, "utf8")).sig === sig) return { glb, info: JSON.parse(fs.readFileSync(infoF, "utf8")) };
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync(PY, [path.join(here, "depth_to_mesh.py"), img, depth, glb, "--grid", "200", "--smooth"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("depth_to_mesh.py failed: " + (r.stderr || "").slice(-400));
  const info = JSON.parse(fs.readFileSync(path.join(outDir, "mesh.json"), "utf8")); info.sig = sig;
  fs.writeFileSync(infoF, JSON.stringify(info));
  return { glb, info };
}

export async function meshClip(img, depth, outDir, fx, seconds, width, height, fps, { log = () => {}, meshCacheDir = null } = {}) {
  if (!MESH_FX.has(fx)) throw new Error(`unknown mesh fx "${fx}"`);
  const { glb, info } = ensureGlb(img, depth, meshCacheDir || path.dirname(img));
  const b64 = fs.readFileSync(glb).toString("base64");
  const html = await bundleSceneHtml(sceneSource(b64, fx, seconds, width, height));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-clip-")), file = path.join(tmpDir, "scene.html");
  fs.writeFileSync(file, html);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = []; page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    const url = pathToFileURL(file); url.searchParams.set("render", "1");
    await page.goto(url.href, { waitUntil: "load", timeout: 15000 });
    await page.waitForFunction(() => window.__meshReady === true, { timeout: 8000 });
    const frames = Math.ceil(seconds * fps);
    for (let i = 0; i < frames; i++) { const t = i / fps; await page.evaluate((t) => window.renderAt(t), t); await page.screenshot({ path: path.join(outDir, String(i + 1).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 92 }); }
    if (errors.length) throw new Error("mesh scene errors: " + errors.slice(0, 3).join("; "));
    log(`mesh clip ${fx}: ${frames} frames, mesh ${info.vertices}v/${info.faces}f`);
    return { frames, info };
  } finally { await browser.close(); fs.rmSync(tmpDir, { recursive: true, force: true }); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [img, depth, outDir, fx, seconds, width, height, fps] = process.argv.slice(2);
  meshClip(img, depth, outDir, fx, Number(seconds), Number(width), Number(height), Number(fps || 24), { log: console.log })
    .then(r => console.log(JSON.stringify(r)), e => { console.error("FAILED:", e.message); process.exit(1); });
}
