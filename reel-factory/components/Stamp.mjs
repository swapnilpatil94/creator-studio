import { piece, enter, f, esc } from "./_kit.mjs"; import { measure } from "../src/lib/measure.mjs";
export default {
  name: "Stamp", archetypes: ["twist", "evidence_reveal", "loop_cta"], slot: "hero",
  when_to_use: "One strong word slammed on like a rubber stamp (impact beat: shakes the camera).",
  schema: { type: "object", properties: { text: { type: "string", maxLength: 16 } }, required: ["text"] },
  demo: { archetype: "twist", component: "Stamp", on_screen: ["असली राज़", "सच?"], sfx: [{ at: "impact", name: "stamp_thud" }] },
  async render(ctx) {
    const text = ctx.props.text, size = 200, [tw] = await measure([{ text, family: ctx.theme.fonts.headline, weight: 700, size, spacing: 6 }]), w = Math.min(800, Math.ceil(tw + 90)), h = 290, x = 540 - w / 2 + 20, y = ctx.y0 ?? 800, c = ctx.theme.stamp;
    const html = piece(ctx, { id: "stamp", x, y, w, h, z: 9, boil: 0.5, inner: `<div style="width:${w - 24}px;height:${h - 24}px;border:12px solid ${c};border-radius:18px;box-shadow:inset 0 0 0 5px ${ctx.theme.palette.ivory}, 0 0 0 4px ${c};color:${c};text-align:center;font:700 ${size}px/${h - 48}px ${f(ctx, "headline")};letter-spacing:6px;mix-blend-mode:multiply;opacity:.94">${esc(text)}</div>` });
    return { html, js: enter(ctx, `#${ctx.id}-stamp`, { scale: 3, rotation: -22, y: -40 }, { scale: 1, rotation: -8, y: 0 }, { dur: 0.22, ease: "power4.in" }), bottom: y + h, impacts: [ctx.t0 - 0.03], fxBurst: { x: 540, y: y + h / 2, t: ctx.t0 - 0.03 } };
  },
  parse: beat => { const o = beat.on_screen || []; return { props: { text: o[o.length - 1] || "" }, headline: o.slice(0, -1) }; },
};
