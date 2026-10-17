#!/usr/bin/env node
// Code-drawn source images (no art needed): Canvas 2D drawings rasterised in headless Chromium, ink on white, ready for sample.mjs.
// Any raster works as a stipple source: symbols, diagrams, maps, temples, Devanagari text. usage: node engine/stipple/synth.mjs <outDir>
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs"; import fs from "node:fs"; import path from "node:path";
const out = path.resolve(process.argv[2] || "stories/stipple-proof/assets/synth"); fs.mkdirSync(out, { recursive: true });
const W = 1000, H = 1500, DRAW = {
  yantra: `c.lineWidth=7;c.strokeStyle='#111';c.fillStyle='#111';const cx=500,cy=750;
    for(let r of [120,200,330,420]){c.beginPath();c.arc(cx,cy,r,0,6.2832);c.stroke();}
    for(let k=0;k<16;k++){c.save();c.translate(cx,cy);c.rotate(k*Math.PI/8);c.beginPath();c.ellipse(0,-265,34,78,0,0,6.2832);c.stroke();c.restore();}
    for(let k=0;k<8;k++){c.save();c.translate(cx,cy);c.rotate(k*Math.PI/4);c.beginPath();c.ellipse(0,-165,28,52,0,0,6.2832);c.fill();c.restore();}
    const tri=(s,up)=>{c.beginPath();for(let i=0;i<3;i++){const a=(up?-90:90)*Math.PI/180+i*2.0944;c.lineTo(cx+Math.cos(a)*s,cy+Math.sin(a)*s);}c.closePath();c.stroke();};tri(170,1);tri(170,0);tri(115,1);tri(115,0);
    c.strokeRect(cx-470,cy-470,940,940);c.beginPath();c.arc(cx,cy,26,0,6.2832);c.fill();`,
  temple: `c.fillStyle='#111';c.strokeStyle='#111';c.lineWidth=5;const bx=500;let y=1180;c.fillRect(120,1180,760,40);c.fillRect(170,1220,660,36);
    const tiers=[[560,150],[500,130],[440,118],[380,106],[320,96],[260,86],[200,76],[150,66]];
    for(const [w,h] of tiers){c.fillRect(bx-w/2,y-h,w,h);c.fillStyle='#fff';for(let k=0;k<Math.floor(w/70);k++){c.fillRect(bx-w/2+22+k*70,y-h*0.7,26,h*0.42);}c.fillStyle='#111';c.fillRect(bx-w/2-12,y-h-9,w+24,14);y-=h+9;}
    c.beginPath();c.arc(bx,y-34,34,0,6.2832);c.fill();c.fillRect(bx-3,y-170,6,120);c.beginPath();c.moveTo(bx,y-190);c.lineTo(bx+22,y-150);c.lineTo(bx-22,y-150);c.fill();
    c.beginPath();c.arc(bx,330,230,0,6.2832);c.lineWidth=6;c.setLineDash([2,14]);c.stroke();`,
  rings: `c.strokeStyle='#111';c.lineCap='round';const cx=500,cy=750;for(let i=0;i<7;i++){const r=110+i*58;c.lineWidth=14-i;for(let k=0;k<6;k++){const a0=(k/6)*6.2832+i*0.5+0.12,a1=a0+6.2832/6-0.28;c.beginPath();c.arc(cx,cy,r,a0,a1);c.stroke();}}
    c.fillStyle='#111';c.beginPath();c.arc(cx,cy,34,0,6.2832);c.fill();c.lineWidth=5;c.beginPath();c.arc(cx,cy,64,0,6.2832);c.stroke();`,
  title: `c.fillStyle='#111';c.textAlign='center';c.textBaseline='middle';c.font="900 300px 'Kohinoor Devanagari','Devanagari Sangam MN',sans-serif";c.fillText('महा',500,540);c.fillText('भारत',500,860);
    c.fillRect(220,1080,560,12);c.font="900 120px 'Kohinoor Devanagari','Devanagari Sangam MN',sans-serif";c.fillText('एक कथा',500,1230);`,
  tree: `c.fillStyle='#111';c.strokeStyle='#111';c.lineWidth=7;c.textAlign='center';c.textBaseline='middle';const N=[[500,230,'शांतनु'],[290,520,'भीष्म'],[710,520,'सत्यवती'],[260,830,'धृतराष्ट्र'],[500,830,'पांडु'],[740,830,'विदुर'],[190,1160,'दुर्योधन'],[420,1160,'युधिष्ठिर'],[640,1160,'अर्जुन'],[850,1160,'भीम']],E=[[0,1],[0,2],[2,3],[2,4],[2,5],[3,6],[4,7],[4,8],[4,9]];
    for(const [a,b] of E){c.beginPath();c.moveTo(N[a][0],N[a][1]+40);c.bezierCurveTo(N[a][0],N[a][1]+160,N[b][0],N[b][1]-160,N[b][0],N[b][1]-40);c.stroke();}
    for(const [x,y,t] of N){c.beginPath();c.arc(x,y,44,0,6.2832);c.fill();}`,
  lotus: `c.fillStyle='#111';c.strokeStyle='#111';const cx=500,cy=900;for(let ring=0;ring<4;ring++){const n=8+ring*2,len=360-ring*55,wd=90-ring*10;for(let k=0;k<n;k++){const a=-Math.PI/2+(k-(n-1)/2)*(1.5/ (n-1))*2.0;c.save();c.translate(cx,cy);c.rotate(a);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(wd,-len*0.35,wd*0.7,-len*0.85,0,-len);c.bezierCurveTo(-wd*0.7,-len*0.85,-wd,-len*0.35,0,0);c.globalAlpha=ring%2?0.9:0.55;c.fill();c.globalAlpha=1;c.lineWidth=5;c.stroke();c.restore();}}
    c.beginPath();c.arc(cx,cy,48,0,6.2832);c.fill();c.lineWidth=6;c.beginPath();c.moveTo(cx,cy+40);c.bezierCurveTo(cx-30,1200,cx+40,1300,cx,1450);c.stroke();`
};
const b = await chromium.launch({ headless: true }), p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const [name, code] of Object.entries(DRAW)) { await p.setContent(`<body style="margin:0;background:#fff"><canvas id=k width=${W} height=${H}></canvas></body>`); await p.evaluate(code => { const c = document.getElementById("k").getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, 1000, 1500); new Function("c", code)(c); }, code); await (await p.$("#k")).screenshot({ path: path.join(out, name + ".png") }); console.log("drew", name); }
await b.close();
