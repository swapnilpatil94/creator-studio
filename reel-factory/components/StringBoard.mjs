import { piece, paper, enter, esc, seedRot } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "StringBoard", archetypes: ["cause_effect", "evidence_reveal", "many_scale", "twist"], slot: "full", styles: ["specimen"],
  when_to_use: "Evidence board: 2-3 cut-outs pinned on index cards and joined by a red thread that draws from one to the next: 'it was all connected / someone arranged this'. Give 2-3 assets and a short label for each (on_screen).",
  schema: { type: "object", properties: { assets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 }, labels: { type: "array", items: { type: "string", maxLength: 16 }, maxItems: 3 } }, required: ["assets"] },
  demo: { archetype: "cause_effect", component: "StringBoard", on_screen: ["स्टेशन", "स्टॉल", "आदत"], assets: [{ id: "lotus", subject: "a", reuse: true }, { id: "flame", subject: "b", reuse: true }, { id: "moon", subject: "c", reuse: true }] },
  defaultY: 300,
  async render(ctx) {
    const { assets, labels = [] } = ctx.props, p = ctx.theme.palette, sk = ctx.style?.skin || { card: "#EDE3CF", labelInk: "#1A1511" }, t0 = ctx.first ? 0 : ctx.t0, n = assets.length, red = p.red || p.saffron, cw = 400, ch = 470, pos = [[90, 300], [590, 470], [250, 900]].slice(0, n);
    let html = "", js = "", pins = [];
    for (const [k, a] of assets.entries()) { const [x, y] = pos[k], rot = seedRot(ctx.id + "sb" + k, 4), lab = labels[k] || "", fit = lab ? await fitSize(lab, { family: "Mukta", weight: 800, start: 54, min: 34, maxW: cw - 40 }) : { size: 0 }; pins.push([x + cw / 2, y + 28]);
      html += piece(ctx, { id: `c${k}`, x, y, w: cw, h: ch, z: 5, boil: 0.8, inner: paper(`${ctx.id}c${k}`, cw, ch, sk.card, { amp: 4, shadow: ctx.theme.shadow, off: [9, 11] }) + `<img src="${ctx.assetUrl(a)}" width="${cw - 60}" height="${cw - 60}" style="position:absolute;left:30px;top:44px">` + (lab ? `<div class="tx" style="width:${cw}px;text-align:center;top:${ch - fit.size * 1.3 - 12}px;font:800 ${fit.size}px/1.2 'Mukta';color:${sk.labelInk}">${esc(lab)}</div>` : "") + `<div style="position:absolute;left:${cw / 2 - 16}px;top:12px;width:32px;height:32px;border-radius:50%;background:${red};border:4px solid #1A1511;box-shadow:3px 4px 0 rgba(0,0,0,.5)"></div>` });
      js += enter(ctx, `#${ctx.id}-c${k}`, { scale: 0.6, rotation: rot + 8, y: 60 }, { scale: 1, rotation: rot, y: 0 }, { dur: 0.45, ease: "back.out(1.6)", delay: k * 0.35 }); }
    let d = `M${pins[0][0]} ${pins[0][1]}`; for (let k = 1; k < n; k++) { const [x0, y0] = pins[k - 1], [x1, y1] = pins[k]; d += ` Q${(x0 + x1) / 2} ${Math.max(y0, y1) + 150} ${x1} ${y1}`; }
    html += piece(ctx, { id: "str", x: 0, y: 0, w: 1080, h: 1500, z: 9, boil: 0, inner: `<svg width="1080" height="1500" style="overflow:visible"><path id="${ctx.id}-th" d="${d}" fill="none" stroke="${red}" stroke-width="8" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${ctx.first ? 0 : 1}"/></svg>` });
    js += (ctx.first ? `tl.set("#${ctx.id}-str",{opacity:1},0);` : `tl.set("#${ctx.id}-str",{opacity:1},${t0.toFixed(3)});tl.fromTo("#${ctx.id}-th",{strokeDashoffset:1},{strokeDashoffset:0,duration:${(0.5 * (n - 1) + 0.4).toFixed(2)},ease:"power2.inOut",immediateRender:false},${(t0 + 0.8).toFixed(3)});`);
    return { html, js, bottom: 1370 };
  },
  parse: beat => ({ props: { assets: (beat.assets || []).map(a => a.id).slice(0, 3), labels: beat.on_screen || [] }, headline: [] }),
};
