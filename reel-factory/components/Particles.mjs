export default {
  name: "Particles", archetypes: ["hook", "twist", "place"], slot: "fx",
  when_to_use: "Ambient or burst particles (sparks | petals | dust | burst) over a station. Positions are pure functions of time; never the main component, used through motion presets 'sparks', 'petals', 'dust'.",
  schema: { type: "object", properties: { kind: { enum: ["sparks", "petals", "dust", "burst"] }, count: { type: "integer", maximum: 40 } } },
  demo: { archetype: "hook", component: "HeadlineStrips", on_screen: ["चिंगारी"], motion: ["sparks"] },
  async render() { return { html: "", js: "", bottom: 0 }; },   // placeholder: particles are attached by the composer from the beat's motion presets
  dot: (kind, c, seedI) => kind === "petals" ? `<i style="position:absolute;left:0;top:0;width:26px;height:36px;border-radius:70% 0 70% 0;background:${c}"></i>` : kind === "dust" ? `<i style="position:absolute;left:0;top:0;width:12px;height:12px;border-radius:50%;background:${c}"></i>` : `<i style="position:absolute;left:0;top:0;width:${9 + (seedI % 3) * 4}px;height:${9 + (seedI % 3) * 4}px;border-radius:50%;background:#fff1c2;box-shadow:0 0 14px 5px ${c}"></i>`,
};
