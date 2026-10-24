// Deterministic composer: beat plan + theme + style + assets -> HyperFrames project (06_composition). No LLM, no randomness, no clock.
// A reel is a stack of full-frame scenes (one per beat); the style decides the backgrounds, the transitions between scenes and the overlays.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { registry } from "../components/index.mjs"; import Particles from "../components/Particles.mjs"; import { enter } from "../components/_kit.mjs";
import { styles } from "../styles/index.mjs"; import { transition, TRANSITIONS } from "./transitions.mjs"; import { captions } from "./captions.mjs";
import { grainPng } from "./lib/grain.mjs"; import { allShapes } from "./lib/shapes.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), RF = path.resolve(here, ".."), W = 1080, H = 1920;
export const loadTheme = name => JSON.parse(fs.readFileSync(path.join(RF, "themes", name, "tokens.json"), "utf8"));
const kindOf = (style, plan, i) => plan.beats[i].transition || style.transitions[i % style.transitions.length];
export function timing(plan, style = styles[plan.style || "scrapbook"]) {
  const n = plan.beats.length; let t = 0; const rows = plan.beats.map((b, i) => { const kind = kindOf(style, plan, i), d = TRANSITIONS[kind].dur, r = { start: +t.toFixed(3), speechEnd: +(t + b.seconds).toFixed(3), kind, dur: d, end: +(t + b.seconds + d).toFixed(3) }; t = r.end; return r; });
  const total = Math.ceil(t / 2) * 2; if (total > t) { const pad = total - t, l = rows[n - 1]; l.speechEnd = +(l.speechEnd + pad).toFixed(3); l.end = +(l.end + pad).toFixed(3); }   // whole 2 s boil cycles: the loop is exact
  return { rows, total };
}
export async function compose({ plan, outDir, assetsDir }) {
  const theme = loadTheme(plan.theme), style = styles[plan.style || "scrapbook"]; if (!style) throw new Error("unknown style " + plan.style);
  const { rows, total } = timing(plan, style), n = plan.beats.length, gaps = [], maps = [], cues = [], impacts = [], fx = [], used = [], leaks = [];
  fs.mkdirSync(path.join(outDir, "assets/fonts"), { recursive: true }); fs.mkdirSync(path.join(outDir, "assets/cutouts"), { recursive: true });
  for (const f of fs.readdirSync(path.join(RF, "fonts"))) if (f.endsWith(".woff2")) fs.copyFileSync(path.join(RF, "fonts", f), path.join(outDir, "assets/fonts", f));
  fs.copyFileSync(path.join(RF, "vendor/gsap.min.js"), path.join(outDir, "assets/gsap.min.js")); fs.writeFileSync(path.join(outDir, "assets/grain.png"), grainPng(256, "grain"));
  const assetUrl = id => { for (const ext of ["png", "svg", "webp", "jpg"]) { const src = path.join(assetsDir, id + "." + ext); if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(outDir, "assets/cutouts", id + "." + ext)); return `assets/cutouts/${id}.${ext}`; } } throw new Error(`asset "${id}" not found in ${assetsDir}`); };
  let scenes = "", js = "", top = ""; const loopReset = [];
  const sheetNames = Object.keys(theme.sheets);
  for (const [i, beat] of plan.beats.entries()) {
    const id = `b${i + 1}`, r = rows[i], prevT = rows[(i + n - 1) % n], first = i === 0, contentT = first ? 0 : +(prevT.speechEnd + prevT.dur * 0.5).toFixed(3);
    const sheetName = beat.sheet && theme.sheets[beat.sheet] ? beat.sheet : sheetNames[i % sheetNames.length], sheet = theme.sheets[sheetName];
    const comp = registry[beat.component] || (gaps.push({ beat: i + 1, wanted: beat.component, archetype: beat.archetype }), registry.UniversalFallback);
    if (comp.gap) gaps.push({ beat: i + 1, wanted: beat.component, archetype: beat.archetype });
    const base = { id, theme, sheet, style, beat, seconds: beat.seconds, ox: 0, oy: 0, first, t0: contentT, assetUrl: a => { used.push(a); return assetUrl(a); }, W, H };
    let html = style.bg(base, sheet), body = "";
    const jsMark = js.length; const parsed = comp.parse(beat, base); let y0;
    if (comp.name === "HeadlineStrips") { const o = await comp.render({ ...base, props: parsed.props, y0: 420 }); body += o.html; js += o.js; y0 = o.bottom; }
    else { if (parsed.headline.length) { const hd = await registry.HeadlineStrips.render({ ...base, props: { lines: parsed.headline.slice(0, 3), accent: beat.accent_line || parsed.headline.length, variant: beat.variant || "torn" } }); body += hd.html; js += hd.js; y0 = hd.bottom + 50; }
      const heroY = y0 ?? comp.defaultY ?? 430, o = await comp.render({ ...base, props: parsed.props, y0: heroY }); body += o.html; js += o.js; if (first && o.loop) loopReset.push(o.loop); if (o.impacts) impacts.push(...o.impacts); if (o.maps) maps.push(...o.maps); if (o.fxBurst) fx.push({ kind: "burst", n: 18, x: o.fxBurst.x - 260, y: o.fxBurst.y - 260, w: 520, h: 520, t0: o.fxBurst.t, t1: +(o.fxBurst.t + 0.7).toFixed(3), seed: id + "burst", period: 1, color: theme.palette.gold });
      for (const mk of beat.motion || []) if (comp.name !== "MarkerDraw" && ["circle", "underline", "arrow"].includes(mk)) { const m2 = await registry.MarkerDraw.render({ ...base, props: { shape: mk }, y0: heroY - 30 }); body += m2.html; js += m2.js; break; } }
    for (const m of beat.motion || []) if (["sparks", "petals", "dust"].includes(m)) { const f0 = { kind: m, n: m === "dust" ? 24 : 18, x: 120, y: 200, w: 840, h: 1100, t0: first ? 0 : contentT, t1: +r.end.toFixed(3), seed: id + m, period: total / Math.round(total / 3), color: m === "petals" ? theme.palette.saffron : theme.palette.gold }; fx.push(f0); if (first) fx.push({ ...f0, t0: +(rows[n - 1].speechEnd).toFixed(3), t1: total }); }
    for (const c of beat.sfx || []) { const at = { enter: contentT, emphasis: r.start + 0.9, impact: contentT + 0.2, exit: r.speechEnd }[c.at] ?? r.start; cues.push({ beat: i + 1, name: c.name, at: +at.toFixed(3) }); if (c.at === "impact" && !impacts.includes(+at.toFixed(3))) impacts.push(+at.toFixed(3)); }
    if (first) { const seen = new Set(); for (const m of js.slice(jsMark).matchAll(/tl\.fromTo\(("[^"]+"),(\{[^{}]*\}),/g)) { if (seen.has(m[1])) continue; seen.add(m[1]); const fromVars = m[2].replace(/"?opacity"?\s*:\s*[^,}]+,?/, ""); if (/\S/.test(fromVars.replace(/[{}\s,]/g, ""))) loopReset.push(`tl.set(${m[1]},${fromVars},LOOPT);`); } }   // scene 1's own motion is put back to its frame-0 state while it is hidden, so the loop closes exactly
    scenes += `<div class="scene" id="sc${i}" style="opacity:${first ? 1 : 0};z-index:${first ? 4 : 1}"><div class="inner" id="in${i}">${html}${body}</div></div>\n`;
    if (style.push) { const a = first ? 0 : contentT, b = r.speechEnd; js += `tl.fromTo("#in${i}",{scale:1},{scale:1.035,duration:${(b - a).toFixed(3)},ease:"none",immediateRender:false},${a.toFixed(3)});` + (first ? `tl.set("#in0",{scale:1},${rows[n - 1].speechEnd.toFixed(3)});` : "") + "\n"; }
    // transition into the next scene (the last one loops back to scene 1)
    const j2 = (i + 1) % n, tr = transition(r.kind, { a: `#sc${i}`, b: `#sc${j2}`, t: r.speechEnd, i, theme, focus: beat.focus || { x: 540, y: 800 }, shapes: beat.shapes || ["circle", "moon"] });
    js += tr.js + "\n"; top += tr.html; if (tr.impact && i < n - 1) impacts.push(+(r.speechEnd + 0.01).toFixed(3));
    if (i < n - 1 && ["filmBurn", "cut", "flash"].includes(r.kind)) leaks.push({ t: +r.speechEnd.toFixed(3), d: 0.5 }); cues.push({ beat: i + 1, name: { whip: "whoosh", tapeRip: "tape_rip", zoomThrough: "riser", morphIris: "shimmer", filmBurn: "boom", spotlight: "whoosh" }[r.kind] || "pop", at: +r.speechEnd.toFixed(3) });
  }
  js += loopReset.join("").replace(/LOOPT/g, rows[n - 1].speechEnd.toFixed(3)) + "\n";
  const starts = rows.map((r, i) => r.start);
  let cap = { html: "", js: "", estimated: false, groups: 0 }; if (style.captions && plan.captions !== false) cap = await captions({ plan, starts, theme });
  const fxHtml = fx.map((f, k) => { f.id = `fx${k}`; const dots = Array.from({ length: f.n }, (_, q) => Particles.dot(f.kind, f.color, q)).join(""); return `<div id="fx${k}" style="position:absolute;left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px;z-index:7;display:none;pointer-events:none">${dots}</div>`; }).join("\n");
  const film = style.film ? `<div id="filmleak" style="position:absolute;inset:0;z-index:12;opacity:0;mix-blend-mode:screen;background:radial-gradient(circle at 12% 18%,rgba(255,150,40,.85),rgba(255,70,10,0) 46%),radial-gradient(circle at 92% 88%,rgba(255,200,80,.6),rgba(255,70,10,0) 40%)"></div><div id="filmgrain" style="position:absolute;inset:-300px;z-index:13;background:url(assets/grain.png);background-size:256px 256px;opacity:.9"></div><div style="position:absolute;inset:0;z-index:14;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 55%,rgba(0,0,0,.62) 100%)"></div><div id="filmsc1" style="position:absolute;top:0;width:3px;height:1920px;background:rgba(255,255,255,.55);z-index:14;opacity:0"></div><div id="filmsc2" style="position:absolute;top:0;width:2px;height:1920px;background:rgba(255,255,255,.4);z-index:14;opacity:0"></div><div id="filmts" style="position:absolute;left:54px;top:1150px;z-index:15;font:500 34px 'IBM Plex Mono';color:#ffd9a0;letter-spacing:.1em;text-shadow:0 0 8px rgba(255,150,40,.8)">REC ● 00:00:00:00</div>` : "";
  const cfg = { W, H, TOTAL: total, loopStart: rows[n - 1].speechEnd, shapes: allShapes(), maps, impacts: impacts.sort((a, b) => a - b), film: !!style.film, leaks, fx: fx.map(({ id, kind, n, w, h, t0, t1, seed, period }) => ({ id, kind, n, w, h, t0, t1, seed, period })) };
  let geoScripts = ""; if (maps.length) { const nm = path.join(RF, "node_modules"), vend = path.join(outDir, "assets/vendor"); fs.mkdirSync(vend, { recursive: true });
    for (const [src, dst] of [["d3-array/dist/d3-array.min.js", "d3-array.min.js"], ["d3-geo/dist/d3-geo.min.js", "d3-geo.min.js"], ["topojson-client/dist/topojson-client.min.js", "topojson-client.min.js"]]) fs.copyFileSync(path.join(nm, src), path.join(vend, dst));
    fs.writeFileSync(path.join(vend, "geo.js"), "window.GEO_TOPO=" + fs.readFileSync(path.join(nm, "world-atlas/countries-50m.json"), "utf8") + ";"); geoScripts = ["d3-array", "d3-geo", "topojson-client"].map(n => `<script src="assets/vendor/${n}.min.js"></script>`).join("") + `<script src="assets/vendor/geo.js"></script>`; }
  const fontsCss = fs.readFileSync(path.join(RF, "fonts/fonts.css"), "utf8"), runtime = fs.readFileSync(path.join(RF, "src/runtime/runtime.js"), "utf8");
  const page = `<!doctype html>
<html lang="hi"><head><meta charset="UTF-8" /><meta name="viewport" content="width=${W}, height=${H}" />
<style>${fontsCss}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000}
#cam{position:absolute;inset:0;overflow:hidden;background:#000}#stage{position:absolute;inset:0}
.scene{position:absolute;inset:0;overflow:hidden}.inner{position:absolute;inset:0;transform-origin:50% 45%}
.pc{position:absolute;opacity:0}.pc.bgp{opacity:1}.fxp{position:absolute}.boil{position:relative;width:100%;height:100%}
.sh,.pp{position:absolute;left:0;top:0}.tx{position:absolute;left:0;top:0;white-space:nowrap}.tp{box-shadow:0 3px 8px rgba(0,0,0,.3)}
.capg{position:absolute;left:0;width:${W}px;text-align:center;z-index:20;paint-order:stroke fill;white-space:nowrap;text-shadow:0 8px 22px rgba(0,0,0,.55)}.capg span{display:inline-block}
${style.css || ""}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs><filter id="cutout" x="-12%" y="-12%" width="124%" height="124%"><feMorphology in="SourceAlpha" operator="dilate" radius="9" result="d"/><feFlood flood-color="#ffffff"/><feComposite in2="d" operator="in" result="border"/><feOffset in="d" dx="11" dy="13" result="o"/><feFlood flood-color="#0a0816" flood-opacity=".62"/><feComposite in2="o" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="border"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}"><div id="cam"><div id="stage">
${scenes}${fxHtml}</div>
${top}${cap.html}${film}</div></div>
<script src="assets/gsap.min.js"></script>
${geoScripts}
<script>window.RF=${JSON.stringify(cfg)};</script>
<script>${runtime}</script>
<script>
const tl = gsap.timeline({ paused: true });
${js}
${cap.js}
const clock = { t: 0 }; tl.fromTo(clock, { t: 0 }, { t: ${total}, duration: ${total}, ease: "none", onUpdate: () => window.RF.frameUpdate(clock.t) }, 0);
window.RF.frameUpdate(0);
window._timelines = window.__timelines = window.__timelines || {}; window.__timelines["main"] = tl;
</script></body></html>`;
  fs.writeFileSync(path.join(outDir, "index.html"), page);
  for (const f of ["package.json", "hyperframes.json", "meta.json"]) { const src = path.join(RF, "templates", f); if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, f)); }
  const manifest = { title: plan.title, theme: plan.theme, style: style.name, total_seconds: total, beats: n, scenes: rows, cues, gaps, assets_used: [...new Set(used)], captions: { groups: cap.groups, estimated: cap.estimated } };
  fs.writeFileSync(path.join(outDir, "compose.json"), JSON.stringify(manifest, null, 1));
  return manifest;
}
