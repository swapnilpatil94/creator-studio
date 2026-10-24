// Unit outlines (star-shaped, sampled by angle) used for match-cut iris morphs and the ShapeHero component.
const TAU = Math.PI * 2, NP = 72;
const F = {
  circle: () => 1,
  moon: a => 1 - 0.62 * Math.exp(-Math.pow(Math.atan2(Math.sin(a - 0.5), Math.cos(a - 0.5)), 2) / 0.28),
  eye: a => 1 / Math.sqrt(Math.pow(Math.cos(a), 2) + Math.pow(Math.sin(a) / 0.42, 2)),
  drop: a => 0.62 + 0.38 * Math.pow(Math.max(0, -Math.sin(a)), 3),
  diamond: a => 1 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))),
  heart: a => { const x = 16 * Math.pow(Math.sin(a), 3), y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); return 0.062 * Math.hypot(x, y); },
  coin: a => 1 - 0.06 * (Math.cos(a * 24) > 0.8 ? 1 : 0),
};
export const SHAPE_NAMES = Object.keys(F);
export const shapePoints = name => Array.from({ length: NP }, (_, i) => { const a = (i / NP) * TAU - Math.PI / 2, r = (F[name] || F.circle)(a + Math.PI / 2 * 0); return [+(Math.cos(a) * r).toFixed(4), +(Math.sin(a) * r).toFixed(4)]; });
export const allShapes = () => Object.fromEntries(SHAPE_NAMES.map(n => [n, shapePoints(n)]));
