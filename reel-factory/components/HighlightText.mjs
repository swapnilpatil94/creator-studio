import { piece, enter, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
// A big statement; amber highlighter bars sweep behind the key words one by one, as if someone is marking the evidence.
export default {
  name: "HighlightText", archetypes: ["quote", "evidence_reveal", "twist", "cause_effect"], slot: "full", styles: ["specimen"],
  when_to_use: "A statement with key words highlighted in sequence. Placed by the smart picker.",
  schema: { type: "object", properties: { lines: { type: "array", maxItems: 4, items: { type: "string" } }, hl: { type: "array", items: { type: "string" } } }, required: ["lines"] },
  demo: { archetype: "quote", component: "HighlightText", on_screen: ["दाम पहले बना", "पसंद बाद में"], hl: ["पहले", "बाद"] }, defaultY: 300,
  async render(ctx) {
    const { lines, hl = [] } = ctx.props, p = ctx.theme.palette, t0 = ctx.first ? 0 : ctx.t0, W = 900;
    const longest = lines.slice().sort((a, b) => b.length - a.length)[0] || "", fit = await fitSize(longest, { family: "Mukta", weight: 800, start: 104, min: 54, maxW: W - 20 }), lh = Math.round(fit.size * 1.5), H = lines.length * lh;
    let k = 0, bars = []; const body = lines.map((line, li) => `<div style="position:absolute;left:0;right:0;top:${li * lh}px;text-align:center;white-space:nowrap;font:800 ${fit.size}px/${lh}px 'Mukta';color:${p.ivory}">${line.split(/\s+/).map(w => { const h = hl.some(x => x && (w.startsWith(x) || x.startsWith(w))); if (!h) return `<span>${esc(w)}</span>`; const id = `${ctx.id}-h${k++}`; bars.push(id); return `<span style="position:relative;display:inline-block;padding:0 10px"><i id="${id}" style="position:absolute;left:0;right:0;top:12%;bottom:6%;background:${p.amber};transform-origin:0 50%;transform:scaleX(0);z-index:0"></i><b id="${id}t" style="position:relative;z-index:1;font-weight:800">${esc(w)}</b></span>`; }).join(" ")}</div>`).join("");
    const html = piece(ctx, { id: "txt", x: 90, y: Math.max(380, 760 - H / 2), w: W, h: H, z: 8, boil: 0.5, inner: body });
    let js = enter(ctx, `#${ctx.id}-txt`, { y: 50, scale: 0.94 }, { y: 0, scale: 1 }, { dur: 0.4 });
    bars.forEach((id, i) => { const t = (t0 + 0.8 + i * 0.5).toFixed(3); js += ctx.first ? `tl.set("#${id}",{scaleX:1},0);tl.set("#${id}t",{color:"#1A1511"},0);` : `tl.fromTo("#${id}",{scaleX:0},{scaleX:1,duration:0.3,ease:"power2.out",immediateRender:false},${t});tl.to("#${id}t",{color:"#1A1511",duration:0.15,immediateRender:false},${(+t + 0.12).toFixed(3)});`; });
    return { html, js, bottom: 760 + H / 2, impacts: ctx.first || !bars.length ? [] : [+(t0 + 0.8).toFixed(3)] };
  },
  parse: beat => ({ props: { lines: (beat.on_screen || []).slice(0, 4), hl: beat.hl || [] }, headline: [] }),
};
