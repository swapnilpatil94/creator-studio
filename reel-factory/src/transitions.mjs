// Scene transitions: each takes the outgoing and incoming scene containers and returns js (+ optional overlay html). Everything is a function of timeline time.
import { paper } from "../components/_kit.mjs"; import { torn } from "./lib/torn.mjs";
const j = JSON.stringify;
const setZ = (a, b, t) => `tl.set(${j(a)},{zIndex:3},${t.toFixed(3)});tl.set(${j(b)},{zIndex:4},${t.toFixed(3)});`;
const hideOut = (a, t) => `tl.set(${j(a)},{opacity:0,zIndex:1,x:0,y:0,scale:1,rotation:0,filter:"none"},${t.toFixed(3)});`;
const NR = { immediateRender: false };
export const TRANSITIONS = {
  dissolve:   { dur: 0.55, desc: "calm cross-dissolve" },
  cut:        { dur: 0.12, desc: "hard cut, tiny impact flash" },
  flash:      { dur: 0.16, desc: "white flash cut" },
  whip:       { dur: 0.28, desc: "speed-ramp whip pan with blur" },
  zoomThrough:{ dur: 0.7,  desc: "zoom into the focus point, next scene emerges from inside it" },
  tapeRip:    { dur: 0.46, desc: "a strip of torn paper sweeps across and tears the scene away" },
  morphIris:  { dur: 0.85, desc: "a shape grows and morphs into the next shape, revealing the next scene (match cut)" },
  filmBurn:   { dur: 0.5,  desc: "orange film burn / light leak between scenes" },
  spotlight:  { dur: 0.6,  desc: "radial mask closes to black, reopens on the next scene" },
};
/** returns { js, html } for the boundary a -> b starting at t */
export function transition(kind, { a, b, t, i, theme, focus = { x: 540, y: 800 }, shapes = ["circle", "circle"], impactAt }) {
  const d = (TRANSITIONS[kind] || TRANSITIONS.cut).dur, t1 = t + d, mid = t + d / 2, pal = theme.palette; let js = "", html = "";
  switch (kind) {
    case "dissolve":
      js += setZ(a, b, t) + `tl.fromTo(${j(b)},{opacity:0},{opacity:1,duration:${d},ease:"power1.inOut",immediateRender:false},${t.toFixed(3)});` + hideOut(a, t1); break;
    case "whip":
      js += setZ(a, b, t) + `tl.fromTo(${j(a)},{x:0,scaleX:1,filter:"blur(0px)"},{x:-1400,scaleX:1.25,filter:"blur(34px)",duration:${d},ease:"power3.in",immediateRender:false},${t.toFixed(3)});`
        + `tl.set(${j(b)},{opacity:1},${(t + d * 0.25).toFixed(3)});tl.fromTo(${j(b)},{x:1400,scaleX:1.25,filter:"blur(34px)"},{x:0,scaleX:1,filter:"blur(0px)",duration:${d * 0.8},ease:"power3.out",immediateRender:false},${(t + d * 0.25).toFixed(3)});` + `tl.set(${j(b)},{clearProps:"filter,transform"},${t1.toFixed(3)});` + hideOut(a, t1); break;
    case "zoomThrough":
      js += setZ(b, a, t) + `tl.set(${j(b)},{opacity:1},${t.toFixed(3)});tl.fromTo(${j(b)},{scale:0.62,transformOrigin:"540px 960px"},{scale:1,duration:${d},ease:"power3.out",immediateRender:false},${t.toFixed(3)});`
        + `tl.fromTo(${j(a)},{scale:1,transformOrigin:"${focus.x}px ${focus.y}px"},{scale:7,duration:${d},ease:"power3.in",immediateRender:false},${t.toFixed(3)});tl.fromTo(${j(a)},{opacity:1},{opacity:0,duration:${(d * 0.45).toFixed(3)},ease:"none",immediateRender:false},${(t + d * 0.55).toFixed(3)});` + hideOut(a, t1); break;
    case "tapeRip": {
      const w = 1500, h = 2700, poly = torn("rip" + i, w, h, { amp: 26, step: 60 }), c = pal.ivory || "#EFE2C2";
      html = `<div id="rip${i}" style="position:absolute;left:-1700px;top:-400px;width:${w}px;height:${h}px;z-index:9;opacity:0;transform:rotate(-14deg)"><div style="position:absolute;inset:0;clip-path:${poly};background:rgba(10,8,22,.7);transform:translate(16px,18px)"></div><div style="position:absolute;inset:0;clip-path:${poly};background:${theme.tape || c}"></div><div style="position:absolute;inset:0;clip-path:${poly};background:repeating-linear-gradient(90deg,rgba(255,255,255,.14) 0 6px,transparent 6px 22px)"></div></div>`;
      js += `tl.set("#rip${i}",{opacity:1},${t.toFixed(3)});tl.fromTo("#rip${i}",{x:0},{x:3300,duration:${d},ease:"power2.inOut",immediateRender:false},${t.toFixed(3)});tl.set("#rip${i}",{opacity:0},${t1.toFixed(3)});`
        + `tl.set(${j(a)},{opacity:0,zIndex:1},${mid.toFixed(3)});tl.set(${j(b)},{opacity:1,zIndex:4},${mid.toFixed(3)});`; break; }
    case "morphIris":
      js += setZ(a, b, t) + `tl.set(${j(b)},{opacity:1},${t.toFixed(3)});{const o={u:0};tl.fromTo(o,{u:0},{u:1,duration:${d},ease:"power2.inOut",immediateRender:false,onUpdate:()=>RF.irisClip(${j(b)},{a:${j(shapes[0])},b:${j(shapes[1])},cx:${focus.x},cy:${focus.y},r0:70,r1:2600},o.u)},${t.toFixed(3)});}`
        + `tl.set(${j(b)},{clipPath:"none"},${t1.toFixed(3)});` + hideOut(a, t1); break;
    case "filmBurn":
      html = `<div id="burn${i}" style="position:absolute;inset:0;z-index:9;opacity:0;mix-blend-mode:screen;background:radial-gradient(circle at 70% 30%,#fff3c4 0,#ff9a2e 28%,#c2380f 58%,rgba(120,20,0,0) 80%)"></div>`;
      js += `tl.fromTo("#burn${i}",{opacity:0},{opacity:1,duration:${d / 2},ease:"power2.in",immediateRender:false},${t.toFixed(3)});tl.fromTo("#burn${i}",{opacity:1},{opacity:0,duration:${d / 2},ease:"power2.out",immediateRender:false},${mid.toFixed(3)});`
        + `tl.set(${j(a)},{opacity:0,zIndex:1},${mid.toFixed(3)});tl.set(${j(b)},{opacity:1,zIndex:4},${mid.toFixed(3)});`; break;
    case "spotlight":
      html = `<div id="spot${i}" style="position:absolute;inset:0;z-index:9;opacity:0;background:#000"></div>`;
      js += `tl.fromTo("#spot${i}",{opacity:0},{opacity:1,duration:${d / 2},ease:"power2.in",immediateRender:false},${t.toFixed(3)});tl.set(${j(a)},{opacity:0,zIndex:1},${mid.toFixed(3)});tl.set(${j(b)},{opacity:1,zIndex:4},${mid.toFixed(3)});tl.fromTo("#spot${i}",{opacity:1},{opacity:0,duration:${d / 2},ease:"power2.out",immediateRender:false},${mid.toFixed(3)});`; break;
    case "flash":
      html = `<div id="fl${i}" style="position:absolute;inset:0;z-index:9;opacity:0;background:#fff"></div>`;
      js += `tl.fromTo("#fl${i}",{opacity:0},{opacity:0.95,duration:${d / 2},ease:"power1.in",immediateRender:false},${t.toFixed(3)});tl.set(${j(a)},{opacity:0,zIndex:1},${mid.toFixed(3)});tl.set(${j(b)},{opacity:1,zIndex:4},${mid.toFixed(3)});tl.fromTo("#fl${i}",{opacity:0.95},{opacity:0,duration:${d / 2},ease:"power2.out",immediateRender:false},${mid.toFixed(3)});`; break;
    default: // cut
      html = `<div id="fl${i}" style="position:absolute;inset:0;z-index:9;opacity:0;background:#fff"></div>`;
      js += `tl.set(${j(a)},{opacity:0,zIndex:1},${t.toFixed(3)});tl.set(${j(b)},{opacity:1,zIndex:4},${t.toFixed(3)});tl.fromTo("#fl${i}",{opacity:0.55},{opacity:0,duration:${d},ease:"power2.out",immediateRender:false},${t.toFixed(3)});`;
  }
  return { js, html, dur: d, impact: kind === "cut" || kind === "whip" };
}
