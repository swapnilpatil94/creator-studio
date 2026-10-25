// Plan-level QA: things a human would reject at a glance. Returns a list of issues; the episode is marked "review" when there are any.
import { toks, wordOk } from "./director.mjs";
export function planQa(plan, beats) {
  const issues = []; plan.beats.forEach((b, i) => { const n = i + 1, nar = beats[i]?.text || "", nt = toks(nar), items = (b.on_screen || []).filter(Boolean).map(x => x.replace(/^\+\s*/, "")), text = items.join(" ");
    if (!items.length && !["Parallax"].includes(b.component) && !(b.assets || []).length) issues.push(`beat ${n}: nothing on screen`);
    if (b.component === "Counter" && !/\d/.test(text)) issues.push(`beat ${n}: a counter without a number`);
    if (b.component === "Typewriter" && [...text].length < 10) issues.push(`beat ${n}: the typed line is only a fragment ("${text}")`);
    if (b.component === "Checklist" && items.length < 2) issues.push(`beat ${n}: a checklist with one item`);
    for (const w of toks(text.replace(/[\d%]+/g, " ")).filter(x => x.length >= 1)) if (w.length <= 2 && !nt.includes(w)) { issues.push(`beat ${n}: cut-off fragment "${w}" on screen`); break; }
    if (nt.length && toks(text).length && b.component !== "DotCrowd" && !toks(text).some(w => wordOk(w, nt))) issues.push(`beat ${n}: on-screen text has nothing from that beat's narration`); });
  const last = plan.beats.at(-1); if (last && !/[?？]\s*$/.test((last.on_screen || []).at(-1) || "")) issues.push("the closing beat does not end on the final question");
  return issues;
}
