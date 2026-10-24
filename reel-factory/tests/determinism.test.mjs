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
test("timing: whole 2 s boil cycles, scenes contiguous, transitions end where the next speech starts", async () => {
  const { timing } = await import("../src/compose.mjs"); const { rows, total } = timing(p); assert.equal(total % 2, 0);
  rows.forEach((r, i) => { assert.ok(Math.abs(r.end - (rows[i + 1]?.start ?? total)) < 0.002, "gap after scene " + (i + 1)); assert.ok(r.dur > 0 && r.speechEnd < r.end); });
});
test("stills are byte-identical across two renders, and the loop frame equals frame 0", async () => {
  const a = tmp("e"), b = tmp("f"); const m = await comp(p, a); await comp(p, b);
  const times = ["0.3", "5.6", "14.5"], sa = snap(a, times), sb = snap(b, times);
  for (const t of times) assert.equal(sha(sa[t]), sha(sb[t]), "still at " + t);
  const loop = snap(a, ["0", String(m.total_seconds)]); assert.equal(sha(loop["0"]), sha(loop[String(m.total_seconds)]), "frame 0 vs frame TOTAL");
});
test("golden stills: every component's demo still matches its saved golden (same Chrome build)", async () => {
  const { registry } = await import("../components/index.mjs");
  for (const [file, doc] of [["components-demo.json", false], ["components-demo-doc.json", true]]) {
    const names = Object.keys(registry).filter(n => (registry[n].styles?.[0] === "documentary") === doc), p2 = plan(file), d = tmp("g"), m = await comp(p2, d), times = m.scenes.map(r => String(+(r.start + 2.4).toFixed(1))), shots = snap(d, times);
    names.forEach((n, i) => assert.equal(sha(shots[times[i]]), sha(path.join(RF, "tests/golden/stills", n + ".png")), "golden still for " + n));
  }
});
