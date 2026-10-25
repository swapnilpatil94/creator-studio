import { piece, paper, tape, enter, esc, seedRot } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
// The recurring narrator character (theme mascot) delivers the key line from a paper note: used for the named effect and the reveal.
export default {
  name: "Narrator", archetypes: ["twist", "evidence_reveal", "character_intro", "quote"], slot: "full", styles: ["specimen"],
  when_to_use: "The theme's mascot character says one line from a note; use once per video for the named effect or the reveal. Placed by the smart picker.",
  schema: { type: "object", properties: { asset: { type: "string" }, lines: { type: "array", maxItems: 3, items: { type: "string" } } }, required: ["asset", "lines"] },
  demo: { archetype: "twist", component: "Narrator", on_screen: ["यह एक नाम है"], assets: [{ id: "lotus", subject: "a", reuse: true }] }, defaultY: 300,
  async render(ctx) {
    const { asset, lines } = ctx.props, p = ctx.theme.palette, sk = ctx.style?.skin || { label: "#EDE3CF", labelInk: "#1A1511", tag: p.red }, t0 = ctx.first ? 0 : ctx.t0, W = 880;
    const longest = lines.slice().sort((a, b) => b.length - a.length)[0] || "", fit = await fitSize(longest, { family: "Mukta", weight: 800, start: 80, min: 46, maxW: W - 80 }), lh = Math.round(fit.size * 1.32), H = lines.length * lh + 120, rot = seedRot(ctx.id, 1.5);
    const html = piece(ctx, { id: "note", x: 100, y: 330, w: W, h: H, z: 8, boil: 0.6, inner: paper(ctx.id + "nt", W, H, sk.label, { amp: 5, shadow: ctx.theme.shadow }) + `<div class="tx" style="left:28px;top:18px;font:700 26px 'IBM Plex Mono';letter-spacing:.2em;color:${sk.tag}">THE NARRATOR</div><div style="position:absolute;left:40px;right:40px;top:70px">${lines.map((l, i) => `<div style="position:absolute;left:0;right:0;top:${i * lh}px;text-align:center;white-space:nowrap;font:800 ${fit.size}px/${lh}px 'Mukta';color:${sk.labelInk}">${esc(l)}</div>`).join("")}</div>` })
      + piece(ctx, { id: "tail", x: 560, y: 330 + H - 6, w: 120, h: 90, z: 7, boil: 0.4, inner: `<div style="width:120px;height:90px;background:${sk.label};clip-path:polygon(0 0,100% 0,60% 100%)"></div>` })
      + piece(ctx, { id: "owl", x: 330, y: 330 + H + 70, w: 560, h: 560, z: 6, boil: 1, origin: "50% 100%", inner: `<img src="${ctx.assetUrl(asset)}" width="560" height="560" style="display:block;filter:url(#cutout)">` });
    let js = enter(ctx, `#${ctx.id}-owl`, { y: 340, scale: 0.8 }, { y: 0, scale: 1 }, { dur: 0.55, ease: "back.out(1.5)" }) + enter(ctx, `#${ctx.id}-note`, { scale: 0.7, rotation: rot - 6 }, { scale: 1, rotation: rot }, { dur: 0.35, ease: "back.out(2)", delay: 0.45 }) + enter(ctx, `#${ctx.id}-tail`, { scale: 0 }, { scale: 1 }, { dur: 0.2, delay: 0.7 });
    if (!ctx.first) js += `tl.to("#${ctx.id}-owl",{rotation:-3,duration:0.25,yoyo:true,repeat:3,ease:"sine.inOut",immediateRender:false},${(t0 + 1.2).toFixed(3)});`;
    return { html, js, bottom: 330 + H + 630, impacts: ctx.first ? [] : [+(t0 + 0.6).toFixed(3)] };
  },
  parse: beat => ({ props: { asset: (beat.assets || [])[0]?.id, lines: (beat.on_screen || []).slice(0, 3) }, headline: [] }),
};
