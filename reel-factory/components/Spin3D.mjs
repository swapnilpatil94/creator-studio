import { piece, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "Spin3D", archetypes: ["many_scale", "process_steps", "comparison"], slot: "hero", styles: ["threed"],
  when_to_use: "3D-lite: a 4-sided prism rotates in 3D showing up to 4 faces (a list, 'top 4', four facts). Faces are labels or assets.",
  schema: { type: "object", properties: { faces: { type: "array", items: { type: "string", maxLength: 14 }, maxItems: 4 } }, required: ["faces"] },
  demo: { archetype: "many_scale", component: "Spin3D", on_screen: ["झील", "बर्फ़", "कंकाल"] },
  defaultY: 380,
  async render(ctx) {
    const faces = [...ctx.props.faces]; while (faces.length < 4) faces.push(faces[faces.length % Math.max(1, ctx.props.faces.length)] || "·"); const p = ctx.theme.palette, S = 520, y = ctx.y0 ?? 380, cols = [p.maroon, p.indigo, p.saffron, p.ivory], inks = [p.gold, p.ivory, p.night, p.maroon];
    let inner = ""; for (const [k, t] of faces.slice(0, 4).entries()) { const fit = await fitSize(t, { family: ctx.theme.fonts.headline, weight: 700, start: 150, min: 60, maxW: S - 50 }); inner += `<div style="position:absolute;left:0;top:0;width:${S}px;height:${S}px;border:12px solid ${p.night};background:${cols[k]};transform:rotateY(${k * 90}deg) translateZ(${S / 2}px);backface-visibility:hidden;text-align:center;font:700 ${fit.size}px/${S - 24}px ${f(ctx, "headline")};color:${inks[k]}">${esc(t)}</div>`; }
    const html = piece(ctx, { id: "sp", x: 540 - S / 2, y, w: S, h: S, z: 6, boil: 0, inner: `<div style="position:absolute;inset:0;perspective:1500px"><div id="${ctx.id}-cube" style="position:absolute;inset:0;transform-style:preserve-3d;transform:translateZ(-${S / 2}px)">${inner}</div></div>` });
    const t0 = ctx.first ? 0 : ctx.t0, d = Math.max(2, ctx.seconds), js = (ctx.first ? `tl.set("#${ctx.id}-sp",{opacity:1},0);` : `tl.fromTo("#${ctx.id}-sp",{opacity:0,scale:0.5},{opacity:1,scale:1,duration:0.45,ease:"back.out(1.6)",immediateRender:false},${t0.toFixed(3)});`) + `tl.fromTo("#${ctx.id}-cube",{rotationY:0,rotationX:-12},{rotationY:-270,rotationX:-12,duration:${d.toFixed(2)},ease:"power1.inOut",immediateRender:false},${t0.toFixed(3)});`;
    return { html, js, bottom: y + S };
  },
  parse: beat => ({ props: { faces: beat.on_screen || [] }, headline: [] }),
};
