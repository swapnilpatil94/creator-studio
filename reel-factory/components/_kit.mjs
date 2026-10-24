// Shared helpers for components. Every piece = outer .pc (GSAP animates it) > .boil (runtime jitters it on twos). Station-local coords; the composer adds the station offset.
import { torn } from "../src/lib/torn.mjs"; import { rng, hash } from "../src/lib/rng.mjs";
export const SAFE = { x0: 60, x1: 900, y0: 150, y1: 1250 };
export const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** a positioned animatable piece */
export function piece(ctx, { id, x, y, w, h, z = 5, inner, boil = 1, origin = "50% 50%", cls = "" }) {
  return `<div class="pc ${cls}" id="${ctx.id}-${id}" style="left:${(ctx.ox + x).toFixed(1)}px;top:${(ctx.oy + y).toFixed(1)}px;width:${w}px;height:${h}px;z-index:${z};transform-origin:${origin}"><div class="boil" data-seed="${ctx.id}-${id}" data-boil="${boil}">${inner}</div></div>`;
}
/** torn paper with a hard offset shadow (two clipped siblings sharing one polygon) */
export function paper(seed, w, h, fill, { amp = 7, shadow = "rgba(10,8,22,.62)", off = [9, 11], extra = "" } = {}) {
  const poly = torn(seed, w, h, { amp });
  return `<div class="sh" style="width:${w}px;height:${h}px;clip-path:${poly};background:${shadow};transform:translate(${off[0]}px,${off[1]}px)"></div><div class="pp" style="width:${w}px;height:${h}px;clip-path:${poly};background:${fill};${extra}"></div>`;
}
export const tape = (ctx, id, x, y, rot, w = 150, cls = "") => piece(ctx, { id, x, y, w, h: 46, z: 9, boil: 0.6, cls, inner: `<div class="tp" style="width:${w}px;height:46px;background:${ctx.theme.tape};transform:rotate(${rot}deg)"></div>` });
export const f = (ctx, k) => `'${ctx.theme.fonts[k]}'`;
/** js: enter a selector. Scene 1 is already in place at frame 0 (the hook); later scenes enter during the transition (ctx.t0 = content start). */
export function enter(ctx, sel, from, to, { dur = 0.4, ease = "power3.out", delay = 0 } = {}) {
  const j = o => JSON.stringify(o);
  if (ctx.first) return `tl.set(${j(sel)},${j({ ...to, opacity: to.opacity ?? 1 })},0);`;
  return `tl.fromTo(${j(sel)},${j({ opacity: 0, ...from })},${j({ opacity: 1, ...to, duration: dur, ease })},${(ctx.t0 + delay).toFixed(3)});`;
}
export const seedRot = (seed, max = 2) => +((rng("rot:" + seed)() * 2 - 1) * max).toFixed(2);
export const slotY = { headline: 170, hero: 640 };
/** a fake application window (investigation-desktop style): title bar with three dots, light paper body */
export function win(ctx, { id, x, y, w, h, title = "", body, z = 6, dark = false }) {
  const bg = dark ? "#10192b" : "#f2ede0", bar = dark ? "#1b2740" : "#d8d0bd", ink = dark ? "#9fb3c8" : "#4a3f2c";
  return piece(ctx, { id, x, y, w, h, z, boil: 0.4, inner: `<div style="position:absolute;inset:0;border-radius:18px;background:${bg};border:4px solid #0a0f1a;box-shadow:12px 16px 0 rgba(0,0,0,.5);overflow:hidden"><div style="position:absolute;left:0;right:0;top:0;height:66px;background:${bar};border-bottom:4px solid #0a0f1a"><i style="position:absolute;left:24px;top:22px;width:22px;height:22px;border-radius:50%;background:#e0584a"></i><i style="position:absolute;left:58px;top:22px;width:22px;height:22px;border-radius:50%;background:#e8b730"></i><i style="position:absolute;left:92px;top:22px;width:22px;height:22px;border-radius:50%;background:#58b86a"></i><div class="tx" style="left:140px;top:16px;font:500 30px 'IBM Plex Mono';color:${ink};letter-spacing:.06em">${esc(title)}</div></div><div style="position:absolute;left:0;right:0;top:70px;bottom:0">${body}</div></div>` });
}
