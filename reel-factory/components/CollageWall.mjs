import { piece, paper, tape, enter, esc, seedRot } from "./_kit.mjs"; import { rng } from "../src/lib/rng.mjs";
// A wall of 3 to 6 pinned cut-outs (the pictures already used in this film) with one caption; the pieces slap on one by one and the last one is circled in red.
export default {
  name: "CollageWall", archetypes: ["many_scale", "evidence_reveal", "options", "cause_effect"], slot: "full", styles: ["specimen"],
  when_to_use: "A collage of several cut-outs at once (who is involved, what was lost). Placed by the smart picker, reusing pictures already in the film.",
  schema: { type: "object", properties: { assets: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } }, caption: { type: "string", maxLength: 40 } }, required: ["assets"] },
  demo: { archetype: "many_scale", component: "CollageWall", on_screen: ["सब एक साथ"], assets: [{ id: "lotus", subject: "a", reuse: true }, { id: "flame", subject: "b", reuse: true }, { id: "moon", subject: "c", reuse: true }] }, defaultY: 300,
  async render(ctx) {
    const { assets, caption = "" } = ctx.props, p = ctx.theme.palette, sk = ctx.style?.skin || { mount: "#D9CDB4", label: "#EDE3CF", labelInk: "#1A1511", tag: p.red }, t0 = ctx.first ? 0 : ctx.t0, n = assets.length, r = rng("wall:" + ctx.id);
    const cells = n <= 3 ? [[70, 380], [500, 470], [270, 800]] : n === 4 ? [[60, 360], [520, 420], [110, 780], [560, 840]] : n === 5 ? [[60, 340], [500, 380], [60, 720], [540, 760], [290, 1030]] : [[60, 330], [500, 360], [60, 650], [520, 690], [60, 980], [520, 1010]];
    let html = "", js = ""; const sz = n <= 4 ? 420 : 380;
    assets.forEach((a, i) => { const [x, y] = cells[i], rot = seedRot(ctx.id + i, 6), w = sz, h = sz + 60;
      html += piece(ctx, { id: "w" + i, x, y, w, h, z: 5 + i, boil: 0.7, inner: paper(ctx.id + "w" + i, w, h, sk.mount, { amp: 5, shadow: ctx.theme.shadow }) }) + piece(ctx, { id: "i" + i, x: x + 25, y: y + 30, w: w - 50, h: w - 50, z: 6 + i, boil: 1, inner: `<img src="${ctx.assetUrl(a)}" width="${w - 50}" height="${w - 50}" style="display:block;filter:url(#cutout)">` }) + tape(ctx, "t" + i, x + w / 2 - 70, y - 20, (r() * 16 - 8), 140);
      const dl = i * 0.35; for (const k of ["w", "i"]) js += enter(ctx, `#${ctx.id}-${k}${i}`, { scale: 1.6, rotation: rot + 10, y: -120 }, { scale: 1, rotation: rot, y: 0 }, { dur: 0.3, ease: "power4.in", delay: dl }); js += enter(ctx, `#${ctx.id}-t${i}`, { y: -50 }, { y: 0 }, { dur: 0.15, delay: dl + 0.2 }); });
    const [lx, ly] = cells[n - 1], ring = piece(ctx, { id: "ring", x: lx - 20, y: ly - 20, w: sz + 40, h: sz + 100, z: 20, boil: 0.5, inner: `<svg width="${sz + 40}" height="${sz + 100}"><ellipse cx="${(sz + 40) / 2}" cy="${(sz + 100) / 2}" rx="${(sz + 20) / 2}" ry="${(sz + 80) / 2}" fill="none" stroke="${p.red}" stroke-width="14" pathLength="1" stroke-dasharray="1" id="${ctx.id}-rp"/></svg>` });
    html += ring; js += ctx.first ? "" : `tl.fromTo("#${ctx.id}-rp",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.5,ease:"power2.out",immediateRender:false},${(t0 + n * 0.35 + 0.4).toFixed(3)});tl.set("#${ctx.id}-ring",{opacity:1},${(t0 + n * 0.35 + 0.4).toFixed(3)});`;
    if (caption) { html += piece(ctx, { id: "cap", x: 120, y: 1190, w: 840, h: 90, z: 30, boil: 0.6, inner: `<div style="width:840px;height:90px;background:${sk.label};box-shadow:8px 10px 0 rgba(0,0,0,.5);transform:rotate(-1deg);text-align:center;font:800 54px/90px 'Mukta';color:${sk.labelInk}">${esc(caption)}</div>` }); js += enter(ctx, `#${ctx.id}-cap`, { y: 60 }, { y: 0 }, { dur: 0.3, delay: n * 0.35 + 0.2 }); }
    return { html, js, bottom: 1290, impacts: ctx.first ? [] : [+(t0 + 0.3).toFixed(3), +(t0 + n * 0.35 + 0.4).toFixed(3)] };
  },
  parse: beat => ({ props: { assets: (beat.assets || []).map(a => a.id).filter(Boolean).slice(0, 6), caption: (beat.on_screen || [])[0] || "" }, headline: [] }),
};
