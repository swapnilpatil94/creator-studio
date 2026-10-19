#!/usr/bin/env node
// Drives the REAL Hub "New video" tab like the owner: topic -> strict prompt -> paste the model's pack -> check -> make -> wait for the final video.
// usage: node tests/ui.e2e.newvideo.mjs <pack.txt> "<topic>" [short|long]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), { chromium } = await import(pathToFileURL(path.join(root, "engine/node_modules/playwright/index.mjs")).href), BASE = "http://127.0.0.1:4180/hub";
const [packFile, topic, fmt = "short"] = process.argv.slice(2), T0 = Date.now(), log = (...a) => console.log(`[${Math.round((Date.now() - T0) / 1000)}s]`, ...a), api = async p => (await fetch("http://127.0.0.1:4180" + p)).json();
const b = await chromium.launch({ headless: true }), page = await b.newPage({ viewport: { width: 1360, height: 1200 } }); page.on("dialog", d => { log("dialog:", d.message().slice(0, 140)); d.accept(); }); page.on("pageerror", e => log("PAGE ERROR", e.message));
try {
  await page.goto(BASE); await page.waitForSelector("#nav button"); await page.locator("#nav button", { hasText: "New video" }).click(); await page.waitForSelector("#nvtopic");
  await page.locator("#nvtopic").fill(topic); await page.locator("#nvfmt").selectOption(fmt); await page.getByRole("button", { name: "Get the strict prompt" }).click(); await page.waitForSelector("#nvprompt");
  const prompt = await page.locator("#nvprompt").inputValue(); fs.writeFileSync("/tmp/nv-prompt.txt", prompt); log("strict prompt:", prompt.length, "chars; mentions", ["drone_orbit_180", "gold-bokeh", "temple-jali", "SCENES:", "VISUALS:", "mask"].map(k => k + "=" + prompt.includes(k)).join(" "));
  await page.screenshot({ path: "/tmp/nv-1-prompt.png" });
  await page.locator("#nvpaste").fill(fs.readFileSync(packFile, "utf8")); await page.getByRole("button", { name: "Check it" }).click(); await page.waitForTimeout(2500);
  const txt = await page.locator("#view").innerText(); log("check result:", txt.match(/(accepted|rejected)[^\n]*/)?.[0], "|", (txt.match(/Estimated machine time[^\n]*/) || [""])[0]); await page.screenshot({ path: "/tmp/nv-2-check.png" });
  const make = page.getByRole("button", { name: "Make the video" }); if (!(await make.isEnabled())) throw new Error("Make is disabled: " + txt.slice(0, 600));
  await make.click(); log("clicked Make the video"); let last = "";
  for (let i = 0; i < 900; i++) { await page.waitForTimeout(8000); const j = (await api("/api/hub/jobs")).jobs[0]; const slug = j && j.name.replace("video ", ""); const st = slug ? await api("/api/hub/video/status?id=" + slug + ".video") : null; const stage = st && st.timing && st.timing.stages.at(-1); const line = stage ? `${stage.name} ${stage.status} ${stage.seconds ?? ""}` : "?"; if (line !== last) { last = line; log("progress:", line, "| job:", j && j.status); }
    if (j && j.status !== "running") { log("job finished:", j.status, (j.error || "").slice(0, 300)); break; } }
  await page.waitForTimeout(3000); await page.screenshot({ path: "/tmp/nv-3-done.png", fullPage: true }); const txt2 = await page.locator("#view").innerText(); log("final page has video:", /Final video/.test(txt2));
} catch (e) { log("TEST FAILED:", e.message); await page.screenshot({ path: "/tmp/nv-fail.png" }).catch(() => {}); process.exitCode = 1; } finally { await b.close(); }
