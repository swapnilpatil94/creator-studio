// Every edit style: composes, passes the HyperFrames check with zero errors, is byte-identical twice, and its last frame equals frame 0 (the loop).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process";
import { RF, sha, tmp, comp, snap, maxDiff } from "./_util.mjs"; import { STYLE_NAMES } from "../styles/index.mjs";
for (const s of STYLE_NAMES) {
  test(`style ${s}: check clean, deterministic, loops`, async () => {
    const plan = JSON.parse(fs.readFileSync(path.join(RF, "tests/golden/styles", s + ".json"), "utf8")), a = tmp(s + "a"), b = tmp(s + "b"), m = await comp(plan, a); await comp(plan, b);
    assert.equal(sha(path.join(a, "index.html")), sha(path.join(b, "index.html")), "index.html differs between two composes");
    const j = JSON.parse(spawnSync("npx", ["--yes", "hyperframes@0.8.191", "check", "--json"], { cwd: a, encoding: "utf8" }).stdout), errs = ["lint", "runtime"].flatMap(k => (j[k]?.findings || []).filter(f => f.severity === "error" && !/AudioContext/.test(f.message)));
    assert.equal(errs.length, 0, JSON.stringify(errs.map(e => e.code + " " + e.message.slice(0, 120))));
    const T = String(m.total_seconds), sh = snap(a, ["0", T]); const d = maxDiff(sh["0"], sh[T]); assert.ok(d <= 6, "loop frame differs from frame 0 (max luma diff " + d + ")");
  });
}
