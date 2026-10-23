// AI Editing Director annotator: turns an existing story's plan.json (tools/longform/director.mjs's output)
// into an explicit, structured edit plan with shot timing, framing and a stated reason per beat.
// Reuses the EXISTING intent->effect heuristic (FX_BY_INTENT) rather than re-deriving it, so the reasons
// reported here are the same rules that already chose the effect -- this does not re-direct the film,
// it explains the direction that already happened.
// usage: node tools/openfilm/edit-plan.mjs stories/<name>  -> stories/<name>/openfilm/edit-plan.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FX_BY_INTENT } from "../longform/director.mjs";

const J = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

const CLOSE = new Set(["dolly_zoom_vertigo", "mesh_dolly_zoom_vertigo", "depth_rack_focus", "mesh_rack_focus_dof", "eye_glow_energy_pulse", "particle_formation", "infinite_zoom_droste", "sacred_geometry_carve"]);
const WIDE = new Set(["drone_pull_out_reveal", "crane_up_reveal", "crane_down", "mesh_crane_push", "matte_painting_extension", "map_loka_zoom", "drone_top_down_bird_eye", "volumetric_god_rays", "double_exposure_cosmos"]);
// a close-up or a wide establishing shot stands out more if it is not the same framing as the beat before it:
// hook/reveal beats -- the moments the brief asks to call out -- get the OpenFilm-native overlay layer in compile-film.mjs
const OVERLAY_INTENTS = new Set(["hook", "reveal"]);

function framingFor(comp, fx) {
  if (comp === "kinetic" || comp === "dotword" || comp === "quote") return "close"; // full-frame type, reads as a close graphic
  if (comp === "chapter") return "wide";
  if (!fx) return "medium";
  if (CLOSE.has(fx)) return "close";
  if (WIDE.has(fx)) return "wide";
  return "medium";
}

function reasonFor(beat, entry) {
  const { comp, params = {} } = entry, fx = params.fx, intent = beat.intent || "narrate";
  if (comp !== "cinema" && comp !== "fx") return `comp=${comp}: a non-painting beat (text/graphic), chosen by the director for a "${intent}" line`;
  const pool = FX_BY_INTENT[intent] || FX_BY_INTENT.narrate;
  if (fx && pool.includes(fx)) return `fx=${fx} is in the ${intent} pool (documentary pacing rule: ${intent} beats read best with ${pool.slice(0, 3).join("/")}...)`;
  if (fx) return `fx=${fx} chosen outside the ${intent} pool (director/LLM override, or repeat-avoidance pushed it off the usual pool)`;
  return `comp=${comp} with no effect recorded`;
}

export function buildEditPlan(storyDir) {
  const beats = J(path.join(storyDir, "beats.json"));
  const segsArr = J(path.join(storyDir, "narration/voice/segments.json")).segments;
  const segs = Object.fromEntries(segsArr.map((s) => [s.beat_id, s]));
  const plan = J(path.join(storyDir, "plan.json"));
  const sceneJs = fs.readFileSync(path.join(storyDir, "scene.js"), "utf8");
  const lead = Number(sceneJs.match(/lead:\s*([\d.]+)/)?.[1] ?? 0.9);

  const shots = plan.map((entry, i) => {
    const beat = beats.find((b) => b.id === entry.id) || {};
    const seg = segs[entry.id] || {};
    const t0 = lead + (seg.start_seconds ?? 0), t1 = lead + (seg.end_seconds ?? t0);
    const framing = framingFor(entry.comp, entry.params?.fx);
    const overlay = OVERLAY_INTENTS.has(beat.intent) && (entry.comp === "cinema" || entry.comp === "fx");
    return {
      id: entry.id, chapter: entry.chapter, intent: beat.intent || null,
      t0: Number(t0.toFixed(3)), t1: Number(t1.toFixed(3)), duration: Number((t1 - t0).toFixed(3)),
      comp: entry.comp, fx: entry.params?.fx || null, framing,
      reason: reasonFor(beat, entry),
      overlay, // true => compile-film.mjs adds a native OpenFilm compositing layer on top of this beat
      text: beat.text || seg.text || "",
    };
  });

  return { story: path.basename(storyDir), lead, shots, generated: new Date().toISOString() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] || "");
  if (!dir) { console.error("usage: node tools/openfilm/edit-plan.mjs stories/<name>"); process.exit(2); }
  const editPlan = buildEditPlan(dir);
  const outPath = path.join(dir, "openfilm", "edit-plan.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(editPlan, null, 1));
  const overlays = editPlan.shots.filter((s) => s.overlay).length;
  console.log(`edit plan: ${editPlan.shots.length} shots, ${overlays} overlay beats -> ${outPath}`);
}
