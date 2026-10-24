import { piece, enter } from "./_kit.mjs";
export default {
  name: "MarkerDraw", archetypes: ["evidence_reveal", "twist", "cause_effect"], slot: "hero",
  when_to_use: "A red marker circle or underline drawn on to point at the hero (works on top of a Cutout; also used by motion preset 'circle').",
  schema: { type: "object", properties: { shape: { enum: ["circle", "underline", "arrow"] } } },
  demo: { archetype: "evidence_reveal", component: "MarkerDraw", on_screen: [], motion: ["circle"] },
  async render(ctx) {
    const shape = ctx.props.shape || "circle", y = ctx.y0 ?? 700, c = ctx.theme.stamp, w = 700, h = 560;
    const d = { circle: "M360 30 C610 20 690 200 640 330 C590 480 330 540 150 460 C20 400 20 190 130 110 C220 45 400 40 520 70", underline: "M40 300 Q250 260 380 290 T660 270", arrow: "M60 460 Q300 440 520 200 M520 200 L440 215 M520 200 L525 285" }[shape];
    const html = piece(ctx, { id: "mk", x: 190, y, w, h, z: 10, boil: 0.8, inner: `<svg width="${w}" height="${h}" style="overflow:visible"><path id="${ctx.id}-mkp" d="${d}" fill="none" stroke="${c}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${ctx.first ? 0 : 1}"/></svg>` });
    return { html, js: ctx.first ? `tl.set("#${ctx.id}-mk",{opacity:1},0);` : `tl.set("#${ctx.id}-mk",{opacity:1},${(ctx.t0 + 0.2).toFixed(3)});tl.fromTo("#${ctx.id}-mkp",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.6,ease:"power2.inOut"},${(ctx.t0 + 0.2).toFixed(3)});`, bottom: y + h };
  },
  parse: beat => ({ props: { shape: (beat.motion || []).find(m => ["circle", "underline", "arrow"].includes(m)) || "circle" }, headline: beat.on_screen || [] }),
};
