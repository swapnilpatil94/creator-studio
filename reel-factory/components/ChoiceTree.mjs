import { piece, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "ChoiceTree", archetypes: ["options", "cause_effect", "comparison", "twist"], slot: "full", styles: ["documentary", "desktop", "kinetic"],
  when_to_use: "Choice architecture: a question branches into 3-4 options; the DEFAULT option is the one made easy, visible and first. The branches draw, then the default path lights amber while the others dim.",
  schema: { type: "object", properties: { question: { type: "string", maxLength: 28 }, options: { type: "array", maxItems: 4, items: { type: "string", maxLength: 16 } }, default: { type: "integer" }, why: { type: "string", maxLength: 40 } }, required: ["question", "options"] },
  demo: { archetype: "options", component: "ChoiceTree", on_screen: ["सुबह क्या पिएँ?", "चाय", "कॉफ़ी", "शरबत"], options: ["चाय", "कॉफ़ी", "शरबत", "पानी"], default: 0, why: "हर जगह · आसान · सबसे आगे" },
  defaultY: 300,
  async render(ctx) {
    const { question, options, def = 0, why = "" } = ctx.props, p = ctx.theme.palette, y0 = ctx.y0 ?? 330, t0 = ctx.first ? 0 : ctx.t0, n = options.length, rowH = 138, qh = 130, treeTop = qh + 90, H = treeTop + n * rowH + (why ? 110 : 30), qFit = await fitSize(question, { family: "Mukta", weight: 800, start: 66, min: 40, maxW: 720 });
    let svg = "", cards = "", js = "";
    const qx = 450, qy = qh / 2 + 10;
    cards += `<div id="${ctx.id}-q" style="position:absolute;left:${qx - 380}px;top:10px;width:760px;height:${qh - 20}px;border:5px solid ${p.ivory};border-radius:22px;background:${(p.graphite||p.maroon)};text-align:center;font:800 ${qFit.size}px/${qh - 30}px 'Mukta';color:${p.ivory};opacity:${ctx.first ? 1 : 0}">${esc(question)}</div>`;
    for (const [k, o] of options.entries()) { const cy = treeTop + k * rowH + 60, isD = k === def, w = isD ? 600 : 480, x = 540 - w / 2 + (isD ? -20 : 40), oFit = await fitSize(o, { family: "Mukta", weight: 800, start: isD ? 70 : 54, min: 34, maxW: w - 50 });
      svg += `<path id="${ctx.id}-p${k}" d="M${qx} ${qh} C${qx} ${qh + 60} ${x + w / 2} ${cy - 90} ${x + w / 2} ${cy - 44}" fill="none" stroke="${p.ivory}" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${ctx.first ? 0 : 1}" opacity="${ctx.first ? (isD ? 1 : 0.35) : 0.9}"/>`;
      cards += `<div id="${ctx.id}-o${k}" style="position:absolute;left:${x}px;top:${cy - 44}px;width:${w}px;height:92px;border-radius:46px;border:5px solid ${isD ? (p.amber||p.saffron) : p.ivory};background:${isD ? (p.amber||p.saffron) : (p.graphite||p.maroon)};color:${isD ? p.night : p.ivory};text-align:center;font:800 ${oFit.size}px/${92 - 8}px 'Mukta';opacity:${ctx.first ? (isD ? 1 : 0.4) : 0}">${esc(o)}</div>`;
      if (!ctx.first) { const tt = t0 + 0.4 + k * 0.28; js += `tl.fromTo("#${ctx.id}-p${k}",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.5,ease:"power2.out",immediateRender:false},${tt.toFixed(3)});tl.fromTo("#${ctx.id}-o${k}",{opacity:0,scale:0.85},{opacity:1,scale:1,duration:0.35,ease:"back.out(1.6)",immediateRender:false},${(tt + 0.25).toFixed(3)});`; } }
    const tl = t0 + 0.4 + n * 0.28 + 0.9;
    if (!ctx.first) { js += `tl.fromTo("#${ctx.id}-q",{opacity:0,y:-30},{opacity:1,y:0,duration:0.4,immediateRender:false},${t0.toFixed(3)});`;
      options.forEach((_, k) => { if (k !== def) js += `tl.to("#${ctx.id}-o${k}",{opacity:0.4,duration:0.5,immediateRender:false},${tl.toFixed(3)});tl.to("#${ctx.id}-p${k}",{opacity:0.3,duration:0.5,immediateRender:false},${tl.toFixed(3)});`; else js += `tl.to("#${ctx.id}-p${k}",{stroke:${JSON.stringify((p.amber||p.saffron))},strokeWidth:10,duration:0.5,immediateRender:false},${tl.toFixed(3)});tl.fromTo("#${ctx.id}-o${k}",{scale:1},{scale:1.08,duration:0.5,ease:"back.out(2)",immediateRender:false},${tl.toFixed(3)});`; }); }
    else options.forEach((_, k) => { if (k === def) js += ""; });
    if (why) { cards += `<div id="${ctx.id}-why" class="tx" style="left:0;width:900px;text-align:center;top:${treeTop + n * rowH - 10}px;font:500 38px 'IBM Plex Mono';letter-spacing:.08em;color:${(p.amber||p.saffron)};opacity:${ctx.first ? 1 : 0}">${esc(why)}</div>`; if (!ctx.first) js += `tl.fromTo("#${ctx.id}-why",{opacity:0,y:14},{opacity:1,y:0,duration:0.4,immediateRender:false},${(tl + 0.3).toFixed(3)});`; }
    return { html: piece(ctx, { id: "ct", x: 90, y: y0, w: 900, h: H, z: 6, boil: 0, inner: `<svg width="900" height="${H}" style="position:absolute;left:0;top:0;overflow:visible">${svg}</svg>${cards}` }), js: `tl.set("#${ctx.id}-ct",{opacity:1},${t0.toFixed(3)});` + js, bottom: y0 + H };
  },
  parse: beat => ({ props: { question: (beat.on_screen || [])[0] || "", options: beat.options || (beat.on_screen || []).slice(1), def: beat.default ?? 0, why: beat.why || "" }, headline: [] }),
};
