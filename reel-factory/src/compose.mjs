// Deterministic composer: beat plan + theme + assets -> HyperFrames project (06_composition). No LLM, no randomness, no clock.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { registry } from "../components/index.mjs"; import Particles from "../components/Particles.mjs"; import { paper, tape, piece, enter } from "../components/_kit.mjs";
import { grainPng } from "./lib/grain.mjs"; import { rng, hash } from "./lib/rng.mjs"; import { torn } from "./lib/torn.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), RF = path.resolve(here, ".."), W = 1080, H = 1920, MOVE = 0.9;
export const loadTheme = name => JSON.parse(fs.readFileSync(path.join(RF, "themes", name, "tokens.json"), "utf8"));
export const TILT = (i) => +((rng("tilt:" + i)() * 4 - 2)).toFixed(2);   // +-2 deg per station

export function timing(plan) {
  let t = 0; const st = plan.beats.map((b, i) => { const s = { start: +t.toFixed(3), dwellEnd: +(t + b.seconds).toFixed(3), moveEnd: +(t + b.seconds + MOVE).toFixed(3) }; t = s.moveEnd; return s; });
  const total = Math.ceil(t / 2) * 2;   // whole 2 s boil cycles, so the loop is exact
  if (total > t) { const pad = total - t; st[st.length - 1].dwellEnd += pad; st[st.length - 1].moveEnd += pad; }
  return { st, total };
}
function ring(n) { const half = Math.ceil(n / 2); return Array.from({ length: n }, (_, i) => i < half ? [0, i] : [1, n - 1 - i]); }

