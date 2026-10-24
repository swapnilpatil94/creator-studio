import { piece, paper, enter, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "VersusSplit", archetypes: ["comparison", "options", "date_era"], slot: "full", styles: ["split"],
  when_to_use: "Split screen: two panels side by side (left vs right) with a VS badge: comparisons, then vs now, two theories. Give two assets and two labels.",
  schema: { type: "object", properties: { left: { type: "string", maxLength: 16 }, right: { type: "string", maxLength: 16 }, assets: { type: "array", items: { type: "string" }, maxItems: 2 } }, required: ["left", "right"] },
  demo: { archetype: "comparison", component: "VersusSplit", on_screen: ["पहले", "आज"], assets: [{ id: "moon", subject: "moon", reuse: true }, { id: "flame", subject: "flame", reuse: true }] },
  defaultY: 300,
  async render(ctx) {
    const { left, right, assets = [] } = ctx.props, p = ctx.theme.palette, y = ctx.y0 ?? 300, pw = 470, ph = 760; let html = "", js = "";
    for (const [k, [lab, a, x, col, ink]] of [[left, assets[0], 50, p.maroon, p.ivory], [right, assets[1], 560, p.ivory, p.maroon]].entries()) {
      const fit = await fitSize(lab, { family: ctx.theme.fonts.headline, weight: 700, start: 120, min: 60, maxW: pw - 50 });
      html += piece(ctx, { id: `p${k}`, x, y, w: pw, h: ph, z: 5, inner: paper(`${ctx.id}p${k}`, pw, ph, col, { amp: 6, shadow: ctx.theme.shadow }) + `<div class="tx" style="width:${pw}px;text-align:center;top:30px;font:700 ${fit.size}px/1.1 ${f(ctx, "headline")};color:${ink}">${esc(lab)}</div>` + (a ? `<img src="${ctx.assetUrl(a)}" width="400" height="400" style="position:absolute;left:35px;top:230px;filter:url(#cutout)">` : "") });
      js += enter(ctx, `#${ctx.id}-p${k}`, { x: k ? 700 : -700 }, { x: 0 }, { dur: 0.5, ease: "power3.out" });
    }
    html += piece(ctx, { id: "vs", x: 540 - 95, y: y + ph / 2 - 95, w: 190, h: 190, z: 9, boil: 0.5, inner: `<div style="width:190px;height:190px;border-radius:50%;background:${p.saffron};border:10px solid ${p.night};text-align:center;font:700 110px/170px ${f(ctx, "headline")};color:${p.night};box-shadow:8px 10px 0 ${ctx.theme.shadow}">VS</div>` });
    js += enter(ctx, `#${ctx.id}-vs`, { scale: 3, rotation: -30 }, { scale: 1, rotation: -8 }, { dur: 0.3, ease: "power4.in", delay: 0.45 });
    return { html, js, bottom: y + ph, impacts: ctx.first ? [] : [+(ctx.t0 + 0.75).toFixed(3)] };
  },
  parse: beat => ({ props: { left: (beat.on_screen || [])[0] || "", right: (beat.on_screen || [])[1] || "", assets: (beat.assets || []).map(a => a.id) }, headline: [] }),
};
