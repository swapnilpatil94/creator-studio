import { piece, enter, tape, seedRot } from "./_kit.mjs";
export default {
  name: "Cutout", archetypes: ["character_intro", "place", "evidence_reveal", "hook", "twist"], slot: "hero",
  when_to_use: "One illustrated subject as a sticker cut-out (white border, hard shadow) entering by slide, rise, pop, fly or drop. The workhorse visual.",
  schema: { type: "object", properties: { asset: { type: "string" }, enter: { enum: ["slide", "rise", "pop", "fly", "drop"] }, size: { type: "integer", minimum: 300, maximum: 900 } }, required: ["asset"] },
  demo: { archetype: "character_intro", component: "Cutout", on_screen: [], assets: [{ id: "lotus", subject: "a lotus", reuse: true }], motion: ["rise"] },
  async render(ctx) {
    const { asset, mode = "pop", size: size0 = 640 } = ctx.props, y = ctx.y0 ?? 330, size = Math.max(320, Math.min(size0, 1085 - y)), rot = seedRot(ctx.id + "co", 5), x = 540 - size / 2 + (rot > 0 ? 20 : -20), url = ctx.assetUrl(asset);
    const html = piece(ctx, { id: "co", x, y, w: size, h: size, z: 6, boil: 1, inner: `<img src="${url}" width="${size}" height="${size}" style="display:block;filter:url(#cutout)">` });
    const from = { slide: { x: 400, rotation: rot + 12 }, rise: { y: 300, scale: 0.9 }, pop: { scale: 0.3, rotation: rot - 12 }, fly: { x: -500, y: -300, rotation: rot - 25 }, drop: { y: -700, rotation: rot + 15 } }[mode] || { scale: 0.3 };
    return { html, js: enter(ctx, `#${ctx.id}-co`, from, { x: 0, y: 0, scale: 1, rotation: rot }, { dur: 0.55, ease: mode === "drop" ? "bounce.out" : "back.out(1.6)" }), bottom: y + size };
  },
  parse: beat => ({ props: { asset: (beat.assets || [])[0]?.id, mode: (beat.motion || []).find(m => ["slide", "rise", "pop", "fly", "drop"].includes(m)) || "pop", size: 640 }, headline: beat.on_screen || [] }),
};
