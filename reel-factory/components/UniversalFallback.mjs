import Headline from "./HeadlineStrips.mjs"; import Cutout from "./Cutout.mjs";
export default {
  name: "UniversalFallback", archetypes: ["*"], slot: "hero",
  when_to_use: "When nothing in the catalog fits: headline strips + one cutout + a motion preset. Always valid. Using it logs a 'gap' so the missing component lands on the backlog.",
  schema: { type: "object", properties: {} },
  demo: { archetype: "hook", component: "UniversalFallback", on_screen: ["कुछ अनोखा"], assets: [{ id: "flame", subject: "a flame", reuse: true }] },
  gap: true,
  async render(ctx) { return Cutout.render({ ...ctx, props: { asset: ctx.props.asset, mode: ctx.props.mode || "pop", size: 560 } }); },
  parse: beat => ({ props: { asset: (beat.assets || [])[0]?.id, mode: (beat.motion || [])[0] || "pop" }, headline: beat.on_screen || [] }),
};
