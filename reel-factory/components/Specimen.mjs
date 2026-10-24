import { piece, paper, tape, enter, f, esc, seedRot } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "Specimen", archetypes: ["hook", "character_intro", "place", "evidence_reveal", "many_scale", "twist"], slot: "full", styles: ["specimen"],
  when_to_use: "THE signature visual: one engraved cut-out taped onto a paper mount like a museum specimen, with a typewritten label card under it (tag, title, small caption). Use it for the object or place the narration is talking about. on_screen = [title, caption]; beat.tag = the small red tag (SPECIMEN, ARTEFACT, EXHIBIT A ...).",
  schema: { type: "object", properties: { asset: { type: "string" }, tag: { type: "string", maxLength: 14 }, title: { type: "string", maxLength: 24 }, sub: { type: "string", maxLength: 40 } }, required: ["asset", "title"] },
  demo: { archetype: "hook", component: "Specimen", on_screen: ["चाय का गिलास", "एक आदत की शुरुआत"], tag: "EXHIBIT A", assets: [{ id: "lotus", subject: "a glass of tea", reuse: true }] },
  defaultY: 300,
  async render(ctx) {
    const { asset, tag = "SPECIMEN", title = "", sub = "" } = ctx.props, p = ctx.theme.palette, sk = ctx.style?.skin || { mount: "#D9CDB4", label: "#EDE3CF", labelInk: "#1A1511", tag: p.red, card: "#EDE3CF" }, t0 = ctx.first ? 0 : ctx.t0, rot = seedRot(ctx.id + "sp", 2.2), mw = 760, mh = 650, mx = 160, my = 262, size = 520;
    const tfit = await fitSize(title, { family: "Mukta", weight: 800, start: 84, min: 44, maxW: 760 });
    let html = piece(ctx, { id: "mount", x: mx, y: my, w: mw, h: mh, z: 5, boil: 0.6, inner: paper(ctx.id + "mnt", mw, mh, sk.mount, { amp: 6, shadow: ctx.theme.shadow, off: [10, 12], extra: "background-image:linear-gradient(rgba(26,21,17,.08) 2px,transparent 2px),linear-gradient(90deg,rgba(26,21,17,.08) 2px,transparent 2px);background-size:46px 46px" }) })
      + piece(ctx, { id: "art", x: 540 - size / 2, y: my + 62, w: size, h: size, z: 6, boil: 1, inner: `<img src="${ctx.assetUrl(asset)}" width="${size}" height="${size}" style="display:block;filter:url(#cutout)">` })
      + tape(ctx, "t1", mx + 60, my - 22, -9, 190) + tape(ctx, "t2", mx + mw - 250, my - 18, 8, 190)
      + piece(ctx, { id: "label", x: 120, y: 945, w: 840, h: 190, z: 8, boil: 0.8, inner: paper(ctx.id + "lb", 840, 190, sk.label, { amp: 4, shadow: ctx.theme.shadow }) + `<div class="tx" style="left:34px;top:16px;font:700 28px 'IBM Plex Mono';letter-spacing:.2em;color:${sk.tag}">${esc(tag)}</div><div id="${ctx.id}-ttl" class="tx" style="left:34px;top:46px;font:800 ${tfit.size}px/1.15 'Mukta';color:${sk.labelInk}">${ctx.first ? esc(title) : ""}</div>${sub ? `<div id="${ctx.id}-sub" class="tx" style="left:36px;top:${46 + Math.round(tfit.size * 1.18)}px;font:500 30px 'IBM Plex Mono';letter-spacing:.06em;color:${sk.labelInk};opacity:${ctx.first ? 0.75 : 0}">${esc(sub)}</div>` : ""}` });
    let js = enter(ctx, `#${ctx.id}-mount`, { y: 60, rotation: rot + 5 }, { y: 0, rotation: rot }, { dur: 0.45 }) + enter(ctx, `#${ctx.id}-art`, { scale: 0.55, rotation: rot - 14, y: 40 }, { scale: 1, rotation: rot, y: 0 }, { dur: 0.6, ease: "back.out(1.7)", delay: 0.12 })
      + enter(ctx, `#${ctx.id}-t1`, { y: -70 }, { y: 0 }, { dur: 0.25, delay: 0.5 }) + enter(ctx, `#${ctx.id}-t2`, { y: -70 }, { y: 0 }, { dur: 0.25, delay: 0.6 }) + enter(ctx, `#${ctx.id}-label`, { y: 90, rotation: 4 }, { y: 0, rotation: -1.4 }, { dur: 0.45, ease: "back.out(1.5)", delay: 0.7 });
    if (!ctx.first) { js += `{const o={n:0},el=document.getElementById("${ctx.id}-ttl"),tx=${JSON.stringify(title)};tl.fromTo(o,{n:0},{n:[...tx].length,duration:${Math.min(1.1, 0.07 * [...title].length).toFixed(2)},ease:"none",immediateRender:false,onUpdate:()=>{el.textContent=[...tx].slice(0,Math.round(o.n)).join("");}},${(t0 + 1.0).toFixed(3)});}`; if (sub) js += `tl.fromTo("#${ctx.id}-sub",{opacity:0},{opacity:1,duration:0.35,immediateRender:false},${(t0 + 1.9).toFixed(3)});`; }
    return { html, js, bottom: 1190 };
  },
  parse: beat => ({ props: { asset: (beat.assets || [])[0]?.id, tag: beat.tag || "SPECIMEN", title: (beat.on_screen || [])[0] || "", sub: (beat.on_screen || [])[1] || "" }, headline: [] }),
};
