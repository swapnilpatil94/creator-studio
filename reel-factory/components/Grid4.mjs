import { piece, paper, enter, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "Grid4", archetypes: ["many_scale", "process_steps", "comparison"], slot: "full", styles: ["split"],
  when_to_use: "Four-panel mosaic (2x2) with staggered pops: four clues, four theories, four steps. Up to 4 assets and 3-4 short labels.",
  schema: { type: "object", properties: { labels: { type: "array", items: { type: "string", maxLength: 12 }, maxItems: 4 }, assets: { type: "array", items: { type: "string" }, maxItems: 4 } } },
  demo: { archetype: "many_scale", component: "Grid4", on_screen: ["झील", "कंकाल", "बर्फ़"], assets: [{ id: "waves", subject: "w", reuse: true }, { id: "eye", subject: "e", reuse: true }, { id: "moon", subject: "m", reuse: true }, { id: "flame", subject: "f", reuse: true }] },
  defaultY: 300,
  async render(ctx) {
    const { labels = [], assets = [] } = ctx.props, p = ctx.theme.palette, y = ctx.y0 ?? 300, cw = 440, ch = 440, cols = [p.ivory, p.saffron, p.gold, p.ivory]; let html = "", js = "";
    for (let k = 0; k < 4; k++) { const x = 70 + (k % 2) * 480, yy = y + Math.floor(k / 2) * 480, lab = labels[k] || "", fit = lab ? await fitSize(lab, { family: ctx.theme.fonts.headline, weight: 700, start: 90, min: 50, maxW: cw - 40 }) : { size: 0 };
      html += piece(ctx, { id: `c${k}`, x, y: yy, w: cw, h: ch, z: 5, inner: paper(`${ctx.id}c${k}`, cw, ch, cols[k], { amp: 5, shadow: ctx.theme.shadow, off: [7, 9] }) + (assets[k] ? `<img src="${ctx.assetUrl(assets[k])}" width="300" height="300" style="position:absolute;left:70px;top:20px;filter:url(#cutout)">` : "") + (lab ? `<div class="tx" style="width:${cw}px;text-align:center;top:${ch - fit.size * 1.25 - 14}px;font:700 ${fit.size}px/1.1 ${f(ctx, "headline")};color:${p.maroon}">${esc(lab)}</div>` : "") });
      js += enter(ctx, `#${ctx.id}-c${k}`, { scale: 0.4, rotation: (k % 2 ? 8 : -8) }, { scale: 1, rotation: [-1.5, 1.2, 1.4, -1][k] }, { dur: 0.4, ease: "back.out(1.7)", delay: k * 0.14 }); }
    return { html, js, bottom: y + 920 };
  },
  parse: beat => ({ props: { labels: beat.on_screen || [], assets: (beat.assets || []).map(a => a.id) }, headline: [] }),
};
