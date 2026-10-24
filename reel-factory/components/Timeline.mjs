import { piece, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "Timeline", archetypes: ["date_era", "process_steps", "cause_effect"], slot: "full", styles: ["documentary", "desktop", "scrapbook", "kinetic"],
  when_to_use: "Evidence timeline: 2-4 dated nodes reveal down a vertical line (year in amber, what happened in ivory). Use only dates stated in the script; prefix a node with '!' to mark a crisis in red.",
  schema: { type: "object", properties: { nodes: { type: "array", maxItems: 4, items: { type: "object", properties: { year: { type: "string" }, text: { type: "string", maxLength: 28 }, hot: { type: "boolean" } } } }, title: { type: "string" } }, required: ["nodes"] },
  demo: { archetype: "date_era", component: "Timeline", on_screen: ["1903|एक कमेटी बनी", "!1930 के दशक|विदेश में माँग गिरी"] },
  defaultY: 470,
  async render(ctx) {
    const { nodes, title } = ctx.props, p = ctx.theme.palette, y0 = ctx.y0 ?? 380, gap = Math.min(330, 900 / Math.max(1, nodes.length)), t0 = ctx.first ? 0 : ctx.t0, step = Math.max(0.7, (ctx.seconds - 0.8) / (nodes.length + 0.5)), lineH = gap * (nodes.length - 1) + 40; let inner = "", js = "";
    if (title) inner += `<div class="tx" style="left:40px;top:-96px;font:800 40px 'Mukta';letter-spacing:.2em;color:${(p.sage||p.indigo)}">${esc(title)}</div>`;
    inner += `<div id="${ctx.id}-tl-line" style="position:absolute;left:109px;top:56px;width:6px;height:${lineH}px;background:${p.ivory};opacity:.55;transform-origin:top;transform:scaleY(${ctx.first ? 1 : 0})"></div>`;
    for (const [k, n] of nodes.entries()) { const col = n.hot ? p.red : (p.amber||p.saffron), fit = await fitSize(n.text, { family: "Mukta", weight: 800, start: 66, min: 40, maxW: 700 }), yy = k * gap;
      inner += `<div id="${ctx.id}-n${k}" style="position:absolute;left:0;top:${yy}px;width:900px;opacity:${ctx.first ? 1 : 0}"><div style="position:absolute;left:90px;top:34px;width:44px;height:44px;border-radius:50%;background:${col};border:6px solid ${p.night};box-shadow:0 0 0 4px ${col}55"></div><div class="tx" style="left:170px;top:-14px;font:800 ${n.year.length > 6 ? 108 : 150}px/1.1 'Mukta';color:${col}">${esc(n.year)}</div><div class="tx" style="left:172px;top:${(n.year.length > 6 ? 108 : 150) - 4}px;font:800 ${fit.size}px/1.25 'Mukta';color:${p.ivory}">${esc(n.text)}</div></div>`;
      if (!ctx.first) js += `tl.fromTo("#${ctx.id}-n${k}",{opacity:0,x:40},{opacity:1,x:0,duration:0.45,ease:"power3.out",immediateRender:false},${(t0 + 0.3 + k * step).toFixed(3)});`; }
    if (!ctx.first) js += `tl.fromTo("#${ctx.id}-tl-line",{scaleY:0},{scaleY:1,duration:${(step * nodes.length).toFixed(2)},ease:"none",immediateRender:false},${(t0 + 0.2).toFixed(3)});`;
    return { html: piece(ctx, { id: "tl", x: 90, y: y0, w: 900, h: lineH + 400, z: 6, boil: 0, inner }), js: (ctx.first ? `tl.set("#${ctx.id}-tl",{opacity:1},0);` : `tl.set("#${ctx.id}-tl",{opacity:1},${t0.toFixed(3)});`) + js, bottom: y0 + lineH + 300 };
  },
  parse: beat => ({ props: { nodes: (beat.on_screen || []).slice(0, 4).map(s => { const hot = s.startsWith("!"), [y, ...r] = s.replace(/^!/, "").split("|"); return { year: y.trim(), text: (r.join("|") || "").trim(), hot }; }), title: beat.title || "" }, headline: [] }),
};
