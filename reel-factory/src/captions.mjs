// Kinetic captions: word-by-word, groups of 2-3 words, the keyword popped in the accent colour, hard kill after each group.
// Word times come from forced alignment (beat.words, P5); until then they are estimated from character counts inside the beat's speech window (marked estimated).
import { fitSize } from "./lib/measure.mjs"; import { esc } from "../components/_kit.mjs";
const len = s => [...s].length;
export function wordsFor(beat, s0) {
  if (beat.words && beat.words.length) return { words: beat.words.map(w => ({ t: w.t, s: +(s0 + w.s).toFixed(3), e: +(s0 + w.e).toFixed(3) })), estimated: false };
  const text = (beat.narration || (beat.on_screen || []).join(" ")).trim(); if (!text) return { words: [], estimated: true };
  const ws = text.split(/\s+/), total = ws.reduce((a, w) => a + len(w) + 1.5, 0), a = s0 + 0.08, b = s0 + beat.seconds - 0.08; let t = a;
  return { words: ws.map(w => { const d = (b - a) * (len(w) + 1.5) / total, o = { t: w, s: +t.toFixed(3), e: +(t + d).toFixed(3) }; t += d; return o; }), estimated: true };
}
export async function captions({ plan, starts, theme, y = 1105, size = 100 }) {
  const cc = theme.captions || null; if (cc) { y = cc.y ?? y; size = cc.size ?? size; }
  let html = "", js = "", g = 0, estimated = false; const p = theme.palette, ink = cc?.ink || p.ivory, key = cc?.key || p.saffron || p.gold, stroke = theme.board || "#000", fam = cc?.font || theme.fonts.headline, wt = cc?.weight || 700, sw = cc ? cc.stroke : null;
  for (const [i, beat] of plan.beats.entries()) {
    const { words, estimated: est } = wordsFor(beat, starts[i]); estimated = estimated || est; const emph = (beat.emphasis_word || "").replace(/[।?!,.]/g, "");
    let grp = []; const flush = async (next) => { if (!grp.length) return; const text = grp.map(w => w.t).join(" "), fit = await fitSize(text, { family: fam, weight: wt, start: size, min: 50, maxW: 900 }), s = grp[0].s, e = Math.min(grp.at(-1).e + 0.22, next ?? 1e9), id = `cap${g++}`;
      const strip = cc?.strip, spans = grp.map((w, k) => `<span id="${id}w${k}" style="color:${ink};${strip ? "padding:0 8px;border-radius:6px" : ""}">${esc(w.t)}</span>`).join(" ");
      html += `<div id="${id}" class="capg" style="top:${y}px;font:${wt} ${fit.size}px/1.2 '${fam}';${strip ? "" : sw === 0 ? "text-shadow:0 3px 18px rgba(0,0,0,.85),0 1px 3px rgba(0,0,0,.9);" : `-webkit-text-stroke:${Math.round(fit.size * 0.1)}px ${stroke};`}opacity:0">${strip ? `<div style="display:inline-block;padding:10px 30px 16px;background:#EDE3CF;border:5px solid #1A1511;box-shadow:8px 9px 0 rgba(0,0,0,.65);transform:rotate(-1deg)">${spans}</div>` : spans}</div>\n`;
      js += `tl.fromTo("#${id}",{opacity:0,y:34,scale:0.8},{opacity:1,y:0,scale:1,duration:0.14,ease:"back.out(2.2)",immediateRender:false},${s.toFixed(3)});tl.set("#${id}",{opacity:0},${e.toFixed(3)});\n`;
      grp.forEach((w, k) => { const hot = emph && w.t.replace(/[।?!,.]/g, "").includes(emph);
        if (strip) js += `tl.fromTo("#${id}w${k}",{backgroundColor:"rgba(193,138,69,0)"},{backgroundColor:"rgba(193,138,69,${hot ? 1 : 0.55})",duration:0.08,ease:"none",immediateRender:false},${w.s.toFixed(3)});`;
        else js += `tl.fromTo("#${id}w${k}",{color:${JSON.stringify(hot ? key : ink)},scale:1},{color:${JSON.stringify(key)},scale:${hot ? 1.1 : 1.04},duration:0.08,ease:"power2.out",immediateRender:false},${w.s.toFixed(3)});` + (hot ? "" : `tl.fromTo("#${id}w${k}",{color:${JSON.stringify(key)}},{color:${JSON.stringify(ink)},scale:1,duration:0.1,immediateRender:false},${Math.max(w.s + 0.1, w.e).toFixed(3)});`); });
      grp = []; };
    for (let k = 0; k < words.length; k++) { grp.push(words[k]); if (grp.length >= 3 || (/[,।?!]$/.test(words[k].t) && grp.length >= 2) || len(grp.map(w => w.t).join(" ")) > 18) await flush(words[k + 1]?.s); }
    await flush(starts[i] + beat.seconds + 0.2);
  }
  return { html, js, estimated, groups: g };
}
