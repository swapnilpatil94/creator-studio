import { piece, enter, f, esc } from "./_kit.mjs";
export default {
  name: "Counter", archetypes: ["big_number", "countdown_time", "many_scale"], slot: "hero",
  when_to_use: "One big number that rolls up from zero, with its label. The number must appear in the script.",
  schema: { type: "object", properties: { value: { type: "number" }, label: { type: "string", maxLength: 28 } }, required: ["value"] },
  demo: { archetype: "big_number", component: "Counter", on_screen: ["300+", "लोग"] },
  async render(ctx) {
    const { value, suffix = "", label = "" } = ctx.props, y = ctx.y0 ?? 700, p = ctx.theme.palette, sz = 380;
    const html = piece(ctx, { id: "num", x: 60, y, w: 840, h: sz + 40, z: 7, boil: 0.7, inner: `<div id="${ctx.id}-numt" class="tx" style="width:840px;text-align:center;font:700 ${sz}px/1 ${f(ctx, "headline")};color:${p.saffron};-webkit-text-stroke:10px ${p.night};paint-order:stroke fill;text-shadow:12px 14px 0 ${ctx.theme.shadow}">${ctx.first ? value + esc(suffix) : "0"}</div>` }) + (label ? piece(ctx, { id: "lab", x: 160, y: y + sz + 20, w: 640, h: 110, z: 7, inner: `<div class="tx" style="width:640px;text-align:center;font:800 76px/110px ${f(ctx, "tag")};color:${p.ivory};background:${p.maroon};transform:rotate(-1.5deg);box-shadow:8px 10px 0 ${ctx.theme.shadow}">${esc(label)}</div>` }) : "");
    const js = enter(ctx, `#${ctx.id}-num`, { scale: 0.5, y: 80 }, { scale: 1, y: 0 }, { dur: 0.5, ease: "back.out(1.7)" }) + (label ? enter(ctx, `#${ctx.id}-lab`, { x: -200 }, { x: 0 }, { dur: 0.4, delay: 0.3 }) : "") + (ctx.first ? "" : `{const o={n:0},el=document.getElementById("${ctx.id}-numt");tl.fromTo(o,{n:0},{n:${value},duration:1.2,ease:"power2.out",onUpdate:()=>{el.textContent=Math.round(o.n)+${JSON.stringify(suffix)};}},${(ctx.t0 + 0.1).toFixed(3)});}`);
    return { html, js, bottom: y + sz + 130 };
  },
  parse: beat => { const o = beat.on_screen || [], i = o.findIndex(s => /\d/.test(s)), s = i >= 0 ? o[i] : "0", m = /(\d[\d,.]*)\s*(.*)$/.exec(s) || [0, "0", ""]; return { props: { value: parseFloat(m[1].replace(/,/g, "")) || 0, suffix: /^[+%x]/i.test(m[2]) ? m[2].split(/\s/)[0] : "", label: o.slice(i + 1).join(" ") }, headline: i > 0 ? o.slice(0, i) : [] }; },
};
