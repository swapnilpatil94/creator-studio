import { piece, paper, enter, f, esc, seedRot } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "QuoteCard", archetypes: ["quote", "evidence_reveal", "cause_effect"], slot: "hero",
  when_to_use: "A quoted line with its attribution ('शिव पुराण के अनुसार', 'लोग कहते हैं') on a manuscript card. Use for any claim that rests on a source or a legend.",
  schema: { type: "object", properties: { quote: { type: "string", maxLength: 28 }, by: { type: "string", maxLength: 28 } }, required: ["quote"] },
  demo: { archetype: "quote", component: "QuoteCard", on_screen: ["विष कंठ में रोक लिया", "शिव पुराण के अनुसार"] },
  async render(ctx) {
    const { quote, by } = ctx.props, GAP = 150, fit = await fitSize(quote, { family: ctx.theme.fonts.manuscript, weight: 400, start: 92, min: 46, maxW: 640 }), w = 860, h = Math.round(fit.size * 1.4 + (by ? 230 : 150) + 70), x = 110, y = ctx.y0 ?? 760, p = ctx.theme.palette, rot = seedRot(ctx.id + "q", 1.5);
    const html = piece(ctx, { id: "q", x, y, w, h, z: 7, inner: paper(ctx.id + "q", w, h, p.ivory, { amp: 5, shadow: ctx.theme.shadow }) + `<div style="position:absolute;left:30px;top:22px;width:${w - 60}px;height:${h - 44}px;border:5px double ${p.gold}"></div><div class="tx" style="position:absolute;left:50px;top:10px;font:400 190px/1 ${f(ctx, "headline")};color:${p.saffron}">“</div><div class="tx" style="position:absolute;left:70px;top:${GAP}px;width:${w - 140}px;text-align:center;font:400 ${fit.size}px/1.3 ${f(ctx, "manuscript")};color:${p.maroon}">${esc(quote)}</div>${by ? `<div class="tx" style="position:absolute;left:70px;top:auto;bottom:46px;width:${w - 140}px;text-align:center;font:800 44px/1 ${f(ctx, "tag")};color:${p.indigo}">— ${esc(by)}</div>` : ""}` });
    return { html, js: enter(ctx, `#${ctx.id}-q`, { scale: 0.85, rotation: rot + 6, y: 60 }, { scale: 1, rotation: rot, y: 0 }, { dur: 0.5, ease: "back.out(1.5)" }), bottom: y + h };
  },
  parse: beat => { const o = beat.on_screen || []; return { props: { quote: o[0] || "", by: o[1] || "" }, headline: o.slice(2) }; },
};
