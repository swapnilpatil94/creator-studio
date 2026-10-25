import { piece, paper, tape, enter, esc, seedRot } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
// Two taped photo cards; the left one (the one you picked) trades places with the right one (the one you were handed) while the label says what happened.
export default {
  name: "SwapDemo", archetypes: ["twist", "evidence_reveal", "comparison", "cause_effect"], slot: "full", styles: ["specimen"],
  when_to_use: "A swap: two pictures trade places (what you chose vs what you got). Placed by the smart picker, never by the Director.",
  schema: { type: "object", properties: { a: { type: "string" }, b: { type: "string" }, title: { type: "string", maxLength: 40 } }, required: ["a", "b"] },
  demo: { archetype: "twist", component: "SwapDemo", on_screen: ["चुना और मिला"], assets: [{ id: "lotus", subject: "a", reuse: true }, { id: "flame", subject: "b", reuse: true }] }, defaultY: 300,
  async render(ctx) {
    const { a, b, title = "" } = ctx.props, p = ctx.theme.palette, sk = ctx.style?.skin || { mount: "#D9CDB4", label: "#EDE3CF", labelInk: "#1A1511", tag: p.red }, t0 = ctx.first ? 0 : ctx.t0, W = 400, H = 520, y = 330, xa = 70, xb = 610;
    const fit = await fitSize(title, { family: "Mukta", weight: 800, start: 64, min: 40, maxW: 800 }); let html = "", js = "";
    for (const [k, [id, asset, x, tag]] of [["a", a, xa, "FILE A"], ["b", b, xb, "FILE B"]].entries()) {
      html += piece(ctx, { id: "m" + id, x, y, w: W, h: H, z: 5 + k, boil: 0.6, inner: paper(ctx.id + id, W, H, sk.mount, { amp: 6, shadow: ctx.theme.shadow }) + `<div class="tx" style="left:26px;top:20px;font:700 26px 'IBM Plex Mono';letter-spacing:.2em;color:${sk.tag}">${tag}</div>` })
        + piece(ctx, { id: "i" + id, x: x + 35, y: y + 66, w: 330, h: 400, z: 6 + k, boil: 1, inner: `<img src="${ctx.assetUrl(asset)}" width="330" height="330" style="display:block;margin-top:35px;filter:url(#cutout)">` })
        + tape(ctx, "t" + id, x + 120, y - 24, k ? 7 : -8, 170);
      const rot = seedRot(ctx.id + id, 3);
      js += enter(ctx, `#${ctx.id}-m${id}`, { y: 80, rotation: rot + 6 }, { y: 0, rotation: rot }, { dur: 0.4, delay: k * 0.12 }) + enter(ctx, `#${ctx.id}-i${id}`, { y: 80, rotation: rot + 6 }, { y: 0, rotation: rot }, { dur: 0.4, delay: k * 0.12 }) + enter(ctx, `#${ctx.id}-t${id}`, { y: -60 }, { y: 0 }, { dur: 0.2, delay: 0.3 });
    }
    // the swap: left card arcs up and right, right card arcs down and left; the tape stays behind (it is torn off)
    const s = t0 + 1.1, dx = xb - xa;
    for (const [id, dir, up] of [["a", 1, -110], ["b", -1, 110]]) for (const part of ["m", "i"]) { const sel = `#${ctx.id}-${part}${id}`;
      js += `tl.to(${JSON.stringify(sel)},{x:${dir * dx},duration:0.7,ease:"power2.inOut",immediateRender:false},${s.toFixed(3)});tl.to(${JSON.stringify(sel)},{y:${up},duration:0.35,ease:"sine.out",immediateRender:false},${s.toFixed(3)});tl.to(${JSON.stringify(sel)},{y:0,duration:0.35,ease:"sine.in",immediateRender:false},${(s + 0.35).toFixed(3)});`; }
    for (const id of ["a", "b"]) js += `tl.to("#${ctx.id}-t${id}",{y:-90,opacity:0,duration:0.2,immediateRender:false},${(s - 0.1).toFixed(3)});`;
    html += piece(ctx, { id: "stamp", x: 270, y: y + 190, w: 540, h: 140, z: 12, boil: 0.5, inner: `<div style="width:540px;height:140px;border:10px solid ${p.red};color:${p.red};background:rgba(15,13,11,.78);font:900 92px/120px 'Anton','Mukta';letter-spacing:.12em;text-align:center">SWAPPED</div>` });
    js += `tl.fromTo("#${ctx.id}-stamp",{opacity:0,scale:2.2,rotation:-14},{opacity:1,scale:1,rotation:-9,duration:0.22,ease:"power4.in",immediateRender:false},${(s + 0.75).toFixed(3)});`;
    if (title) html += piece(ctx, { id: "label", x: 120, y: 930, w: 840, h: 190, z: 8, boil: 0.8, inner: paper(ctx.id + "lb", 840, 190, sk.label, { amp: 4, shadow: ctx.theme.shadow }) + `<div class="tx" style="left:34px;top:30px;width:780px;white-space:normal;font:800 ${fit.size}px/1.15 'Mukta';color:${sk.labelInk}">${esc(title)}</div>` }), js += enter(ctx, `#${ctx.id}-label`, { y: 90, rotation: 4 }, { y: 0, rotation: -1.2 }, { dur: 0.4, delay: 0.5 });
    return { html, js, bottom: 1120, impacts: ctx.first ? [] : [+(s + 0.75).toFixed(3)] };
  },
  parse: beat => ({ props: { a: (beat.assets || [])[0]?.id, b: (beat.assets || [])[1]?.id, title: (beat.on_screen || [])[0] || "" }, headline: [] }),
};
