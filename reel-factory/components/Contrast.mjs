import { piece, paper, tape, enter, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
// Belief above, fact below: two taped cards and an arrow between them.
export default {
  name: "Contrast", archetypes: ["comparison", "twist", "cause_effect", "consequence_today"], slot: "full", styles: ["specimen"],
  when_to_use: "What you assumed versus what actually happened: two stacked cards (light then dark). Placed by the smart picker.",
  schema: { type: "object", properties: { top: { type: "string", maxLength: 40 }, bottom: { type: "string", maxLength: 40 } }, required: ["top", "bottom"] },
  demo: { component: "Contrast", on_screen: ["आपने सोचा", "असल में हुआ"] }, defaultY: 300,
  async render(ctx) {
    const { top, bottom } = ctx.props, p = ctx.theme.palette, sk = ctx.style?.skin || { label: "#EDE3CF", labelInk: "#1A1511", tag: p.red }, t0 = ctx.first ? 0 : ctx.t0, W = 860, H = 330;
    const f1 = await fitSize(top, { family: "Mukta", weight: 800, start: 78, min: 40, maxW: W - 80 }), f2 = await fitSize(bottom, { family: "Mukta", weight: 800, start: 78, min: 40, maxW: W - 80 });
    const card = (id, y, fill, ink, tag, txt, fit, rot) => piece(ctx, { id, x: 110, y, w: W, h: H, z: 6, boil: 0.6, inner: paper(ctx.id + id, W, H, fill, { amp: 5, shadow: ctx.theme.shadow }) + `<div class="tx" style="left:30px;top:22px;font:700 26px 'IBM Plex Mono';letter-spacing:.2em;color:${tag}">${id === "c1" ? "ASSUMED" : "ACTUAL"}</div><div style="position:absolute;left:40px;right:40px;top:80px;height:${H - 110}px;display:flex;align-items:center;justify-content:center;text-align:center;font:800 ${fit.size}px/1.2 'Mukta';color:${ink}">${esc(txt)}</div>` });
    const html = card("c1", 300, sk.label, sk.labelInk, p.red, top, f1) + piece(ctx, { id: "arr", x: 440, y: 640, w: 200, h: 170, z: 9, boil: 0.4, inner: `<svg width="200" height="170" viewBox="0 0 200 170"><path d="M100 6 L100 120" stroke="${p.red}" stroke-width="16" stroke-linecap="round" pathLength="1" stroke-dasharray="1" id="${ctx.id}-ap"/><path d="M45 100 L100 160 L155 100" fill="none" stroke="${p.red}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" id="${ctx.id}-ah"/></svg>` })
      + card("c2", 810, p.night, p.ivory, p.amber, bottom, f2).replace('class="pp"', 'class="pp"') + tape(ctx, "t1", 200, 276, -7, 170) + tape(ctx, "t2", 720, 786, 8, 170);
    const js = enter(ctx, `#${ctx.id}-c1`, { x: -300, rotation: -6 }, { x: 0, rotation: -1.3 }, { dur: 0.4 }) + enter(ctx, `#${ctx.id}-t1`, { y: -70 }, { y: 0 }, { dur: 0.2, delay: 0.35 })
      + (ctx.first ? "" : `tl.fromTo("#${ctx.id}-ap",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.35,ease:"power2.out",immediateRender:false},${(t0 + 0.8).toFixed(3)});tl.fromTo("#${ctx.id}-ah",{opacity:0},{opacity:1,duration:0.1,immediateRender:false},${(t0 + 1.1).toFixed(3)});`)
      + enter(ctx, `#${ctx.id}-c2`, { x: 300, rotation: 6 }, { x: 0, rotation: 1.1 }, { dur: 0.4, delay: 1.0 }) + enter(ctx, `#${ctx.id}-t2`, { y: -70 }, { y: 0 }, { dur: 0.2, delay: 1.35 });
    return { html, js, bottom: 1140, impacts: ctx.first ? [] : [+(t0 + 1.0).toFixed(3)] };
  },
  parse: beat => ({ props: { top: (beat.on_screen || [])[0] || "", bottom: (beat.on_screen || [])[1] || "" }, headline: [] }),
};
