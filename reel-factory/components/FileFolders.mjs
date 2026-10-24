import { piece, enter, f, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs"; import { torn } from "../src/lib/torn.mjs";
export default {
  name: "FileFolders", archetypes: ["character_intro", "evidence_reveal", "many_scale", "options"], slot: "full", styles: ["desktop", "scrapbook"],
  when_to_use: "Investigation desktop: 2-3 case-file folders slide in with labels, the last one is stamped CASE OPEN. Labels = names, places or years.",
  schema: { type: "object", properties: { labels: { type: "array", items: { type: "string", maxLength: 16 }, maxItems: 3 } }, required: ["labels"] },
  demo: { archetype: "character_intro", component: "FileFolders", on_screen: ["रेंजर 1942", "DNA रिपोर्ट", "रूपकुंड झील"] },
  defaultY: 330,
  async render(ctx) {
    const labels = ctx.props.labels, p = ctx.theme.palette, y = ctx.y0 ?? 330, cols = ["#d9b97a", "#c7a561", "#b8934c"]; let html = "", js = "";
    for (const [k, lab] of labels.entries()) { const fit = await fitSize(lab, { family: "Mukta", weight: 800, start: 68, min: 40, maxW: 420 }), w = 820, h = 330, poly = torn(ctx.id + "f" + k, w, h, { amp: 4 });
      html += piece(ctx, { id: `f${k}`, x: 130 + k * 30, y: y + k * 300, w, h, z: 5 + k, inner: `<div class="sh" style="width:${w}px;height:${h}px;clip-path:${poly};background:${ctx.theme.shadow};transform:translate(10px,12px)"></div><div class="pp" style="width:${w}px;height:${h}px;clip-path:${poly};background:${cols[k]}"></div><div style="position:absolute;left:30px;top:-34px;width:300px;height:60px;background:${cols[k]};border-radius:14px 14px 0 0;clip-path:polygon(0 100%,6% 0,94% 0,100% 100%)"></div><div class="tx" style="left:50px;top:100px;font:800 ${fit.size}px/1.2 'Mukta';color:#3a2810">${esc(lab)}</div><div class="tx" style="left:50px;top:200px;font:500 28px 'IBM Plex Mono';color:#6b5226;letter-spacing:.1em">CASE FILE · No.${(k + 1) * 117}</div>` });
      js += enter(ctx, `#${ctx.id}-f${k}`, { x: 900, rotation: 8 }, { x: 0, rotation: [-2, 1.5, -1][k] }, { dur: 0.45, ease: "power3.out", delay: k * 0.2 }); }
    const n = labels.length, sy = y + (n - 1) * 300 + 170;
    html += piece(ctx, { id: "fst", x: 560, y: sy, w: 460, h: 130, z: 20, boil: 0.5, inner: `<div style="width:420px;height:112px;border:10px solid ${ctx.theme.stamp};border-radius:12px;color:${ctx.theme.stamp};text-align:center;font:700 80px/92px ${f(ctx, "headline")};letter-spacing:4px;mix-blend-mode:multiply">CASE OPEN</div>` });
    js += enter(ctx, `#${ctx.id}-fst`, { scale: 3, rotation: -25 }, { scale: 1, rotation: -9 }, { dur: 0.22, ease: "power4.in", delay: n * 0.2 + 0.45 });
    return { html, js, bottom: sy + 130, impacts: ctx.first ? [] : [+(ctx.t0 + n * 0.2 + 0.67).toFixed(3)] };
  },
  parse: beat => ({ props: { labels: (beat.on_screen || []).slice(0, 3) }, headline: [] }),
};
