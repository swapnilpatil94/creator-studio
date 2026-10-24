import { piece, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "Text3D", archetypes: ["hook", "big_number", "twist"], slot: "hero", styles: ["threed", "whip"],
  when_to_use: "3D-lite: one extruded 3D word that tilts and sways in perspective. Use for the single most important word or number.",
  schema: { type: "object", properties: { text: { type: "string", maxLength: 12 } }, required: ["text"] },
  demo: { archetype: "hook", component: "Text3D", on_screen: ["विष"] },
  defaultY: 520,
  async render(ctx) {
    const text = ctx.props.text, p = ctx.theme.palette, fit = await fitSize(text, { family: ctx.theme.fonts.headline, weight: 700, start: 420, min: 160, maxW: 860 }), y = ctx.y0 ?? 520;
    const ext = Array.from({ length: 22 }, (_, k) => `${k + 1}px ${k + 1}px 0 ${k % 2 ? p.maroon : "#4a1216"}`).join(",") + `,30px 38px 40px rgba(0,0,0,.55)`;
    const html = piece(ctx, { id: "t3", x: 90, y, w: 900, h: fit.size * 1.3, z: 6, boil: 0, inner: `<div style="position:absolute;inset:0;perspective:1200px"><div id="${ctx.id}-t3t" class="tx" style="width:900px;text-align:center;font:700 ${fit.size}px/1.2 ${f(ctx, "headline")};color:${p.saffron};text-shadow:${ext};transform-style:preserve-3d">${esc(text)}</div></div>` });
    const t0 = ctx.first ? 0 : ctx.t0, d = Math.max(1.5, ctx.seconds - 0.3), js = (ctx.first ? `tl.set("#${ctx.id}-t3",{opacity:1},0);` : `tl.fromTo("#${ctx.id}-t3",{opacity:0,scale:0.4},{opacity:1,scale:1,duration:0.4,ease:"back.out(1.8)",immediateRender:false},${t0.toFixed(3)});`) + `tl.fromTo("#${ctx.id}-t3t",{rotationY:-26,rotationX:10},{rotationY:26,rotationX:-6,duration:${d.toFixed(2)},ease:"sine.inOut",immediateRender:false},${t0.toFixed(3)});`;
    return { html, js, bottom: y + fit.size * 1.3 };
  },
  parse: beat => ({ props: { text: (beat.on_screen || [])[0] || "" }, headline: (beat.on_screen || []).slice(1) }),
};
