import { win, enter, esc } from "./_kit.mjs";
export default {
  name: "ChatThread", archetypes: ["cause_effect", "character_intro", "quote", "evidence_reveal"], slot: "full", styles: ["desktop"],
  when_to_use: "Investigation desktop: chat bubbles pop in one by one (alternating sides, a typing indicator first): witness messages, an exchange of letters, a theory thread. Up to 3 messages.",
  schema: { type: "object", properties: { messages: { type: "array", items: { type: "string", maxLength: 28 }, maxItems: 3 } }, required: ["messages"] },
  demo: { archetype: "quote", component: "ChatThread", on_screen: ["क्या तुमने वो झील देखी?", "हाँ... वहाँ कंकाल थे", "किसी को बताना मत"] },
  defaultY: 240,
  async render(ctx) {
    const msgs = ctx.props.messages, y = ctx.y0 ?? 240, w = 900, h = 820, t0 = ctx.first ? 0 : ctx.t0, step = Math.max(0.6, (ctx.seconds - 1) / Math.max(1, msgs.length));
    const bubs = msgs.map((m, k) => `<div id="${ctx.id}-m${k}" style="margin:26px 30px 0 ${k % 2 ? "150px" : "30px"};padding:22px 30px;background:${k % 2 ? "#2c7a3a" : "#ffffff"};color:${k % 2 ? "#fff" : "#1a1a1a"};border:4px solid #0a0f1a;border-radius:34px ${k % 2 ? "34px 6px" : "6px 34px"} 34px;font:800 52px/1.25 'Mukta';opacity:${ctx.first ? 1 : 0};box-shadow:6px 8px 0 rgba(0,0,0,.35)">${esc(m)}</div>`).join("");
    const html = win(ctx, { id: "ct", x: 90, y, w, h, title: "MESSAGES · 3 unread", body: `<div id="${ctx.id}-dots" style="margin:26px 30px 0;width:150px;padding:16px 24px;background:#fff;border:4px solid #0a0f1a;border-radius:34px;font:800 56px/1 'Mukta';letter-spacing:10px;opacity:0">•••</div>${bubs}` });
    let js = enter(ctx, `#${ctx.id}-ct`, { y: 90, scale: 0.9 }, { y: 0, scale: 1 }, { dur: 0.4, ease: "back.out(1.4)" });
    if (!ctx.first) { js += `tl.set("#${ctx.id}-dots",{opacity:1},${(t0 + 0.3).toFixed(3)});tl.set("#${ctx.id}-dots",{display:"none"},${(t0 + 0.3 + step * 0.6).toFixed(3)});`; msgs.forEach((_, k) => { js += `tl.fromTo("#${ctx.id}-m${k}",{opacity:0,scale:0.6,y:30},{opacity:1,scale:1,y:0,duration:0.28,ease:"back.out(2)",immediateRender:false},${(t0 + 0.3 + step * 0.6 + k * step * 0.8).toFixed(3)});`; }); }
    return { html, js, bottom: y + h };
  },
  parse: beat => ({ props: { messages: (beat.on_screen || []).slice(0, 3) }, headline: [] }),
};
