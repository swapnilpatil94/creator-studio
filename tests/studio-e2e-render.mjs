// Paste-and-render e2e: a deliberately sloppy third-party-style scene + real narration -> finished film via the studio UI.
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs"; import fs from "node:fs";
const sceneFile = process.argv[2], out = process.argv[3]; const html = fs.readFileSync(sceneFile, "utf8");
const b = await chromium.launch({ headless: true }); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } }); const errs = []; p.on("pageerror", e => errs.push(e.message));
const ok = (n, c, d = "") => { console.log((c ? "PASS " : "FAIL ") + n + (d ? " — " + d : "")); if (!c) process.exitCode = 1; };
await p.goto("http://127.0.0.1:4180"); p.on("dialog", d => d.accept("paste test")); await p.click("#newBtn"); await p.waitForFunction(() => document.querySelector("#proj").selectedOptions[0]?.text === "paste test");
await p.selectOption("#exLoad", "abhimanyu-chakravyuha"); await p.waitForFunction(() => /aligned timing/.test(document.querySelector("#narrInfo").innerText), null, { timeout: 15000 });
await p.evaluate(h => { document.getElementById("scene").value = h; document.getElementById("scene").dataset.dirty = 1; document.getElementById("capInScene").checked = false; }, html);
await p.click("#validate"); await p.waitForFunction(() => /Usable|Not usable/.test(document.querySelector("#valOut").innerText), null, { timeout: 90000 }); const val = await p.innerText("#valOut"); ok("pasted sloppy scene validates as usable (shim repairs)", /Usable/.test(val), val.replace(/\n/g, " | ").slice(0, 260));
await p.click("#render"); const t0 = Date.now(); await p.waitForFunction(() => /render (done|failed|cancelled)/.test(document.querySelector("#jobState").innerText), null, { timeout: 900000 }); const state = await p.innerText("#jobState"); ok("render job finished", /done/.test(state), state + " in " + ((Date.now() - t0) / 1000).toFixed(0) + "s");
console.log("stages:", await p.innerText("#stages")); const log = await p.innerText("#log"); console.log(log.split("\n").filter(l => /scene|timeline|violations|repair|applied|PASS|FAIL|LUFS|margin/.test(l)).slice(0, 30).join("\n"));
await p.waitForTimeout(1500); const res = await p.innerText("#result"); ok("QA report shown in UI with all checks passing", /✓/.test(res) && !/✗/.test(res), (res.match(/✓/g) || []).length + " pass / " + (res.match(/✗/g) || []).length + " fail");
const vurl = await p.evaluate(() => INFO.outputs.master && INFO.outputs.master.url); ok("master video available for download", !!vurl, vurl);
const id = await p.evaluate(() => P); fs.writeFileSync(out + "/pasted-id.txt", id); ok("no page errors", errs.length === 0, errs.slice(0, 2).join("|")); await b.close();
