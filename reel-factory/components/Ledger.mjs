import { piece, paper, enter, esc } from "./_kit.mjs"; import { fitSize } from "../src/lib/measure.mjs";
// An accounts ledger: each clause of the narration is written in as a line, then a red stamp closes the account (a boon, a curse, a debt, a price).
export default {
  name: "Ledger", archetypes: ["cause_effect", "twist", "evidence_reveal", "process_steps"], slot: "full", styles: ["specimen"],
  when_to_use: "Cause and cost as accounts: 2 to 4 ruled lines written in one by one, then a stamp. Placed by the smart picker for boons, curses, prices and debts.",
  schema: { type: "object", properties: { lines: { type: "array", maxItems: 4, items: { type: "string", maxLength: 40 } }, stamp: { type: "string", maxLength: 10 } }, required: ["lines"] },
  demo: { archetype: "cause_effect", component: "Ledger", on_screen: ["वर मिला", "शर्त रखी", "क़ीमत चुकाई"], stamp: "DEBT" }, defaultY: 300,
  async render(ctx) {
    const { lines, stamp = "DEBT" } = ctx.props, p = ctx.theme.palette, t0 = ctx.first ? 0 : ctx.t0, W = 880, rowH = 150, H = 150 + lines.length * rowH + 40;
    const fits = []; for (const l of lines) fits.push(await fitSize(l, { family: "Mukta", weight: 800, start: 66, min: 38, maxW: W - 250 }));
    let rows = ""; lines.forEach((l, i) => { rows += `<div style="position:absolute;left:40px;top:${150 + i * rowH}px;width:${W - 80}px;height:${rowH - 12}px;border-bottom:3px solid rgba(26,21,17,.45)"><div class="tx" style="left:0;top:24px;font:700 34px 'IBM Plex Mono';color:#8a6d2f">${String(i + 1).padStart(2, "0")}</div><div id="${ctx.id}-l${i}" class="tx" style="left:90px;top:14px;font:800 ${fits[i].size}px/${rowH - 30}px 'Mukta';color:#1A1511;opacity:${ctx.first ? 1 : 0}">${esc(l)}</div></div>`; });
    const html = piece(ctx, { id: "book", x: 100, y: 330, w: W, h: H, z: 6, boil: 0.5, inner: paper(ctx.id + "bk", W, H, "#E3D6B5", { amp: 5, shadow: ctx.theme.shadow }) + `<div style="position:absolute;left:0;top:0;width:${W}px;height:120px;background:#2B2520;clip-path:polygon(0 0,100% 0,100% 100%,0 86%)"></div><div class="tx" style="left:44px;top:34px;font:800 52px 'Teko';letter-spacing:.14em;color:#D9B97A">LEDGER</div><div class="tx" style="right:44px;top:44px;font:700 28px 'IBM Plex Mono';letter-spacing:.2em;color:#C18A45">ACCOUNT NO. ${(ctx.id.length * 37 % 90) + 10}</div>${rows}` })
      + piece(ctx, { id: "stamp", x: 520, y: 330 + H - 210, w: 420, h: 150, z: 12, boil: 0.5, inner: `<div style="width:420px;height:150px;border:12px solid ${p.red};color:${p.red};font:900 100px/126px 'Anton','Teko';letter-spacing:.14em;text-align:center;background:rgba(227,214,181,.35)">${esc(stamp)}</div>` });
    let js = enter(ctx, `#${ctx.id}-book`, { y: 90, rotation: 3 }, { y: 0, rotation: -1 }, { dur: 0.45 });
    lines.forEach((_, i) => { js += ctx.first ? "" : `tl.fromTo("#${ctx.id}-l${i}",{opacity:0,x:-30},{opacity:1,x:0,duration:0.3,ease:"power2.out",immediateRender:false},${(t0 + 0.7 + i * 0.7).toFixed(3)});`; });
    const st = t0 + 0.9 + lines.length * 0.7; js += ctx.first ? `tl.set("#${ctx.id}-stamp",{opacity:1,rotation:-9},0);` : `tl.fromTo("#${ctx.id}-stamp",{opacity:0,scale:2.4,rotation:-16},{opacity:1,scale:1,rotation:-9,duration:0.2,ease:"power4.in",immediateRender:false},${st.toFixed(3)});`;
    return { html, js, bottom: 330 + H, impacts: ctx.first ? [] : [+st.toFixed(3)] };
  },
  parse: beat => ({ props: { lines: (beat.on_screen || []).slice(0, 4), stamp: beat.stamp || "DEBT" }, headline: [] }),
};
