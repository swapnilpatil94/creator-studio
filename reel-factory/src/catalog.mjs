// The catalog the Director chooses from: components (with the styles they belong to), styles, transitions, themes. Also writes schemas/beatplan.schema.json (the contract enforced with Ollama `format`).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { registry, MOTION } from "../components/index.mjs"; import { styles } from "../styles/index.mjs"; import { TRANSITIONS } from "./transitions.mjs"; import { SHAPE_NAMES } from "./lib/shapes.mjs"; import { GENRE_STYLES } from "./pick-style.mjs";
const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const themes = () => fs.readdirSync(path.join(RF, "themes")).filter(d => fs.existsSync(path.join(RF, "themes", d, "tokens.json")));
export const catalog = () => ({
  components: Object.values(registry).filter(c => c.name !== "Particles").map(c => ({ name: c.name, archetypes: c.archetypes, styles: c.styles || ["any"], when_to_use: c.when_to_use, props_schema: c.schema })),
  styles: Object.values(styles).map(s => ({ name: s.name, label: s.label, looks: s.looks, best_for: s.best_for, how_built: s.how, transitions: s.transitions })),
  transitions: Object.entries(TRANSITIONS).map(([k, v]) => ({ name: k, desc: v.desc })), genres: GENRE_STYLES, themes: themes(),
});
export function beatPlanSchema() {
  const ARCH = ["hook", "character_intro", "big_number", "comparison", "process_steps", "options", "cause_effect", "date_era", "place", "quote", "evidence_reveal", "twist", "countdown_time", "many_scale", "consequence_today", "loop_cta"];
  return { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", required: ["title", "theme", "genre", "style", "beats"], additionalProperties: false, properties: {
    title: { type: "string" }, theme: { enum: themes() }, genre: { enum: Object.keys(GENRE_STYLES) }, style: { enum: Object.keys(styles) }, sources: { type: "array", items: { type: "string" } }, warnings: { type: "array", items: { type: "string" } }, gaps: { type: "array", items: { type: "string" } },
    beats: { type: "array", minItems: 6, maxItems: 16, items: { type: "object", required: ["id", "line_ids", "archetype", "component", "on_screen", "assets", "motion"], additionalProperties: false, properties: {
      id: { type: "integer" }, line_ids: { type: "array", items: { type: "integer" } }, archetype: { enum: ARCH }, component: { enum: Object.keys(registry).filter(n => n !== "Particles") }, variant: { type: "string" },
      on_screen: { type: "array", maxItems: 3, items: { type: "string", maxLength: 28 } }, accent_line: { type: "integer", minimum: 1, maximum: 3 }, sheet: { type: "string" },
      assets: { type: "array", maxItems: 4, items: { type: "object", required: ["id", "subject"], properties: { id: { type: "string", pattern: "^[a-z0-9_]+$" }, subject: { type: "string", maxLength: 140 }, reuse: { type: "boolean" } } } },
      motion: { type: "array", items: { enum: MOTION } }, emphasis_word: { type: "string" }, transition: { enum: Object.keys(TRANSITIONS) }, shapes: { type: "array", items: { enum: SHAPE_NAMES }, maxItems: 2 }, focus: { type: "object" }, map: { type: "object" },
      sfx: { type: "array", items: { type: "object", properties: { at: { enum: ["enter", "emphasis", "impact", "exit"] }, name: { type: "string" } } } }, verdict: { enum: ["सच", "अफवाह", "आधा सुलझा", "अनसुलझा"] }, loop_to_start: { type: "boolean" } } } } } };
}
if (process.argv[1] && process.argv[1].endsWith("catalog.mjs")) { fs.mkdirSync(path.join(RF, "schemas"), { recursive: true }); fs.writeFileSync(path.join(RF, "schemas/beatplan.schema.json"), JSON.stringify(beatPlanSchema(), null, 1)); fs.writeFileSync(path.join(RF, "schemas/catalog.json"), JSON.stringify(catalog(), null, 1)); console.log("wrote schemas/beatplan.schema.json and schemas/catalog.json"); }
