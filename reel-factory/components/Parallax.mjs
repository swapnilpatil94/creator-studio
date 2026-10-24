import { piece } from "./_kit.mjs";
export default {
  name: "Parallax", archetypes: ["place", "character_intro", "evidence_reveal", "hook"], slot: "full", styles: ["parallax"],
  when_to_use: "2.5D: the camera pushes through 2-3 layers (background, middle, foreground) that move at different speeds, like a film shot. Give assets back to front.",
  schema: { type: "object", properties: { layers: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } }, required: ["layers"] },
  demo: { archetype: "place", component: "Parallax", on_screen: [], assets: [{ id: "rays", subject: "sunburst", reuse: true }, { id: "mountain", subject: "mountain", reuse: true }, { id: "serpent", subject: "serpent", reuse: true }] },
  defaultY: 300,
  async render(ctx) {
    const L = ctx.props.layers, n = L.length, sizes = [1500, 880, 620, 520], ys = [160, 520, 900, 1000]; let html = "", js = "", t0 = ctx.first ? 0 : ctx.t0, dur = ctx.seconds + 0.2;
    L.forEach((a, k) => { const d = (k + 0.4) / n, size = sizes[Math.min(k, 3)], x = 540 - size / 2 + (k === n - 1 && n > 2 ? -140 : 0), y = ys[Math.min(k, 3)] - (k === 0 ? 160 : 0), id = `l${k}`;
      html += piece(ctx, { id, x, y, w: size, h: size, z: 3 + k, boil: 0, origin: "50% 60%", inner: `<img src="${ctx.assetUrl(a)}" width="${size}" height="${size}" style="display:block;${k > 0 ? "filter:url(#cutout)" : "opacity:.8"}">` });
      js += (ctx.first ? `tl.set("#${ctx.id}-${id}",{opacity:1},0);` : `tl.fromTo("#${ctx.id}-${id}",{opacity:0},{opacity:1,duration:0.35,immediateRender:false},${t0.toFixed(3)});`) + `tl.fromTo("#${ctx.id}-${id}",{scale:1,x:0},{scale:${(1 + 0.28 * d).toFixed(3)},x:${(k % 2 ? 1 : -1) * Math.round(70 * d)},duration:${dur.toFixed(3)},ease:"none",immediateRender:false},${t0.toFixed(3)});`;
      if (k === 0) html += `<div style="position:absolute;left:0;top:0;width:1080px;height:1100px;z-index:3;background:linear-gradient(rgba(0,0,0,0) 40%,rgba(10,8,22,.55))"></div>`; });
    return { html, js, bottom: 1100 };
  },
  parse: beat => ({ props: { layers: (beat.assets || []).map(a => a.id) }, headline: beat.on_screen || [] }),
};
