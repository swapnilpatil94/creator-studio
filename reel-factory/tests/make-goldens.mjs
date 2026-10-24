// Builds one demo episode from every component's own demo beat and saves a golden still per component (tests/golden/stills/<Component>.png).
// Usage: node tests/make-goldens.mjs   (re-run only when a component's look is changed on purpose)
import fs from "node:fs"; import path from "node:path"; import { registry } from "../components/index.mjs"; import { RF, tmp, comp, snap } from "./_util.mjs";
const names = Object.keys(registry), sheets = ["ivory", "indigo", "maroon", "saffron"];
const beats = names.map((n, i) => ({ id: i + 1, line_ids: [i + 1], seconds: 3.2, archetype: "hook", component: n, variant: "", on_screen: [], accent_line: 1, sheet: sheets[i % 4], assets: [], motion: [], emphasis_word: "", sfx: [], loop_to_start: i === names.length - 1, ...registry[n].demo }));
const plan = { title: "component goldens", theme: "pothi", genre: "demo", style: "scrapbook", captions: false, sources: [], warnings: [], gaps: [], beats };
fs.writeFileSync(path.join(RF, "tests/golden/components-demo.json"), JSON.stringify(plan, null, 1));
const dir = tmp("gold"), m = await comp(plan, dir), times = m.scenes.map(r => String(+(r.start + 2.4).toFixed(1))), shots = snap(dir, times);
fs.mkdirSync(path.join(RF, "tests/golden/stills"), { recursive: true });
names.forEach((n, i) => fs.copyFileSync(shots[times[i]], path.join(RF, "tests/golden/stills", n + ".png")));
console.log("golden stills:", names.join(", "), "| gaps:", m.gaps.length);
