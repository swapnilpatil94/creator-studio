import { piece, enter, esc } from "./_kit.mjs"; import { rng } from "../src/lib/rng.mjs"; import { fitSize } from "../src/lib/measure.mjs";
// One hundred people; n of them light up. The proportion is the picture ("10 of every 100 noticed").
export default {
  name: "DotCrowd", archetypes: ["big_number", "many_scale", "evidence_reveal"], slot: "full", styles: ["specimen"],
  when_to_use: "A share of people (a percent or a fraction): 100 small figures, n of them lit. Placed by the smart picker from the narration's own number.",
  schema: { type: "object", properties: { n: { type: "integer", minimum: 1, maximum: 100 }, caption: { type: "string", maxLength: 40 } }, required: ["n"] },
  demo: { component: "DotCrowd", on_screen: ["10%", "सौ में से"] }, defaultY: 300,
  async render(ctx) {
    const { n, caption = "", label = "" } = ctx.props, p = ctx.theme.palette, t0 = ctx.first ? 0 : ctx.t0, x0 = 135, y0 = 640, cw = 81, ch = 57, hot = new Set(); const r = rng("crowd:" + ctx.id + n); const idx = [...Array(100).keys()]; for (let i = 99; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } idx.slice(0, n).forEach(i => hot.add(i));
    const cfit = await fitSize(caption, { family: "Mukta", weight: 800, start: 66, min: 38, maxW: 820 }); let people = "";
    for (let i = 0; i < 100; i++) { const cx = (i % 10) * cw + cw / 2, cy = Math.floor(i / 10) * ch + ch / 2, h = hot.has(i); people += `<g class="${ctx.id}-${h ? "h" : "d"}" transform="translate(${cx} ${cy})" opacity="0"><circle cx="0" cy="-15" r="11" fill="${h ? p.amber : p.ivory}"/><path d="M-17 24 q0 -30 17 -30 q17 0 17 30 z" fill="${h ? p.amber : p.ivory}"/></g>`; }
    const html = piece(ctx, { id: "crowd", x: x0 - 60, y: y0 - 235, w: 900, h: 600, z: 6, boil: 0, inner: `<svg width="900" height="650" viewBox="-60 -10 900 650" style="position:absolute;left:0;top:0">${people}</svg>` })
      + piece(ctx, { id: "num", x: 90, y: 250, w: 900, h: 230, z: 9, boil: 0.5, inner: `<div style="width:900px;text-align:center;font:900 250px/230px 'Anton','Teko';color:${p.amber};text-shadow:0 10px 0 rgba(0,0,0,.55);opacity:1">${esc(label || n + "%")}</div>` })
      + (caption ? piece(ctx, { id: "cap", x: 120, y: 1010, w: 840, h: 140, z: 8, boil: 0.8, inner: `<div style="width:840px;height:140px;background:${(ctx.style?.skin || {}).label || "#EDE3CF"};transform:rotate(-1deg);box-shadow:8px 10px 0 rgba(0,0,0,.5);text-align:center;font:800 ${cfit.size}px/140px 'Mukta';color:${(ctx.style?.skin || {}).labelInk || "#1A1511"}">${esc(caption)}</div>` }) : "");
    const k = n > 40 ? 0.012 : 0.02; let js = enter(ctx, `#${ctx.id}-crowd`, {}, {}, { dur: 0.05 }) + (ctx.first ? `tl.set(".${ctx.id}-d",{opacity:0.4},0);tl.set(".${ctx.id}-h",{opacity:1},0);` : `tl.fromTo(".${ctx.id}-d",{opacity:0},{opacity:0.4,duration:0.25,stagger:0.006,ease:"none",immediateRender:false},${(t0 + 0.1).toFixed(3)});tl.fromTo(".${ctx.id}-h",{opacity:0,scale:1.9},{opacity:1,scale:1,duration:0.22,stagger:${k},ease:"back.out(2)",immediateRender:false},${(t0 + 0.9).toFixed(3)});`);
    js += enter(ctx, `#${ctx.id}-num`, { scale: 1.6, y: -30 }, { scale: 1, y: 0 }, { dur: 0.35, ease: "power4.out", delay: 0.8 }) + enter(ctx, `#${ctx.id}-cap`, { y: 60, rotation: 3 }, { y: 0, rotation: -1 }, { dur: 0.35, delay: 1.1 });
    return { html, js, bottom: 1150, impacts: ctx.first ? [] : [+(t0 + 1.0).toFixed(3)] };
  },
  parse: beat => ({ props: { n: Math.max(1, Math.min(100, parseInt((beat.on_screen || [])[0], 10) || 10)), label: (beat.on_screen || [])[0] || "", caption: (beat.on_screen || [])[1] || "" }, headline: [] }),
};
