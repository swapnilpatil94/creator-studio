import { piece, paper, enter, f, esc, seedRot } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "Note", archetypes: ["character_intro", "consequence_today", "cause_effect"], slot: "hero",
  when_to_use: "A handwritten margin note (Kalam) on a sticky of paper, with a marker underline: a human aside or a 'so what'.",
  schema: { type: "object", properties: { text: { type: "string", maxLength: 28 } }, required: ["text"] },
  demo: { archetype: "consequence_today", component: "Note", on_screen: ["आज भी लोग मानते हैं"] },
  async render(ctx) {
    const text = ctx.props.text, fit = await fitSize(text, { family: ctx.theme.fonts.note, weight: 700, start: 84, min: 44, maxW: 700 }), w = Math.ceil(fit.width + 80), h = Math.round(fit.size * 1.5 + 40), rot = seedRot(ctx.id + "note", 4), x = 120 + (rot > 0 ? 40 : 0), y = ctx.y0 ?? 840;
    const html = piece(ctx, { id: "note", x, y, w, h, z: 7, inner: paper(ctx.id + "note", w, h, "#F4E9B8", { amp: 4, shadow: ctx.theme.shadow, off: [7, 9] }) + `<div class="tx" style="width:${w}px;padding:${Math.round(h * 0.16)}px 40px 0;font:700 ${fit.size}px/1.3 ${f(ctx, "note")};color:#3b2410">${esc(text)}</div><svg width="${w}" height="26" style="position:absolute;left:0;top:${h - 34}px;overflow:visible"><path id="${ctx.id}-ul" d="M30 12 Q${w / 4} 2 ${w / 2} 12 T${w - 30} 10" fill="none" stroke="${ctx.theme.stamp}" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${ctx.first ? 0 : 1}"/></svg>` });
    const js = enter(ctx, `#${ctx.id}-note`, { x: 120, rotation: rot - 10 }, { x: 0, rotation: rot }, { dur: 0.45, ease: "back.out(1.6)" }) + (ctx.first ? "" : `tl.fromTo("#${ctx.id}-ul",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.5,ease:"power2.out"},${(ctx.t0 + 0.35).toFixed(3)});`);
    return { html, js, bottom: y + h };
  },
  parse: beat => ({ props: { text: (beat.on_screen || []).slice(-1)[0] || "" }, headline: (beat.on_screen || []).slice(0, -1) }),
};
