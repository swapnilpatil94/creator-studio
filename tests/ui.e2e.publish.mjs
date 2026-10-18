#!/usr/bin/env node
// Publishes through the REAL Hub UI (what the owner would click): render carousel -> make slides public -> post carousel to Facebook + Instagram; post an FB text; publish the blog.
// usage: node tests/ui.e2e.publish.mjs carousel <item id> | fbtext <item id> | blog <labelled text file> [hero path]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), { chromium } = await import(pathToFileURL(path.join(root, "engine/node_modules/playwright/index.mjs")).href), BASE = "http://127.0.0.1:4180/hub";
const [what, arg1, arg2] = process.argv.slice(2), api = async p => (await fetch("http://127.0.0.1:4180" + p)).json(), T0 = Date.now(), log = (...a) => console.log(`[${Math.round((Date.now() - T0) / 1000)}s]`, ...a), dialogs = [];
const b = await chromium.launch({ headless: true }), page = await b.newPage({ viewport: { width: 1360, height: 1000 } }); page.on("dialog", d => { dialogs.push(d.message()); log("dialog:", d.message().replace(/\n/g, " | ").slice(0, 400)); d.accept(); }); page.on("pageerror", e => log("PAGE ERROR", e.message));
const tab = async l => { await page.locator("#nav button", { hasText: l }).first().click(); await page.waitForTimeout(1500); };
async function waitJob(label, maxMin) { const t = Date.now(); for (;;) { const j = (await api("/api/hub/jobs")).jobs[0]; if (j && j.status !== "running") { log(label, j.status); return j; } if (Date.now() - t > maxMin * 6e4) throw new Error(label + " timed out"); await new Promise(r => setTimeout(r, 4000)); } }
try {
  await page.goto(BASE); await page.waitForSelector("#nav button");
  if (what === "carousel") {
    await tab("Create"); await page.locator("#open").selectOption(arg1); await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Render carousel", exact: true }).click(); log("clicked Render carousel"); await page.waitForTimeout(3000); await waitJob("carousel render", 15);
    await page.locator("#open").selectOption(arg1); await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /Make slides public/ }).click(); await page.waitForTimeout(25000); log("public:", await page.locator("#pubres").innerText());
    for (let i = 0; i < 40; i++) { await page.getByRole("button", { name: "Check if public" }).click(); await page.waitForTimeout(3000); const t = await page.locator("#pubres").innerText(); if (/(\d+)\/\1 slides public/.test(t) && !/^0\/0/.test(t)) { log("all public:", t.slice(0, 60)); break; } log("waiting for the deploy:", t.slice(0, 60)); await page.waitForTimeout(15000); }
    await page.locator("#pfb").check(); await page.locator("#pig").check(); await page.getByRole("button", { name: /Post now/ }).click(); await page.waitForTimeout(60000); log("posted; last dialog:", (dialogs.at(-1) || "").slice(0, 700));
  } else if (what === "fbtext") {
    await tab("Create"); await page.locator("#open").selectOption(arg1); await page.waitForTimeout(1500); const ap = page.getByRole("button", { name: "I checked it: approve" }); if (await ap.isEnabled().catch(() => false)) { await ap.click(); await page.waitForTimeout(2000); }
    await page.locator("#pfb").check(); await page.getByRole("button", { name: /Post now/ }).click(); await page.waitForTimeout(25000); log("posted; last dialog:", (dialogs.at(-1) || "").slice(0, 600));
  } else if (what === "reel") {
    await tab("Plan"); const empty = page.locator(".slot.empty", { hasText: /Reel/ }).first(); await empty.click(); await page.waitForTimeout(1200);
    await page.locator("#as").selectOption("story:" + arg1); await page.getByRole("button", { name: "Schedule it" }).click(); await page.waitForTimeout(2500); log("assigned", arg1, "to the first empty Reel slot");
    await tab("Plan"); const chip = page.locator(".slot.scheduled", { hasText: /Reel/ }).first(); await chip.click(); await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /Post now/ }).click(); log("clicked Post now"); await page.waitForTimeout(270000); log("last dialog:", (dialogs.at(-1) || "").slice(0, 1200));
  } else if (what === "blog") {
    await tab("Blog"); await page.locator("#bpaste").fill(fs.readFileSync(arg1, "utf8")); if (arg2) await page.locator("#bhero").fill(arg2); await page.getByRole("button", { name: "Validate" }).click(); await page.waitForTimeout(4000); log("validate:", (await page.locator("#view").innerText()).replace(/\n/g, " ").slice(0, 700));
    await page.getByRole("button", { name: /Publish to the subdomain/ }).click(); await page.waitForTimeout(20000); log("publish dialog:", (dialogs.at(-1) || "").slice(0, 500));
  }
} catch (e) { log("TEST FAILED:", e.message); await page.screenshot({ path: "/tmp/e2e-publish-fail.png" }).catch(() => {}); process.exitCode = 1; } finally { await b.close(); }
