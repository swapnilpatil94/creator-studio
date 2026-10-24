// Builds one demo episode from every component's own demo beat and saves a golden still per component (tests/golden/stills/<Component>.png).
// Usage: node tests/make-goldens.mjs   (re-run only when a component's look is changed on purpose)
import fs from "node:fs"; import path from "node:path"; import { registry } from "../components/index.mjs"; import { RF, tmp, comp, snap } from "./_util.mjs";
const all = Object.keys(registry), isDoc = n => registry[n].styles?.[0] === "documentary", groups = [{ names: all.filter(n => !isDoc(n)), theme: "pothi", style: "scrapbook", file: "components-demo.json" }, { names: all.filter(isDoc), theme: "documentary", style: "documentary", file: "components-demo-doc.json" }], sheets = ["ivory", "indigo", "maroon", "saffron"];
fs.mkdirSync(path.join(RF, "tests/golden/stills"), { recursive: true });
for (const g of groups) {
  const beats = g.names.map((n, i) => ({ id: i + 1, line_ids: [i + 1], seconds: 3.2, archetype: "hook", component: n, variant: "", on_screen: [], accent_line: 1, sheet: g.theme === "pothi" ? sheets[i % 4] : "obsidian", assets: [], motion: [], emphasis_word: "", sfx: [], loop_to_start: i === g.names.length - 1, ...registry[n].demo }));
  const plan = { title: "component goldens", theme: g.theme, genre: "demo", style: g.style, captions: false, sources: [], warnings: [], gaps: [], beats };
  fs.writeFileSync(path.join(RF, "tests/golden", g.file), JSON.stringify(plan, null, 1));
  const dir = tmp("gold"), m = await comp(plan, dir), times = m.scenes.map(r => String(+(r.start + 2.4).toFixed(1))), shots = snap(dir, times);
  g.names.forEach((n, i) => fs.copyFileSync(shots[times[i]], path.join(RF, "tests/golden/stills", n + ".png"))); console.log("golden stills:", g.names.join(", "), "| gaps:", m.gaps.length);
}
