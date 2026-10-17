// End-to-end UI test of the studio in real Chromium: create film, load example, validate, preview works (sandboxed iframe), seek, screenshot.
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/tmp"; const b = await chromium.launch({ headless: true }); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const ok = (name, cond, detail = "") => { console.log((cond ? "PASS " : "FAIL ") + name + (detail ? " — " + detail : "")); if (!cond) process.exitCode = 1; };
await p.goto("http://127.0.0.1:4180"); await p.waitForSelector("#proj");
p.on("dialog", d => d.accept("e2e film")); await p.click("#newBtn"); await p.waitForFunction(() => document.querySelector("#proj").selectedOptions[0]?.text === "e2e film");
ok("new film created", true);
await p.selectOption("#exLoad", "abhimanyu-chakravyuha"); await p.waitForFunction(() => /aligned timing/.test(document.querySelector("#narrInfo").innerText), null, { timeout: 15000 }); ok("example loaded with aligned narration", true, await p.innerText("#narrInfo"));
await p.click("#validate"); await p.waitForFunction(() => /Usable|Not usable/.test(document.querySelector("#valOut").innerText), null, { timeout: 90000 }); const val = await p.innerText("#valOut"); ok("validation reports usable", /Usable/.test(val), val.split("\n")[0]);
await p.waitForFunction(() => ready === true, null, { timeout: 15000 }).catch(() => { }); const ready = await p.evaluate(() => ready); ok("sandboxed preview connected (postMessage handshake)", ready === true);
await p.evaluate(() => seek(26.5)); await p.waitForTimeout(500); await p.locator(".phone").screenshot({ path: out + "/e2e-preview-26s.png" });
await p.evaluate(() => seek(2.0)); await p.waitForTimeout(500); await p.locator(".phone").screenshot({ path: out + "/e2e-preview-2s.png" });
const label = await p.innerText("#tlabel"); ok("scrubber updates time label", /2\.0 \/ 34\.4/.test(label), label);
ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
await b.close();
