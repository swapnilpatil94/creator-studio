import { piece, paper, enter, f, esc } from "./_kit.mjs";
export default {
  name: "BeforeAfter", archetypes: ["comparison", "date_era", "consequence_today"], slot: "full", styles: ["split"],
  when_to_use: "Before / after: one frame where a divider sweeps across and reveals the second image. Two assets (before, after) and two labels.",
  schema: { type: "object", properties: { before: { type: "string" }, after: { type: "string" }, assets: { type: "array", items: { type: "string" }, maxItems: 2 } }, required: ["assets"] },
  demo: { archetype: "comparison", component: "BeforeAfter", on_screen: ["पहले", "बाद में"], assets: [{ id: "lotus", subject: "l", reuse: true }, { id: "flame", subject: "f", reuse: true }] },
  defaultY: 320,
  async render(ctx) {
    const { before = "BEFORE", after = "AFTER", assets } = ctx.props, p = ctx.theme.palette, y = ctx.y0 ?? 320, w = 900, h = 760, t0 = ctx.first ? 0 : ctx.t0 + 0.5, d = Math.max(1.2, ctx.seconds - 1.2);
    const pane = (k, bg, lab, a, inkc) => `<div id="${ctx.id}-pn${k}" style="position:absolute;inset:0;background:${bg};${k ? "clip-path:inset(0 100% 0 0)" : ""}"><img src="${ctx.assetUrl(a)}" width="520" height="520" style="position:absolute;left:190px;top:130px;filter:url(#cutout)"><div class="tx" style="left:34px;top:24px;font:700 100px/1 ${f(ctx, "headline")};color:${inkc}">${esc(lab)}</div></div>`;
    const html = piece(ctx, { id: "ba", x: 90, y, w, h, z: 5, boil: 0.5, inner: paper(ctx.id + "ba", w, h, p.night, { amp: 6, shadow: ctx.theme.shadow }) + `<div style="position:absolute;left:14px;top:14px;width:${w - 28}px;height:${h - 28}px;overflow:hidden">${pane(0, p.ivory, before, assets[0], p.maroon).replace('inset:0', 'left:0;top:0;width:100%;height:100%')}${pane(1, p.maroon, after, assets[1], p.gold).replace('inset:0', 'left:0;top:0;width:100%;height:100%')}<div id="${ctx.id}-hd" style="position:absolute;top:0;left:0;width:10px;height:100%;background:${p.saffron};box-shadow:0 0 0 4px ${p.night}"></div></div>` });
    const js = enter(ctx, `#${ctx.id}-ba`, { y: 80, scale: 0.92 }, { y: 0, scale: 1 }, { dur: 0.45 }) + `{const o={u:0},a=document.getElementById("${ctx.id}-pn1"),h=document.getElementById("${ctx.id}-hd");tl.fromTo(o,{u:0},{u:1,duration:${d.toFixed(2)},ease:"power2.inOut",immediateRender:false,onUpdate:()=>{a.style.clipPath="inset(0 "+((1-o.u)*100).toFixed(2)+"% 0 0)";h.style.left=(o.u*${w - 38}).toFixed(1)+"px";}},${t0.toFixed(3)});}`;
    return { html, js, bottom: y + h };
  },
  parse: beat => ({ props: { before: (beat.on_screen || [])[0], after: (beat.on_screen || [])[1], assets: (beat.assets || []).map(a => a.id) }, headline: [] }),
};
