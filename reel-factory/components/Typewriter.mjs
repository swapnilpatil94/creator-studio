import { piece, paper, enter, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "Typewriter", archetypes: ["loop_cta", "evidence_reveal", "quote"], slot: "hero",
  when_to_use: "A line typed out letter by letter on a manuscript card: a question, a record entry or the closing hook.",
  schema: { type: "object", properties: { text: { type: "string", maxLength: 28 } }, required: ["text"] },
  demo: { archetype: "loop_cta", component: "Typewriter", on_screen: ["आपको क्या लगता है?"] },
  async render(ctx) {
    const text = ctx.props.text, fit = await fitSize(text, { family: ctx.theme.fonts.manuscript, weight: 400, start: 76, min: 40, maxW: 700 }), w = Math.min(840, Math.ceil(fit.width + 90)), h = Math.round(fit.size * 1.35 + 60), x = 540 - w / 2, y = ctx.y0 ?? 860, p = ctx.theme.palette;
    const html = piece(ctx, { id: "tw", x, y, w, h, z: 7, inner: paper(ctx.id + "tw", w, h, p.ivory, { amp: 4, shadow: ctx.theme.shadow }) + `<div id="${ctx.id}-twt" class="tx" style="width:${w}px;padding:${Math.round(h * 0.2)}px 45px 0;font:400 ${fit.size}px/1.2 ${f(ctx, "manuscript")};color:${p.maroon};white-space:nowrap">${ctx.first ? esc(text) : ""}</div>` });
    const dur = Math.min(1.6, 0.06 * [...text].length), js = enter(ctx, `#${ctx.id}-tw`, { y: 70 }, { y: 0 }, { dur: 0.4 }) + (ctx.first ? "" : `{const o={n:0},el=document.getElementById("${ctx.id}-twt"),tx=${JSON.stringify(text)};tl.fromTo(o,{n:0},{n:[...tx].length,duration:${dur.toFixed(2)},ease:"none",onUpdate:()=>{el.textContent=[...tx].slice(0,Math.round(o.n)).join("");}},${(ctx.t0 + 0.2).toFixed(3)});}`);
    return { html, js, bottom: y + h };
  },
  parse: beat => ({ props: { text: (beat.on_screen || []).slice(-1)[0] || "" }, headline: (beat.on_screen || []).slice(0, -1) }),
};
