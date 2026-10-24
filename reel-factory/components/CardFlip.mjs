import { piece, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "CardFlip", archetypes: ["evidence_reveal", "twist", "character_intro", "options"], slot: "hero", styles: ["threed"],
  when_to_use: "3D-lite: a card flips in 3D to reveal the answer on its back. Front = picture + question, back = the answer.",
  schema: { type: "object", properties: { front: { type: "string", maxLength: 20 }, back: { type: "string", maxLength: 20 }, asset: { type: "string" } }, required: ["front", "back"] },
  demo: { archetype: "twist", component: "CardFlip", on_screen: ["कौन था?", "महादेव"], assets: [{ id: "eye", subject: "eye", reuse: true }] },
  defaultY: 330,
  async render(ctx) {
    const { front, back, asset } = ctx.props, p = ctx.theme.palette, y = ctx.y0 ?? 330, w = 640, h = 780, ft = await fitSize(front, { family: ctx.theme.fonts.headline, weight: 700, start: 130, min: 60, maxW: w - 60 }), bt = await fitSize(back, { family: ctx.theme.fonts.headline, weight: 700, start: 190, min: 80, maxW: w - 60 });
    const face = (bg, ink, inner, rot) => `<div style="position:absolute;inset:0;border:12px solid ${p.night};border-radius:30px;background:${bg};backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateY(${rot}deg);box-shadow:14px 16px 0 ${ctx.theme.shadow};overflow:hidden">${inner}</div>`;
    const html = piece(ctx, { id: "cf", x: 540 - w / 2, y, w, h, z: 6, boil: 0, inner: `<div style="position:absolute;inset:0;perspective:1600px"><div id="${ctx.id}-card" style="position:absolute;inset:0;transform-style:preserve-3d">${face(p.ivory, p.maroon, (asset ? `<img src="${ctx.assetUrl(asset)}" width="420" height="420" style="position:absolute;left:90px;top:60px;filter:url(#cutout)">` : "") + `<div class="tx" style="width:${w}px;text-align:center;top:${h - ft.size * 1.4 - 30}px;font:700 ${ft.size}px/1.1 ${f(ctx, "headline")};color:${p.maroon}">${esc(front)}</div>`, 0)}${face(p.maroon, p.gold, `<div class="tx" style="width:${w}px;text-align:center;top:${h / 2 - bt.size * 0.62}px;font:700 ${bt.size}px/1.15 ${f(ctx, "headline")};color:${p.gold}">${esc(back)}</div>`, 180)}</div></div>` });
    const t0 = ctx.first ? 0 : ctx.t0, tf = t0 + Math.max(0.9, ctx.seconds * 0.45), js = (ctx.first ? `tl.set("#${ctx.id}-cf",{opacity:1},0);` : `tl.fromTo("#${ctx.id}-cf",{opacity:0,y:120,scale:0.8},{opacity:1,y:0,scale:1,duration:0.45,ease:"back.out(1.6)",immediateRender:false},${t0.toFixed(3)});`) + `tl.fromTo("#${ctx.id}-card",{rotationY:0},{rotationY:180,duration:0.7,ease:"power3.inOut",immediateRender:false},${tf.toFixed(3)});`;
    return { html, js, bottom: y + h, impacts: [+(tf + 0.7).toFixed(3)] };
  },
  parse: beat => ({ props: { front: (beat.on_screen || [])[0] || "", back: (beat.on_screen || [])[1] || "", asset: (beat.assets || [])[0]?.id }, headline: [] }),
};
