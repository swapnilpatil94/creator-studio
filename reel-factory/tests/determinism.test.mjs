// Engineering rule 1: the same inputs give byte-identical output. Also: the loop frame equals frame 0, and the camera is a pure function.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
import { RF, sha, tmp, plan, comp, snap } from "./_util.mjs";
const p = plan("pothi-8beat.json");
test("compose is byte-identical twice (html, manifest)", async () => {
  const a = tmp("a"), b = tmp("b"); await comp(p, a); await comp(p, b);
  for (const f of ["index.html", "compose.json"]) assert.equal(sha(path.join(a, f)), sha(path.join(b, f)), f);
  for (const f of fs.readdirSync(path.join(a, "assets/cutouts"))) assert.equal(sha(path.join(a, "assets/cutouts", f)), sha(path.join(b, "assets/cutouts", f)));
});
test("no Math.random / Date / wall clock in generated page or runtime", async () => {
  const d = tmp("c"); await comp(p, d); const html = fs.readFileSync(path.join(d, "index.html"), "utf8");
  assert.ok(!/Math\.random|Date\.now|new Date|performance\.now|setTimeout|setInterval|repeat\s*:\s*-1/.test(html.replace(/gsap\.min\.js/g, "")));
});
test("camera loop: camAt(TOTAL) equals camAt(0); moves are continuous", async () => {
  const d = tmp("d"); const m = await comp(p, d); const html = fs.readFileSync(path.join(d, "index.html"), "utf8");
  const cfg = JSON.parse(/window\.RF=(\{.*?\});<\/script>/s.exec(html)[1]), rt = fs.readFileSync(path.join(RF, "src/runtime/runtime.js"), "utf8");
  const ctx = { window: { RF: cfg }, document: { getElementById: () => null, querySelectorAll: () => [] }, Math }; vm.createContext(ctx); vm.runInContext(rt, ctx);
  const cam = ctx.window.RF.camAt, c0 = cam(0), cT = cam(cfg.TOTAL); for (const k of ["x", "y", "s", "r"]) assert.ok(Math.abs(c0[k] - cT[k]) < 1e-9, k);
  let prev = cam(0); for (let t = 1 / 30; t < cfg.TOTAL; t += 1 / 30) { const c = cam(t); assert.ok(Math.hypot(c.x - prev.x, c.y - prev.y) < 380, "jump at " + t.toFixed(2)); prev = c; }
  assert.equal(cfg.TOTAL % 2, 0, "whole boil cycles");
});
test("stills are byte-identical across two renders, and the loop frame equals frame 0", async () => {
  const a = tmp("e"), b = tmp("f"); const m = await comp(p, a); await comp(p, b);
  const times = ["0.3", "5.6", "14.5"], sa = snap(a, times), sb = snap(b, times);
  for (const t of times) assert.equal(sha(sa[t]), sha(sb[t]), "still at " + t);
  const loop = snap(a, ["0", String(m.total_seconds)]); assert.equal(sha(loop["0"]), sha(loop[String(m.total_seconds)]), "frame 0 vs frame TOTAL");
});
test("golden stills: every component's demo still matches its saved golden (same Chrome build)", async () => {
  const { registry } = await import("../components/index.mjs"), names = Object.keys(registry), p2 = plan("components-demo.json"), d = tmp("g"), m = await comp(p2, d), times = m.stations.map(s => String(+(s.start + 2.4).toFixed(1))), shots = snap(d, times);
  names.forEach((n, i) => assert.equal(sha(shots[times[i]]), sha(path.join(RF, "tests/golden/stills", n + ".png")), "golden still for " + n));
});
