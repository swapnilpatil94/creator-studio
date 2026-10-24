// Torn-paper outline from a seeded generator: returns a CSS polygon() in px for a w x h box. Shared by the strip and its hard-offset shadow.
import { rng } from "./rng.mjs";
export function torn(seed, w, h, { amp = 7, step = 26, rough = 0.5 } = {}) {
  const r = rng("torn:" + seed), pts = [], j = () => (r() * 2 - 1) * amp * (0.35 + rough), inset = a => Math.max(0, a * 0.6 + amp * 0.4);
  const edge = (x0, y0, x1, y1, nx, ny) => { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step)); for (let i = 0; i < n; i++) { const t = i / n, d = inset(Math.abs(j())); pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]); } };
  edge(0, 0, w, 0, 0, 1); edge(w, 0, w, h, -1, 0); edge(w, h, 0, h, 0, -1); edge(0, h, 0, 0, 1, 0);
  return "polygon(" + pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",") + ")";
}