export async function compose({ plan, outDir, assetsDir, previewScale = 1 }) {
  const theme = loadTheme(plan.theme), { st, total } = timing(plan), pos = ring(plan.beats.length), gaps = [], cues = [], impacts = [], fx = [], used = [];
  fs.mkdirSync(path.join(outDir, "assets/fonts"), { recursive: true }); fs.mkdirSync(path.join(outDir, "assets/cutouts"), { recursive: true });
  for (const f of fs.readdirSync(path.join(RF, "fonts"))) if (f.endsWith(".woff2")) fs.copyFileSync(path.join(RF, "fonts", f), path.join(outDir, "assets/fonts", f));
  fs.copyFileSync(path.join(RF, "vendor/gsap.min.js"), path.join(outDir, "assets/gsap.min.js")); fs.writeFileSync(path.join(outDir, "assets/grain.png"), grainPng(256, "grain"));
  const assetUrl = id => { for (const ext of ["png", "svg", "webp"]) { const src = path.join(assetsDir, id + "." + ext); if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(outDir, "assets/cutouts", id + "." + ext)); return `assets/cutouts/${id}.${ext}`; } } throw new Error(`asset "${id}" not found in ${assetsDir}`); };
  const stations = st.map((s, i) => ({ ...s, cx: 700 + pos[i][0] * 1240, cy: 1100 + pos[i][1] * 2060, tilt: TILT(i) }));
  let html = "", js = "";
  for (const [i, beat] of plan.beats.entries()) {
    const id = `b${i + 1}`, s = stations[i], ox = s.cx - W / 2, oy = s.cy - H / 2, sheetName = beat.sheet && theme.sheets[beat.sheet] ? beat.sheet : Object.keys(theme.sheets)[i % Object.keys(theme.sheets).length], sheet = theme.sheets[sheetName];
    const comp = registry[beat.component] || (gaps.push({ beat: i + 1, wanted: beat.component, archetype: beat.archetype }), registry.UniversalFallback), first = i === 0;
    if (comp.gap) gaps.push({ beat: i + 1, wanted: beat.component, archetype: beat.archetype });
    const base = { id, theme, sheet, ox, oy, first, t0: s.start, assetUrl: id2 => { used.push(id2); return assetUrl(id2); } };
    // sheet: the torn page this station lives on
    const sw = 1010, sh = 1290, sx = (W - sw) / 2, sy = 60;
    html += piece({ ...base }, { id: "sheet", x: sx, y: sy, w: sw, h: sh, z: 1, boil: 0.5, inner: paper(`${id}sheet`, sw, sh, sheet.paper, { amp: 11, shadow: theme.shadow, off: [14, 18], extra: `background-image:radial-gradient(${sheet.dots} 3px,transparent 3.5px);background-size:34px 34px` }) });
    js += enter(base, `#${id}-sheet`, { scale: 0.9, rotation: stations[i].tilt + 6 }, { scale: 1, rotation: 0 }, { dur: 0.5, ease: "power3.out", delay: -0.1 }) + "\n";
    html += tape(base, "tp1", sx + 60, sy - 20, -8, 170) + tape(base, "tp2", sx + sw - 230, sy - 16, 7, 170);
    js += enter(base, `#${id}-tp1`, { y: -50 }, { y: 0 }, { dur: 0.3, delay: 0.1 }) + enter(base, `#${id}-tp2`, { y: -50 }, { y: 0 }, { dur: 0.3, delay: 0.15 }) + "\n";
    // headline strips (own line group) + main component
    const parsed = comp.parse(beat, base), r = { html: "", js: "" }; let y0;
    if (comp.name === "HeadlineStrips") { const o = await comp.render({ ...base, props: parsed.props, y0: 420 }); html += o.html; js += o.js; y0 = o.bottom; }
    else { if (parsed.headline.length) { const hd = await registry.HeadlineStrips.render({ ...base, props: { lines: parsed.headline.slice(0, 3), accent: beat.accent_line || parsed.headline.length, variant: beat.variant || "torn" } }); html += hd.html; js += hd.js; y0 = hd.bottom + 50; }
      const heroY = y0 ?? ({ Stamp: 480, Checklist: 430, Counter: 420, QuoteCard: 430, Typewriter: 520, Note: 520, Tag: 520, Cutout: 330, MarkerDraw: 330, UniversalFallback: 330 }[comp.name]); const o = await comp.render({ ...base, props: parsed.props, y0: heroY }); html += o.html; for (const mk of (beat.motion || [])) if (comp.name !== "MarkerDraw" && ["circle", "underline", "arrow"].includes(mk)) { const m2 = await registry.MarkerDraw.render({ ...base, props: { shape: mk }, y0: heroY - 30 }); html += m2.html; js += m2.js; break; } js += o.js; if (o.impacts) impacts.push(...o.impacts); if (o.fxBurst) fx.push({ kind: "burst", n: 18, x: o.fxBurst.x, y: o.fxBurst.y, w: 520, h: 520, t0: +o.fxBurst.t.toFixed(3), t1: +(o.fxBurst.t + 0.7).toFixed(3), seed: id + "burst", period: 1, ox, oy, color: theme.palette.gold }); }
    for (const m of beat.motion || []) if (["sparks", "petals", "dust"].includes(m)) { const f0 = { kind: m, n: m === "dust" ? 24 : 18, x: 120, y: 200, w: 840, h: 1100, t0: s.start, t1: +(s.moveEnd).toFixed(3), seed: id + m, period: total / Math.round(total / 3), ox, oy, color: m === "petals" ? theme.palette.saffron : theme.palette.gold }; fx.push(f0); if (i === 0) fx.push({ ...f0, t0: +(total - MOVE).toFixed(3), t1: total }); }   // beat 1's ambient also runs through the last move so the loop frame equals frame 0
    for (const c of beat.sfx || []) { const at = { enter: s.start - 0.25, emphasis: s.start + 0.9, impact: s.start - 0.03, exit: s.dwellEnd }[c.at] ?? s.start; cues.push({ beat: i + 1, name: c.name, at: +at.toFixed(3) }); if (c.at === "impact" && !impacts.includes(+at.toFixed(3))) impacts.push(+at.toFixed(3)); }
    cues.push({ beat: i + 1, name: "whoosh", at: +s.dwellEnd.toFixed(3) });
  }
  const fxHtml = fx.map((f, k) => { f.id = `fx${k}`; const dots = Array.from({ length: f.n }, (_, j) => Particles.dot(f.kind, f.color, j)).join(""); return `<div id="fx${k}" style="position:absolute;left:${f.ox + f.x}px;top:${f.oy + f.y}px;width:${f.w}px;height:${f.h}px;z-index:12;display:none;pointer-events:none">${dots}</div>`; }).join("\n");
  const maxX = Math.max(...stations.map(s => s.cx)) + 700, maxY = Math.max(...stations.map(s => s.cy)) + 1100;
  const cfg = { W, H, TOTAL: total, st: stations.map(({ cx, cy, tilt, start, dwellEnd, moveEnd }) => ({ cx, cy, tilt, start, dwellEnd, moveEnd })), impacts: impacts.sort((a, b) => a - b), fx: fx.map(({ id, kind, n, w, h, t0, t1, seed, period }) => ({ id, kind, n, w, h, t0, t1, seed, period })) };
  const fontsCss = fs.readFileSync(path.join(RF, "fonts/fonts.css"), "utf8"), runtime = fs.readFileSync(path.join(RF, "src/runtime/runtime.js"), "utf8");
  const page = `<!doctype html>
<html lang="hi"><head><meta charset="UTF-8" /><meta name="viewport" content="width=${W}, height=${H}" />
<style>${fontsCss}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;background:${theme.board}}
#cam{position:absolute;inset:0;overflow:hidden}
#board{position:absolute;left:0;top:0;width:${maxX}px;height:${maxY}px;transform-origin:0 0;background-color:${theme.board};background-image:radial-gradient(${theme.palette.indigo} 4px,transparent 4.5px);background-size:46px 46px}
#grain{position:absolute;left:0;top:0;width:${maxX}px;height:${maxY}px;background:url(assets/grain.png);background-size:256px 256px;z-index:30;pointer-events:none;mix-blend-mode:overlay}
.pc{position:absolute;opacity:0}.boil{position:relative;width:100%;height:100%}
.sh,.pp{position:absolute;left:0;top:0}.tx{position:absolute;left:0;top:0;white-space:nowrap}.tp{box-shadow:0 3px 8px rgba(0,0,0,.3)}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs><filter id="cutout" x="-12%" y="-12%" width="124%" height="124%"><feMorphology in="SourceAlpha" operator="dilate" radius="9" result="d"/><feFlood flood-color="#ffffff"/><feComposite in2="d" operator="in" result="border"/><feOffset in="d" dx="11" dy="13" result="o"/><feFlood flood-color="#0a0816" flood-opacity=".62"/><feComposite in2="o" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="border"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}"><div id="cam"><div id="board">
${html}${fxHtml}<div id="grain"></div></div></div></div>
<script src="assets/gsap.min.js"></script>
<script>window.RF=${JSON.stringify(cfg)};</script>
<script>${runtime}</script>
<script>
const tl = gsap.timeline({ paused: true });
${js}
const clock = { t: 0 }; tl.fromTo(clock, { t: 0 }, { t: ${total}, duration: ${total}, ease: "none", onUpdate: () => window.RF.frameUpdate(clock.t) }, 0);
window.RF.frameUpdate(0);
window._timelines = window.__timelines = window.__timelines || {}; window.__timelines["main"] = tl;
</script></body></html>`;
  fs.writeFileSync(path.join(outDir, "index.html"), page);
  for (const f of ["package.json", "hyperframes.json", "meta.json"]) { const src = path.join(RF, "templates", f); if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, f)); }
  const manifest = { title: plan.title, theme: plan.theme, total_seconds: total, beats: plan.beats.length, stations: stations.map(s => ({ cx: s.cx, cy: s.cy, tilt: s.tilt, start: s.start })), cues, gaps, assets_used: [...new Set(used)] };
  fs.writeFileSync(path.join(outDir, "compose.json"), JSON.stringify(manifest, null, 1));
  return manifest;
}
