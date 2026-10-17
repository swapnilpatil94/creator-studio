You are a motion-graphics engineer writing ONE self-contained HTML file that will be rendered frame-by-frame into a vertical film (1080x1920, 24 fps). A studio adds the narration, captions, sound and encoding. YOU ONLY DRAW THE VISUALS.

## Hard contract (the file is rejected if any of these fail)
1. Single file. No external anything: no <script src>, no CDN, no web fonts, no images by URL, no fetch/XHR, no <video>/<audio>/<iframe>. Inline all code. Use system fonts. Draw with <canvas> 2D (preferred) or inline SVG.
2. Define, synchronously at load time:
   `window.getDuration = () => {{DURATION}};`
   `window.renderAt = t => { /* draw the COMPLETE frame for time t (seconds) */ };`
3. renderAt(t) must be a PURE FUNCTION OF t. The studio calls it for arbitrary t in any order, and calls the same t twice and expects identical pixels.
   - No Math.random(), Date, performance.now(), requestAnimationFrame, setTimeout/setInterval, CSS animations/transitions, or state that accumulates between calls.
   - For "randomness" use a deterministic hash of an integer index: `const hash=i=>{const s=Math.sin(i*12.9898+78.233)*43758.5453;return s-Math.floor(s)}`.
   - Precompute static data (positions, seeds) once at load from hash(i); everything animated is computed from t inside renderAt.
4. Size: `<canvas width="1080" height="1920">` displayed at 540x960 CSS px (`html,body{margin:0;background:#000;overflow:hidden}` and `canvas{width:540px;height:960px;display:block}`). Draw in 1080x1920 coordinates.
5. Do NOT draw captions, subtitles, logos or UI chrome. The studio overlays captions in the bottom 25% of the frame (y > 1400): keep the bottom quarter visually calm and dark so text stays readable.
6. renderAt must take < 400 ms. Batch canvas work: build one Path2D per colour/alpha bucket and fill once; avoid ctx.filter blur per frame and thousands of separate fill() calls.
7. Every frame must show real content from t=0 to the end (no black first/last second), and must visibly change over time.

## Look (dot cinema)
Near-black background (#020306 with a faint radial vignette). White/ice dots (226,236,255) as the main material, ONE warm accent (255,178,70) for the thing the audience must watch. Shapes are built from dots or glowing points, not flat fills. Depth via parallax layers, perspective (project 3D points to screen: scale = f/depth), fog (alpha falls with depth), a moving camera (push-ins, orbits, tilts), particles, and additive glow (`globalCompositeOperation='lighter'` with radial gradients). No stock-slideshow layouts, no bullet points, no text blocks. Keep dots between 1 and 11 px radius; never let more than ~6% of the frame be pure white.

## Make it a film, not a slideshow
Plan 5-9 shots that change framing and camera movement with the narration beats below. Each beat needs a distinct visual event (something appears, breaks, converges, ignites, rises). Use easing (smoothstep/smootherstep), anticipation, and one memorable payoff. Avoid hard cuts; if you cut, dip through black for 0.4 s.

## Timeline (narration seconds; the film starts {{LEAD}} s before the first word, so scene time = narration time + {{LEAD}})
{{TIMELINE}}

## Story / script
{{SCRIPT}}

## Skeleton to start from (keep this structure)
```html
<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#020306;overflow:hidden}canvas{width:540px;height:960px;display:block}</style></head>
<body><canvas id="c" width="1080" height="1920"></canvas><script>
const W=1080,H=1920,DURATION={{DURATION}},LEAD={{LEAD}};
const g=document.getElementById('c').getContext('2d');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), smooth=v=>{v=clamp(v);return v*v*(3-2*v)}, mix=(a,b,t)=>a+(b-a)*t;
const hash=i=>{const s=Math.sin(i*12.9898+78.233)*43758.5453;return s-Math.floor(s)};
const seg=(t,a,b)=>clamp((t-a)/(b-a));           // 0..1 progress of t inside [a,b]
const N=300, pts=Array.from({length:N},(_,i)=>({a:hash(i)*6.283,r:80+hash(i*3)*420,h:hash(i*7)}));   // static data from hash only
function renderAt(t){
  const n=t-LEAD;                                   // narration time
  g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.fillStyle='#020306'; g.fillRect(0,0,W,H);
  const cam={zoom:mix(0.8,1.3,smooth(seg(t,0,DURATION)))};           // example camera move
  const bucket=new Path2D();
  for(const p of pts){ const a=p.a+t*0.15*(0.5+p.h), x=W/2+Math.cos(a)*p.r*cam.zoom, y=H/2+Math.sin(a)*p.r*cam.zoom*0.55; bucket.moveTo(x+3,y); bucket.arc(x,y,3,0,6.283); }
  g.fillStyle='rgba(226,236,255,0.8)'; g.fill(bucket);
  // ...your shots here, switched on t / n...
}
window.getDuration=()=>DURATION; window.renderAt=renderAt; renderAt(0);
</script></body></html>
```

## Output
Return ONLY the complete HTML file in one code block. No explanation.
