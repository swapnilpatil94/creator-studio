import { piece, paper, tape, enter, f, esc, seedRot } from "./_kit.mjs"; import { measure } from "../src/lib/measure.mjs";
export default {
  name: "Tag", archetypes: ["place", "date_era", "character_intro"], slot: "hero",
  when_to_use: "A short label (place, year, who, 'लोककथा') on a taped paper tag.",
  schema: { type: "object", properties: { text: { type: "string", maxLength: 28 }, kind: { enum: ["place", "date", "folk"] } }, required: ["text"] },
  demo: { archetype: "place", component: "Tag", on_screen: ["उत्तराखंड, 5000 मीटर"] },
  async render(ctx) {
    const text = ctx.props.text, size = 64, [tw] = await measure([{ text, family: ctx.theme.fonts.tag, weight: 800, size }]), w = Math.min(780, Math.ceil(tw + 90)), h = 118, rot = seedRot(ctx.id + "tag", 3), x = 540 - w / 2, y = ctx.y0 ?? 760, p = ctx.theme.palette;
    const html = piece(ctx, { id: "tag", x, y, w, h, z: 7, inner: paper(ctx.id + "tag", w, h, p.gold, { amp: 5, shadow: ctx.theme.shadow }) + `<div class="tx" style="width:${w}px;height:${h}px;line-height:${h}px;text-align:center;font:800 ${size}px/${h}px ${f(ctx, "tag")};color:${p.night}">${esc(text)}</div>` }) + tape(ctx, "tagtape", x + w / 2 - 70, y - 26, rot * 2);
    return { html, js: enter(ctx, `#${ctx.id}-tag`, { y: 90, scale: 0.8, rotation: rot - 8 }, { y: 0, scale: 1, rotation: rot }, { dur: 0.5, ease: "back.out(1.8)" }) + enter(ctx, `#${ctx.id}-tagtape`, { y: -40 }, { y: 0 }, { dur: 0.3, delay: 0.25 }), bottom: y + h };
  },
  parse: beat => ({ props: { text: (beat.on_screen || [])[0] || "", kind: "place" }, headline: (beat.on_screen || []).slice(1) }),
};
