import { piece, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "Flashlight", archetypes: ["evidence_reveal", "twist", "quote"], slot: "full", styles: ["spotlight", "desktop", "minimal"],
  when_to_use: "Spotlight reveal: a dark scene where a flashlight beam sweeps and uncovers the hidden lines, then opens to the whole truth. Mystery re-hooks and verdicts.",
  schema: { type: "object", properties: { lines: { type: "array", items: { type: "string", maxLength: 28 }, maxItems: 3 } }, required: ["lines"] },
  demo: { archetype: "evidence_reveal", component: "Flashlight", on_screen: ["अंधेरे में छिपा", "एक पुराना नाम", "कौन था वो?"], accent_line: 3 },
  defaultY: 520,
  async render(ctx) {
    const lines = ctx.props.lines, p = ctx.theme.palette; let html = "", y = 470;
    for (const [k, t] of lines.entries()) { const fit = await fitSize(t, { family: ctx.theme.fonts.headline, weight: 700, start: 170, min: 80, maxW: 900 }); html += `<div class="tx" id="${ctx.id}-fl${k}" style="left:90px;width:900px;top:${y}px;text-align:center;font:700 ${fit.size}px/1.15 ${f(ctx, "headline")};color:${k + 1 === (ctx.props.accent || lines.length) ? p.saffron : p.ivory};z-index:6">${esc(t)}</div>`; y += Math.round(fit.size * 1.3); }
    html += `<div id="${ctx.id}-beam" style="position:absolute;inset:0;z-index:7;background:rgba(0,0,0,.985)"></div>`;
    const t0 = ctx.first ? 0 : ctx.t0, d = Math.max(1.6, ctx.seconds - 0.4), pts = [[200, 520, 80], [820, 560, 120], [320, 760, 120], [760, 900, 150], [540, 760, 1500]];
    const js = `const o${ctx.id}={x:200,y:520,r:80},o=o${ctx.id},el=document.getElementById("${ctx.id}-beam"),paint${ctx.id}=()=>{el.style.background="radial-gradient(circle at "+o.x.toFixed(0)+"px "+o.y.toFixed(0)+"px,rgba(0,0,0,0) "+o.r.toFixed(0)+"px,rgba(0,0,0,.985) "+(o.r*1.35+40).toFixed(0)+"px)";};const paint=paint${ctx.id};paint();` + pts.slice(1).map((q, k) => `tl.fromTo(o,{x:${pts[k][0]},y:${pts[k][1]},r:${pts[k][2]}},{x:${q[0]},y:${q[1]},r:${q[2]},duration:${(d / (pts.length - 1)).toFixed(3)},ease:"power2.inOut",immediateRender:false,onUpdate:paint${ctx.id}},${(t0 + (d / (pts.length - 1)) * k).toFixed(3)});`).join("") ;
    return { html, js, bottom: y, loop: ctx.first ? `tl.fromTo(o${ctx.id},{x:540,y:760,r:1500},{x:200,y:520,r:80,duration:0.01,immediateRender:false,onUpdate:paint${ctx.id}},LOOPT);` : "" };
  },
  parse: beat => ({ props: { lines: (beat.on_screen || []).slice(0, 3), accent: beat.accent_line }, headline: [] }),
};
