// Landscape layer: what fills the screen around the centred portrait column. Everything is a function of the timeline (no clock, no randomness):
//   top and bottom tickers (news-reel marquee), a left rail with a scrolling wall of outlined keywords + live timecode + REC dot,
//   a right rail with an evidence log (every beat adds a taped note, older ones slide up and out), a thin progress bar, panel edges and a punch-in on every cut.
import { esc } from "../components/_kit.mjs";
const clip = (t, n) => { const w = String(t || "").trim().split(/\s+/); let o = ""; for (const x of w) { if ((o ? o + " " + x : x).length > n) break; o = o ? o + " " + x : x; } return o || String(t || "").slice(0, n); };
export async function rails({ plan, rows, starts, total, theme, W, H, COL }) {
  const p = theme.palette, amber = p.amber || p.saffron || "#C18A45", ink = "#1A1511", cream = p.ivory || "#EDE3CF", red = p.red || "#B93A36", n = plan.beats.length, LW = COL.x, RX = W - COL.x, rw = COL.x;
  const brand = plan.brand || "KATHAAYA", title = plan.title_short || plan.title || brand;
  const kw = [...new Set(plan.beats.map(b => (b.emphasis_word || (b.on_screen || [])[0] || "").replace(/[।?!,.:;"]/g, "").trim()).filter(x => x && x.length >= 3 && x.length <= 14))].slice(0, 14);
  const words = kw.length >= 4 ? kw : [...kw, ...kw, "कथा", "रहस्य", "सच", "शाप"].slice(0, 8);
  let html = "", js = `tl.set(".col",{scale:${COL.s},transformOrigin:"0 0"},0);`;
  // panel backs and edges
  for (const [id, x] of [["pl", 0], ["pr", RX]]) html += `<div id="${id}" style="position:absolute;left:${x}px;top:54px;width:${rw}px;height:${H - 108}px;z-index:9;background:linear-gradient(180deg,rgba(12,10,8,.86),rgba(20,16,12,.78));${x ? "border-left" : "border-right"}:4px solid ${amber}"></div>`;
  // tickers
  const tk = txt => `<div style="display:inline-block;padding:0 40px">${esc(txt)}</div>`, tickerText = Array.from({ length: 24 }, () => tk(`${brand}  ·  ${title}  ·  ${words.slice(0, 4).join("  ·  ")}`)).join("");
  html += `<div style="position:absolute;left:0;top:0;width:${W}px;height:54px;z-index:11;background:${cream};overflow:hidden;white-space:nowrap;font:700 28px/54px 'IBM Plex Mono';letter-spacing:.14em;color:${ink}"><div id="rtk1" style="display:inline-block;will-change:transform">${tickerText}</div></div>`;
  html += `<div style="position:absolute;left:0;bottom:0;width:${W}px;height:54px;z-index:11;background:${amber};overflow:hidden;white-space:nowrap;font:800 28px/54px 'Mukta';letter-spacing:.06em;color:${ink}"><div id="rtk2" style="display:inline-block;will-change:transform">${Array.from({ length: 24 }, () => tk(words.join("   ◆   "))).join("")}</div></div>`;
  js += `tl.fromTo("#rtk1",{x:0},{x:-${Math.round(total * 80)},duration:${total},ease:"none",immediateRender:false},0);tl.fromTo("#rtk2",{x:-${Math.round(total * 80)}},{x:0,duration:${total},ease:"none",immediateRender:false},0);`;
  // left rail: REC, timecode, scrolling outlined words
  const ww = words.map(w => `<div style="height:150px;font:900 118px/150px 'Teko','Mukta';color:transparent;-webkit-text-stroke:3px ${amber};white-space:nowrap;opacity:.9">${esc(w)}</div>`).join(""), dist = Math.max(0, words.length * 150 - (H - 260));
  html += `<div id="rrec" style="position:absolute;left:30px;top:78px;z-index:12;width:22px;height:22px;border-radius:50%;background:${red}"></div><div class="tx" style="left:66px;top:70px;z-index:12;font:700 30px 'IBM Plex Mono';color:${cream};letter-spacing:.12em">REC <span id="rtc">00:00</span></div>`;
  html += `<div style="position:absolute;left:24px;top:130px;width:${rw - 40}px;height:${H - 260}px;z-index:10;overflow:hidden"><div id="rwall" style="will-change:transform">${ww}</div></div>`;
  js += `tl.fromTo("#rwall",{y:0},{y:-${dist},duration:${total},ease:"none",immediateRender:false},0);tl.fromTo("#rrec",{opacity:1},{opacity:0.15,duration:0.4,ease:"steps(1)",yoyo:true,repeat:${Math.floor(total / 0.4) - 1},immediateRender:false},0);`;
  js += `{const rc={t:0};tl.fromTo(rc,{t:0},{t:${total},duration:${total},ease:"none",immediateRender:false,onUpdate:()=>{const s=Math.floor(rc.t),e=document.getElementById("rtc");if(e)e.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}},0);}`;
  // right rail: evidence log
  const slot = 168, vis = 5, baseY = 110 + (vis - 1) * slot;
  plan.beats.forEach((b, i) => { const txt = clip(((b.on_screen || []).find(x => x && x.length >= 8)) || b.narration || "", 30), id = `rn${i}`, rot = ((i * 37) % 7) - 3;
    html += `<div id="${id}" style="position:absolute;left:${RX + 28}px;top:${baseY}px;width:${rw - 56}px;height:${slot - 22}px;z-index:10;opacity:0"><div style="position:absolute;inset:0;background:${cream};box-shadow:6px 8px 0 rgba(0,0,0,.5)"></div><div style="position:absolute;left:-6px;top:-14px;width:110px;height:30px;background:rgba(193,138,69,.85);transform:rotate(-7deg)"></div><div class="tx" style="left:18px;top:12px;font:700 22px 'IBM Plex Mono';letter-spacing:.14em;color:${red}">NOTE ${String(i + 1).padStart(2, "0")}</div><div style="position:absolute;left:18px;right:14px;top:44px;font:800 30px/1.15 'Mukta';color:${ink};white-space:normal">${esc(txt)}</div></div>`;
    const t = starts[i]; js += `tl.set("#${id}",{rotation:${rot}},0);` + (i === 0 ? `tl.set("#${id}",{opacity:1},0);` : `tl.fromTo("#${id}",{opacity:0,x:90,scale:1.12},{opacity:1,x:0,scale:1,duration:0.28,ease:"back.out(1.8)",immediateRender:false},${t.toFixed(3)});`);
    for (let j = i + 1; j < n && j - i <= vis; j++) js += `tl.to("#${id}",{y:${-slot * (j - i)},opacity:${j - i >= vis ? 0 : +(1 - 0.17 * (j - i)).toFixed(2)},duration:0.3,ease:"power2.out",immediateRender:false},${starts[j].toFixed(3)});`; });
  // progress bar and a punch-in on every cut
  html += `<div style="position:absolute;left:0;bottom:54px;width:${W}px;height:8px;z-index:11;background:rgba(0,0,0,.45)"><div id="rbar" style="height:8px;width:${W}px;background:${red};transform-origin:0 50%"></div></div>`;
  js += `tl.fromTo("#rbar",{scaleX:0},{scaleX:1,duration:${total},ease:"none",immediateRender:false},0);`;
  for (let i = 1; i < n; i++) js += `tl.fromTo(".col",{scale:${COL.s * 1.045}},{scale:${COL.s},duration:0.32,ease:"power3.out",immediateRender:false},${starts[i].toFixed(3)});`;
  return { html, js };
}
