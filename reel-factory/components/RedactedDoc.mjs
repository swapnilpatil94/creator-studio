import { piece, enter, f, esc } from "./_kit.mjs"; import { rng } from "../src/lib/rng.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "RedactedDoc", archetypes: ["evidence_reveal", "twist", "quote"], slot: "full", styles: ["desktop", "spotlight", "scrapbook"],
  when_to_use: "A classified-looking document: filler lines are blacked out, then black bars wipe away one by one to reveal the key lines. Up to 3 reveal lines.",
  schema: { type: "object", properties: { lines: { type: "array", items: { type: "string", maxLength: 28 }, maxItems: 3 } }, required: ["lines"] },
  demo: { archetype: "evidence_reveal", component: "RedactedDoc", on_screen: ["नाम: अज्ञात", "मृत्यु: 1200 वर्ष पहले", "कारण: ???"] },
  defaultY: 250,
  async render(ctx) {
    const lines = ctx.props.lines, y = ctx.y0 ?? 250, w = 900, h = 1000, t0 = ctx.first ? 0 : ctx.t0, r = rng(ctx.id + "rd"); let body = "", js = "", yy = 150;
    body += `<div class="tx" style="left:60px;top:40px;font:700 64px/1 ${f(ctx, "headline")};color:#222;letter-spacing:.12em">CONFIDENTIAL · FILE 117</div><div style="position:absolute;left:60px;right:60px;top:118px;height:6px;background:#222"></div>`;
    for (let k = 0; k < 4; k++) { body += `<div style="position:absolute;left:60px;top:${yy}px;width:${Math.round(380 + r() * 420)}px;height:34px;background:#1a1a1a"></div>`; yy += 56; }
    const fits = []; for (const [k, t] of lines.entries()) { const fit = await fitSize(t, { family: "Mukta", weight: 800, start: 68, min: 40, maxW: 780 }); fits.push(fit);
      body += `<div class="tx" style="left:60px;top:${yy}px;font:800 ${fit.size}px/1.3 'Mukta';color:${k === lines.length - 1 ? "#a3201a" : "#1a1a1a"}">${esc(t)}</div><div id="${ctx.id}-bar${k}" style="position:absolute;left:52px;top:${yy + 4}px;width:${w - 104}px;height:${Math.round(fit.size * 1.15)}px;background:#0b0b0b;transform-origin:right;transform:scaleX(${ctx.first ? 0 : 1})"></div>`;
      js += ctx.first ? "" : `tl.fromTo("#${ctx.id}-bar${k}",{scaleX:1},{scaleX:0,duration:0.4,ease:"power3.inOut",immediateRender:false},${(t0 + 0.9 + k * 0.7).toFixed(3)});`; yy += Math.round(fit.size * 1.5); }
    for (let k = 0; k < 3; k++) { body += `<div style="position:absolute;left:60px;top:${yy}px;width:${Math.round(300 + r() * 520)}px;height:34px;background:#1a1a1a"></div>`; yy += 56; }
    const html = piece(ctx, { id: "rd", x: 90, y, w, h, z: 6, boil: 0.5, inner: `<div style="position:absolute;inset:0;background:#efe6cf;border:4px solid #111;box-shadow:14px 16px 0 ${ctx.theme.shadow};transform:rotate(-1deg)">${body}</div>` });
    return { html, js: enter(ctx, `#${ctx.id}-rd`, { y: 120, rotation: 5 }, { y: 0, rotation: 0 }, { dur: 0.45, ease: "back.out(1.4)" }) + js, bottom: y + h };
  },
  parse: beat => ({ props: { lines: (beat.on_screen || []).slice(0, 3) }, headline: [] }),
};
