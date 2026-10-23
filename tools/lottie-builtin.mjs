#!/usr/bin/env node
// Generates the built-in Lottie stickers (valid Lottie JSON, no third-party artwork, so no licence question): engine/longform/lottie/{sparkle,ring,burst}.json
// Any extra Lottie JSON dropped into engine/longform/lottie/ becomes usable as params.sticker = "<file name>" (check the licence of what you download).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../engine/longform/lottie"); fs.mkdirSync(out, { recursive: true });
const ease = d => ({ i: { x: Array(d).fill(0.3), y: Array(d).fill(1) }, o: { x: Array(d).fill(0.7), y: Array(d).fill(0) } });
const kf = (pts, d = 1) => ({ a: 1, k: pts.map(([t, ...s], i) => i < pts.length - 1 ? { t, s, ...ease(d) } : { t, s }) });
const st = v => ({ a: 0, k: v });
const layer = (shapes, o, s, r) => ({ ddd: 0, ind: 1, ty: 4, nm: "l", sr: 1, ks: { o, r, p: st([200, 200, 0]), a: st([0, 0, 0]), s }, ao: 0, shapes, ip: 0, op: 40, st: 0, bm: 0 });
const film = l => ({ v: "5.7.0", fr: 30, ip: 0, op: 40, w: 400, h: 400, nm: "kathaaya", ddd: 0, assets: [], layers: l });
const star = (pts, or, ir) => ({ ty: "sr", sy: 1, d: 1, pt: st(pts), p: st([0, 0]), r: st(0), ir: st(ir), is: st(0), or: st(or), os: st(0), nm: "s" });
const fill = c => ({ ty: "fl", c: st(c), o: st(100), r: 1, nm: "f" });
const ring = (w, c) => [{ ty: "el", d: 1, s: st([w, w]), p: st([0, 0]), nm: "e" }, { ty: "st", c: st(c), o: st(100), w: st(10), lc: 2, lj: 2, nm: "st" }];
const disc = (w, h, c, x = 0, y = 0) => [{ ty: "el", d: 1, s: st([w, h]), p: st([x, y]), nm: "e" }, fill(c)];
const blob3 = (specs, c) => grp([...specs.map(([w, h, x, y]) => ({ ty: "el", d: 1, s: st([w, h]), p: st([x, y]), nm: "e" })), fill(c)]);
const petal = (angleDeg, dist, w, h, c) => { const rad = angleDeg * Math.PI / 180; return { ty: "gr", it: [{ ty: "el", d: 1, s: st([w, h]), p: st([0, 0]), nm: "e" }, fill(c), { ty: "tr", p: st([Math.cos(rad) * dist, Math.sin(rad) * dist]), a: st([0, 0]), s: st([100, 100]), r: st(angleDeg + 90), o: st(100), sk: st(0), sa: st(0) }], nm: "petal" }; };
const grp = it => ({ ty: "gr", it: [...it, { ty: "tr", p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0) }], nm: "g" });
const fade = kf([[0, 0], [6, 100], [30, 100], [40, 0]]);
fs.writeFileSync(path.join(out, "sparkle.json"), JSON.stringify(film([layer([grp([star(4, 95, 22), fill([1, 0.84, 0.35, 1])])], fade, kf([[0, 0, 0, 100], [12, 125, 125, 100], [22, 100, 100, 100], [40, 105, 105, 100]], 3), kf([[0, -30], [40, 60]]))])));
fs.writeFileSync(path.join(out, "ring.json"), JSON.stringify(film([layer([grp([...ring(150, [1, 0.62, 0.25, 1])])], kf([[0, 100], [32, 60], [40, 0]]), kf([[0, 20, 20, 100], [40, 140, 140, 100]], 3), st(0))])));
fs.writeFileSync(path.join(out, "burst.json"), JSON.stringify(film([layer([grp([star(8, 110, 40), fill([1, 0.55, 0.3, 1])])], fade, kf([[0, 0, 0, 100], [10, 120, 120, 100], [40, 90, 90, 100]], 3), kf([[0, 0], [40, 90]])), layer([grp([...ring(190, [1, 0.9, 0.5, 1])])], kf([[0, 100], [35, 0]]), kf([[0, 30, 30, 100], [35, 120, 120, 100]], 3), st(0))])));
// mythology-themed stickers (2026-10-22, owner: "find packages who can make it more beautiful with lottie" -- lottie-web is already the renderer, so the win is more story-appropriate shapes, not just sparkle/ring/burst)
const flick = kf([[0, 92, 92, 100], [4, 106, 106, 100], [8, 90, 90, 100], [13, 108, 108, 100], [18, 90, 90, 100], [24, 104, 104, 100], [30, 92, 92, 100], [36, 105, 105, 100], [40, 96, 96, 100]], 3);
fs.writeFileSync(path.join(out, "diya.json"), JSON.stringify(film([layer([grp(disc(190, 190, [1, 0.55, 0.15, 0.3]))], kf([[0, 0], [6, 70], [34, 70], [40, 0]]), kf([[0, 60, 60, 100], [40, 130, 130, 100]], 3), st(0)), layer([blob3([[46, 50, 0, 18], [34, 46, 0, -8], [16, 30, 0, -30]], [1, 0.4, 0.06, 1])], fade, flick, st(0)), layer([blob3([[24, 28, 0, 14], [16, 26, 0, -10], [8, 16, 0, -26]], [1, 0.82, 0.3, 1])], fade, flick, st(0))])));
const bloom = kf([[0, 0, 0, 100], [10, 60, 60, 100], [22, 100, 100, 100], [40, 102, 102, 100]], 3);
const ring6 = (dist, w, h, c, off = 0) => [0, 60, 120, 180, 240, 300].map(a => petal(a + off, dist, w, h, c));
fs.writeFileSync(path.join(out, "lotus.json"), JSON.stringify(film([layer(ring6(28, 26, 56, [0.98, 0.75, 0.82, 0.95]), fade, bloom, st(0)), layer(ring6(20, 18, 40, [1, 0.95, 0.97, 1], 30), fade, bloom, st(0)), layer([grp(disc(26, 26, [1, 0.84, 0.4, 1]))], fade, bloom, st(0))])));
fs.writeFileSync(path.join(out, "radiance.json"), JSON.stringify(film([layer([grp([star(16, 150, 50), fill([1, 0.78, 0.35, 0.55])])], fade, kf([[0, 70, 70, 100], [20, 110, 110, 100], [40, 100, 100, 100]], 3), kf([[0, 0], [40, 25]])), layer([grp(disc(70, 70, [1, 0.92, 0.6, 0.9]))], fade, kf([[0, 40, 40, 100], [40, 120, 120, 100]], 3), st(0))])));
console.log("lottie stickers written:", fs.readdirSync(out).join(", "));
const names = fs.readdirSync(out).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
fs.writeFileSync(path.join(out, "index.js"), `// generated by tools/lottie-builtin.mjs: every Lottie JSON in this folder, bundled into the film\n${names.map((n, i) => `import s${i} from "./${n}.json";`).join("\n")}\nexport default { ${names.map((n, i) => `${JSON.stringify(n)}: s${i}`).join(", ")} };\n`);
console.log("index.js:", names.join(","));
