import { piece, enter, f, esc } from "./_kit.mjs"; import { shapePoints } from "../src/lib/shapes.mjs";
export default {
  name: "ShapeHero", archetypes: ["hook", "twist", "place", "big_number"], slot: "hero", styles: ["matchcut"],
  when_to_use: "A big flat shape (circle, moon, eye, drop, diamond, heart, coin) with a short label: the thing the next scene's match cut flows out of. Set beat.shapes = [this shape, next shape].",
  schema: { type: "object", properties: { shape: { enum: ["circle", "moon", "eye", "drop", "diamond", "heart", "coin"] }, label: { type: "string", maxLength: 16 } }, required: ["shape"] },
  demo: { archetype: "hook", component: "ShapeHero", on_screen: ["एक चाँद"], shapes: ["moon", "eye"] },
  defaultY: 420,
  async render(ctx) {
    const { shape, label = "" } = ctx.props, R = 330, pts = shapePoints(shape).map(([x, y]) => `${(R + x * R).toFixed(1)},${(R + y * R).toFixed(1)}`).join(" "), p = ctx.theme.palette, y = ctx.y0 ?? 420;
    const html = piece(ctx, { id: "sh", x: 540 - R, y, w: R * 2, h: R * 2, z: 6, boil: 0.8, inner: `<svg width="${R * 2}" height="${R * 2}" viewBox="0 0 ${R * 2} ${R * 2}" style="overflow:visible"><polygon points="${pts}" fill="${p.saffron}" stroke="${p.night}" stroke-width="14" stroke-linejoin="round" transform="translate(12 14)" opacity=".55"/><polygon points="${pts}" fill="${p.gold}" stroke="${p.night}" stroke-width="14" stroke-linejoin="round"/></svg>${label ? `<div class="tx" style="width:${R * 2}px;text-align:center;top:${R - 70}px;font:700 140px/1.1 ${f(ctx, "headline")};color:${p.night}">${esc(label)}</div>` : ""}` });
    return { html, js: enter(ctx, `#${ctx.id}-sh`, { scale: 0.2, rotation: -40 }, { scale: 1, rotation: 0 }, { dur: 0.6, ease: "back.out(1.5)" }), bottom: y + R * 2 };
  },
  parse: beat => ({ props: { shape: (beat.shapes || ["circle"])[0], label: (beat.on_screen || [])[0] || "" }, headline: (beat.on_screen || []).slice(1) }),
};
