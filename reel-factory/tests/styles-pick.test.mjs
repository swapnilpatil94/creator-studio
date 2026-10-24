import test from "node:test"; import assert from "node:assert/strict"; import { pickStyle, GENRE_STYLES } from "../src/pick-style.mjs"; import { catalog } from "../src/catalog.mjs"; import { styles } from "../styles/index.mjs";
test("rotation: 5 consecutive mystery episodes use 5 different styles, never the same twice in a row", () => {
  const hist = []; for (let i = 0; i < 5; i++) { const s = pickStyle({ genre: "mystery", slug: "ep" + i, history: hist }); hist.push({ style: s }); } assert.equal(new Set(hist.map(h => h.style)).size, 5); hist.forEach((h, i) => i && assert.notEqual(h.style, hist[i - 1].style));
});
test("every genre's candidate styles exist; every style lists transitions and a background", () => {
  for (const [g, list] of Object.entries(GENRE_STYLES)) for (const s of list) assert.ok(styles[s], g + " -> " + s);
  for (const s of Object.values(styles)) { assert.ok(s.transitions.length && typeof s.bg === "function" && s.how && s.looks && s.best_for, s.name); }
});
test("catalog: every style, >= 26 components each with when_to_use and a props schema", () => {
  const c = catalog(); assert.equal(c.styles.length, Object.keys(styles).length); assert.ok(c.components.length >= 26); for (const k of c.components) assert.ok(k.when_to_use && k.props_schema, k.name);
});
import { TEMPLATES } from "../templates/index.mjs"; import { loadTheme } from "../src/compose.mjs";
test("every template points at a real theme and style; its theme defines the four moods with real sheets, music and captions", () => {
  for (const [k, t] of Object.entries(TEMPLATES)) { assert.ok(styles[t.style], k + " style"); const th = loadTheme(t.theme); for (const m of ["calm", "pressure", "reveal", "clarity"]) assert.ok(th.sheets[th.moods?.[m]], `${k}: mood ${m} has no sheet`); assert.ok(th.music && th.captions && th.flux_style_lock, k); assert.ok(t.feel && t.best_for && t.colours, k); }
});
