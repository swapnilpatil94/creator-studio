#!/usr/bin/env node
// Measures a dot-cinema SDK scene's own geometry (window.__debug) at every sample time, checks it against standards.json,
// and (with --fix N) repairs violations by editing overrides.json and re-measuring.
// usage: node visual-qa.mjs <scene.html> <overrides.json> [--fix 8] [--report out.json]
import { chromium } from "/Users/swapnil/creator-studio/engine/node_modules/playwright/index.mjs";
import { pathToFileURL } from "node:url"; import path from "node:path";
import { std, runQA } from "./qa-core.mjs";
const args = process.argv.slice(2), html = path.resolve(args[0]), ovPath = path.resolve(args[1]);
const fixN = args.includes("--fix") ? Number(args[args.indexOf("--fix") + 1]) : 0, repIdx = args.indexOf("--report"), reportPath = repIdx >= 0 ? args[repIdx + 1] : null;
async function measure(ov) {
  const b = await chromium.launch({ headless: true }), p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  await p.addInitScript(o => { window.OVERRIDES = o; }, ov);
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(pathToFileURL(html).href); await p.evaluate(() => window.__ready || true);
  const dur = await p.evaluate(() => window.getDuration()), out = [];
  for (let t = 0.4; t < dur - 0.4; t += std.sampleStep) out.push(await p.evaluate(t => window.__debug(t), t));
  await b.close(); if (errs.length) throw new Error("page errors: " + errs.join("; "));
  return out;
}
const r = await runQA({ measure, ovPath, fixN, reportPath }); process.exit(r.violations.length ? 1 : 0);
