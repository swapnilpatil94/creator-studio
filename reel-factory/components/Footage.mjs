import { piece, f, esc } from "./_kit.mjs";
export default {
  name: "Footage", archetypes: ["hook", "place", "character_intro", "evidence_reveal", "consequence_today", "twist"], slot: "full", styles: ["documentary"],
  when_to_use: "A full-bleed graded photographic plate with a slow camera move, a small kicker (place/date) and an honest label: ILLUSTRATIVE RECONSTRUCTION for generated images, ARCHIVE only for verified real material. Optional amber highlight box on the exact thing being discussed.",
  schema: { type: "object", properties: { plate: { type: "string" }, kicker: { type: "string", maxLength: 28 }, label: { enum: ["illustrative", "archive"] }, highlight: { type: "object" }, move: { enum: ["in", "out", "left", "right"] } }, required: ["plate"] },
  demo: { archetype: "place", component: "Footage", on_screen: ["असम · 19वीं सदी"], assets: [{ id: "c_assam_tea", subject: "tea hills", reuse: true }] },
  defaultY: 0,
  async render(ctx) {
    const { plate, kicker = "", label = "illustrative", highlight, move = "in" } = ctx.props, p = ctx.theme.palette, t0 = ctx.first ? 0 : ctx.t0, d = ctx.seconds + 0.9;
    const mv = { in: [1.04, 1.16, 0, 0], out: [1.16, 1.04, 0, 0], left: [1.1, 1.14, 40, -40], right: [1.1, 1.14, -40, 40] }[move];
    let inner = `<img id="${ctx.id}-img" src="${ctx.assetUrl(plate)}" width="1080" height="1920" style="position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover;transform-origin:50% 55%"><div style="position:absolute;left:0;top:0;width:1080px;height:1920px;background:linear-gradient(180deg,rgba(18,20,22,.7) 0,rgba(18,20,22,0) 26%,rgba(18,20,22,0) 52%,rgba(18,20,22,.82) 100%)"></div>`;
    const lab = label === "archive" ? "ARCHIVE" : "ILLUSTRATIVE RECONSTRUCTION", col = label === "archive" ? (p.amber||p.saffron) : p.ivory;
    inner += `<div class="tx" style="left:64px;top:176px;font:500 29px 'IBM Plex Mono';letter-spacing:.12em;color:${col};opacity:.95;text-shadow:0 2px 8px rgba(0,0,0,.8)">${lab}</div>`;
    if (kicker) inner += `<div class="tx" style="left:64px;top:222px;font:800 56px/1.2 'Mukta';color:${p.ivory};padding-left:20px;border-left:6px solid ${(p.amber||p.saffron)};text-shadow:0 2px 14px rgba(0,0,0,.85)">${esc(kicker)}</div>`;
    let js = (ctx.first ? `tl.set("#${ctx.id}-pl",{opacity:1},0);` : `tl.fromTo("#${ctx.id}-pl",{opacity:0},{opacity:1,duration:0.4,ease:"power1.out",immediateRender:false},${t0.toFixed(3)});`) + `tl.fromTo("#${ctx.id}-img",{scale:${mv[0]},x:${mv[2]}},{scale:${mv[1]},x:${mv[3]},duration:${d.toFixed(3)},ease:"none",immediateRender:false},${t0.toFixed(3)});`;
    if (highlight) { const h = highlight, L = 2 * (h.w + h.h); inner += `<svg style="position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:visible"><rect id="${ctx.id}-hl" x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="10" fill="none" stroke="${(p.amber||p.saffron)}" stroke-width="6" stroke-dasharray="${L}" stroke-dashoffset="${ctx.first ? 0 : L}"/></svg>` + (h.label ? `<div id="${ctx.id}-hlt" class="tx" style="left:${h.x}px;top:${h.y - 62}px;padding:6px 18px;background:${(p.amber||p.saffron)};color:${p.night};font:800 36px/1.3 'Mukta';opacity:${ctx.first ? 1 : 0}">${esc(h.label)}</div>` : "");
      if (!ctx.first) js += `tl.fromTo("#${ctx.id}-hl",{strokeDashoffset:${L}},{strokeDashoffset:0,duration:0.7,ease:"power2.inOut",immediateRender:false},${(t0 + Math.max(1.0, ctx.seconds * 0.4)).toFixed(3)});` + (h.label ? `tl.fromTo("#${ctx.id}-hlt",{opacity:0,y:10},{opacity:1,y:0,duration:0.3,immediateRender:false},${(t0 + Math.max(1.0, ctx.seconds * 0.4) + 0.5).toFixed(3)});` : ""); }
    return { html: piece(ctx, { id: "pl", x: 0, y: 0, w: 1080, h: 1920, z: 2, boil: 0, inner }), js, bottom: 1250 };
  },
  parse: beat => ({ props: { plate: beat.plate || (beat.assets || [])[0]?.id, kicker: (beat.on_screen || [])[0] || "", label: beat.label || "illustrative", highlight: beat.highlight, move: beat.move || "in" }, headline: [] }),
};
