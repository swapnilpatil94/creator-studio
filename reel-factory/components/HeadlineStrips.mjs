import { piece, paper, enter, f, esc, SAFE, seedRot } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
export default {
  name: "HeadlineStrips", archetypes: ["hook", "date_era", "place", "twist", "consequence_today", "loop_cta"], slot: "headline",
  when_to_use: "Any beat whose main job is the big text: each line on its own torn paper strip, accent line in the accent colour. Max 3 lines, 4 words per line.",
  schema: { type: "object", properties: { lines: { type: "array", items: { type: "string", maxLength: 28 }, maxItems: 3 }, accent_line: { type: "integer", minimum: 1, maximum: 3 }, variant: { enum: ["torn", "tape", "ransom"] } }, required: ["lines"] },
  demo: { archetype: "hook", component: "HeadlineStrips", variant: "torn", on_screen: ["हिमालय की झील", "सैकड़ों कंकाल", "और एक राज़"], accent_line: 3 },
  async render(ctx) {
    const { lines, accent = 1, variant = "torn" } = ctx.props, st = ctx.sheet.strip, ink = st.ink, maxW = SAFE.x1 - SAFE.x0, pad = 28;
    let html = "", js = "", y = ctx.y0 ?? 170, i = 0;
    for (const text of lines) {
      i++; const isAcc = i === accent, fit = await fitSize(text, { family: ctx.theme.fonts.headline, weight: 700, start: 150, min: 60, maxW: maxW - pad * 2 }), w = Math.ceil(fit.width + pad * 2), h = Math.round(fit.size * 1.12 + fit.size * 0.22);
      const rot = seedRot(ctx.id + "h" + i, 2), x = SAFE.x0 + (i % 2 ? 0 : Math.max(0, (maxW - w) * 0.35)), paperC = isAcc ? st.accent_paper : st.paper, inkC = isAcc ? st.accent_ink : ink;
      const label = variant === "ransom" ? text.split(" ").map((wd, k) => `<span style="display:inline-block;padding:0 10px;margin:0 3px;background:${["#EFE2C2", "#D4A73A", "#E8892B"][(k + i) % 3]};color:#121A33;transform:rotate(${seedRot(ctx.id + wd, 3)}deg)">${esc(wd)}</span>`).join("") : esc(text);
      html += piece(ctx, { id: `s${i}`, x, y, w, h, z: 8, inner: paper(`${ctx.id}s${i}`, w, h, variant === "ransom" ? "transparent" : paperC, { amp: variant === "tape" ? 3 : 7, shadow: variant === "ransom" ? "transparent" : ctx.theme.shadow }) + `<div class="tx" style="width:${w}px;height:${h}px;padding:${Math.round(fit.size * 0.2)}px ${pad}px 0;font:700 ${fit.size}px/1.12 ${f(ctx, "headline")};color:${inkC}">${label}</div>` });
      js += enter(ctx, `#${ctx.id}-s${i}`, { x: -260 - i * 40, rotation: rot - 5 }, { x: 0, rotation: rot }, { dur: 0.45, ease: "back.out(1.5)", delay: (i - 1) * 0.12 }) + "\n";
      y += h + 14;
    }
    return { html, js, bottom: y };
  },
  parse: beat => ({ props: { lines: beat.on_screen || [], accent: beat.accent_line || 1, variant: beat.variant || "torn" }, headline: [] }),
};
