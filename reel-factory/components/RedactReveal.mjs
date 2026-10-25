import { piece, paper, tape, enter, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
// A typed sentence with the key words blacked out; the bars pull away one by one (what was hidden in plain sight).
export default {
  name: "RedactReveal", archetypes: ["evidence_reveal", "twist", "quote", "cause_effect"], slot: "full", styles: ["specimen"],
  when_to_use: "A sentence on paper with key words covered by black bars that wipe away. Placed by the smart picker.",
  schema: { type: "object", properties: { lines: { type: "array", maxItems: 3, items: { type: "string" } }, hide: { type: "array", items: { type: "string" } } }, required: ["lines"] },
  demo: { component: "RedactReveal", on_screen: ["वजह बाद में आई"], hide: ["वजह"] }, defaultY: 300,
  async render(ctx) {
    const { lines, hide = [] } = ctx.props, p = ctx.theme.palette, sk = ctx.style?.skin || { mount: "#D9CDB4", label: "#EDE3CF", labelInk: "#1A1511", tag: p.red }, t0 = ctx.first ? 0 : ctx.t0, W = 860, y = 420;
    const longest = lines.slice().sort((a, b) => b.length - a.length)[0] || "", fit = await fitSize(longest, { family: "Mukta", weight: 800, start: 92, min: 48, maxW: W - 90 }), lh = Math.round(fit.size * 1.4), H = lines.length * lh + 150;
    let body = "", bars = [], k = 0; for (const [li, line] of lines.entries()) { const spans = line.split(/\s+/).map(w => { const h = hide.some(x => x && (w.startsWith(x) || x.startsWith(w))); if (!h) return `<span>${esc(w)}</span>`; const id = `${ctx.id}-b${k++}`; bars.push(id); return `<span style="position:relative;display:inline-block"><span>${esc(w)}</span><i id="${id}" style="position:absolute;left:-8px;right:-8px;top:8%;bottom:4%;background:#0F0D0B;transform-origin:0 50%"></i></span>`; }).join(" "); body += `<div style="position:absolute;left:0;right:0;top:${li * lh}px;text-align:center;white-space:nowrap;font:800 ${fit.size}px/${lh}px 'Mukta';color:${sk.labelInk}">${spans}</div>`; }
    const html = piece(ctx, { id: "doc", x: 110, y, w: W, h: H, z: 6, boil: 0.6, inner: paper(ctx.id + "doc", W, H, sk.label, { amp: 5, shadow: ctx.theme.shadow }) + `<div class="tx" style="left:28px;top:20px;font:700 26px 'IBM Plex Mono';letter-spacing:.2em;color:${sk.tag}">CLASSIFIED</div><div style="position:absolute;left:35px;top:90px;width:${W - 70}px">${body}</div>` }) + tape(ctx, "t1", 190, y - 24, -8, 180) + tape(ctx, "t2", 700, y - 20, 9, 180);
    let js = enter(ctx, `#${ctx.id}-doc`, { y: 90, rotation: 4 }, { y: 0, rotation: -1.2 }, { dur: 0.45 }) + enter(ctx, `#${ctx.id}-t1`, { y: -70 }, { y: 0 }, { dur: 0.25, delay: 0.4 }) + enter(ctx, `#${ctx.id}-t2`, { y: -70 }, { y: 0 }, { dur: 0.25, delay: 0.5 });
    bars.forEach((id, i) => { js += ctx.first ? "" : `tl.fromTo("#${id}",{scaleX:1},{scaleX:0,duration:0.35,ease:"power3.inOut",immediateRender:false},${(t0 + 0.9 + i * 0.45).toFixed(3)});`; });
    return { html, js, bottom: y + H, impacts: ctx.first || !bars.length ? [] : [+(t0 + 0.9).toFixed(3)] };
  },
  parse: beat => ({ props: { lines: (beat.on_screen || []).slice(0, 3), hide: beat.hide || [] }, headline: [] }),
};
