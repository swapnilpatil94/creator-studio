import { piece, win, enter, esc } from "./_kit.mjs";
export default {
  name: "SearchWindow", archetypes: ["evidence_reveal", "date_era", "place", "hook"], slot: "full", styles: ["desktop"],
  when_to_use: "Investigation desktop: a newspaper-archive search box types the query, then results pop in and the first one is highlighted. First on_screen item = the query, the others = the result headlines.",
  schema: { type: "object", properties: { query: { type: "string", maxLength: 28 }, results: { type: "array", items: { type: "string", maxLength: 28 }, maxItems: 3 } }, required: ["query"] },
  demo: { archetype: "evidence_reveal", component: "SearchWindow", on_screen: ["रूपकुंड 1942", "झील के पास कंकाल मिले", "रेंजर की रिपोर्ट"] },
  defaultY: 230,
  async render(ctx) {
    const { query, results = [] } = ctx.props, y = ctx.y0 ?? 230, w = 940, h = 780, t0 = ctx.first ? 0 : ctx.t0;
    const rows = results.map((r, k) => `<div id="${ctx.id}-r${k}" style="position:relative;margin:22px 34px 0;padding:18px 24px;background:${k === 0 ? "#fff6c8" : "#fffdf5"};border:3px solid #0a0f1a;border-radius:12px;opacity:${ctx.first ? 1 : 0}"><div style="font:800 46px/1.2 'Mukta'">${esc(r)}</div><div style="font:500 26px 'IBM Plex Mono';color:#7a6f58;margin-top:6px">ARCHIVE SCAN · p.${3 + k * 4} · ${1941 + k}</div></div>`).join("");
    const body = `<div style="margin:30px 34px 0;height:96px;background:#fff;border:4px solid #0a0f1a;border-radius:48px;position:relative"><div style="position:absolute;left:34px;top:22px;font:800 52px/1 'IBM Plex Mono';color:#8a2a14">⌕</div><div id="${ctx.id}-q" class="tx" style="left:110px;top:20px;font:800 54px/1.1 'Mukta';color:#1a1a1a">${ctx.first ? esc(query) : ""}</div></div>${rows}`;
    const html = win(ctx, { id: "sw", x: 70, y, w, h, title: "NEWS-ARCHIVE / search", body });
    let js = enter(ctx, `#${ctx.id}-sw`, { y: 90, scale: 0.9 }, { y: 0, scale: 1 }, { dur: 0.4, ease: "back.out(1.4)" });
    if (!ctx.first) { js += `{const o={n:0},el=document.getElementById("${ctx.id}-q"),tx=${JSON.stringify(query)};tl.fromTo(o,{n:0},{n:[...tx].length,duration:${Math.min(1.4, 0.07 * [...query].length).toFixed(2)},ease:"none",immediateRender:false,onUpdate:()=>{el.textContent=[...tx].slice(0,Math.round(o.n)).join("");}},${(t0 + 0.4).toFixed(3)});}`; results.forEach((_, k) => { js += `tl.fromTo("#${ctx.id}-r${k}",{opacity:0,x:80},{opacity:1,x:0,duration:0.3,ease:"power3.out",immediateRender:false},${(t0 + 1.2 + k * 0.28).toFixed(3)});`; }); }
    return { html, js, bottom: y + h };
  },
  parse: beat => ({ props: { query: (beat.on_screen || [])[0] || "", results: (beat.on_screen || []).slice(1, 4) }, headline: [] }),
};
