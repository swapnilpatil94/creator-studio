import { piece, enter, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "BigWords", archetypes: ["hook", "twist", "quote", "loop_cta", "consequence_today"], slot: "full", styles: ["minimal", "kinetic", "whip"],
  when_to_use: "Minimal typographic: one huge word at a time slammed on the screen (on black in the minimal style), the payoff word in the accent colour. Almost no imagery; the sound does the work.",
  schema: { type: "object", properties: { words: { type: "array", items: { type: "string", maxLength: 16 }, maxItems: 3 }, accent: { type: "integer" } }, required: ["words"] },
  demo: { archetype: "twist", component: "BigWords", on_screen: ["और फिर", "सब शांत", "हो गया"], accent_line: 3, sfx: [{ at: "impact", name: "impact_big" }] },
  defaultY: 560,
  async render(ctx) {
    const words = ctx.props.words, acc = ctx.props.accent || words.length, p = ctx.theme.palette, step = Math.max(0.55, (ctx.seconds - 0.5) / words.length); let html = "", js = "", imp = [];
    for (const [k, w] of words.entries()) { const fit = await fitSize(w, { family: ctx.theme.fonts.headline, weight: 700, start: 330, min: 120, maxW: 900 }), id = `w${k}`, t = ctx.first && k === 0 ? 0 : ctx.t0 + 0.05 + k * step, hot = k + 1 === acc;
      html += piece(ctx, { id, x: 60, y: 520, w: 960, h: fit.size * 1.3, z: 6, boil: 0.5, inner: `<div class="tx" style="width:960px;text-align:center;font:700 ${fit.size}px/1.2 ${f(ctx, "headline")};color:${hot ? p.saffron : p.ivory};text-shadow:0 0 40px ${hot ? "rgba(232,137,43,.5)" : "rgba(255,255,255,.18)"}">${esc(w)}</div>` });
      js += (ctx.first && k === 0 ? `tl.set("#${ctx.id}-${id}",{opacity:1},0);` : `tl.fromTo("#${ctx.id}-${id}",{opacity:0,scale:1.7},{opacity:1,scale:1,duration:0.16,ease:"power4.out",immediateRender:false},${t.toFixed(3)});`) + (k < words.length - 1 ? `tl.set("#${ctx.id}-${id}",{opacity:0},${(ctx.t0 + 0.05 + (k + 1) * step).toFixed(3)});` : ""); if (hot && !ctx.first) imp.push(+(t + 0.1).toFixed(3)); }
    return { html, js, bottom: 900, impacts: imp, loop: ctx.first ? words.map((_, k) => `tl.set("#${ctx.id}-w${k}",{opacity:${k === 0 ? 1 : 0},scale:1},LOOPT);`).join("") : "" };
  },
  parse: beat => ({ props: { words: (beat.on_screen || []).slice(0, 3), accent: beat.accent_line }, headline: [] }),
};
