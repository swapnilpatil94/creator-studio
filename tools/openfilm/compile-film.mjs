// Compiles an OpenFilm project (film.html + page.html) for an existing story, driven by:
//   - the story's own build/index.html (our existing renderAt(t)/getDuration() renderer, wrapped unchanged)
//   - the story's narration.wav
//   - openfilm/edit-plan.json (edit-plan.mjs's annotated plan) for which beats get a native OpenFilm
//     compositing overlay -- this is the one piece of NEW visual work done in OpenFilm itself rather than
//     reused from the existing renderer, so the integration demonstrably uses film.html's own multi-track
//     model (a second <section> track, CSS-positioned) and not just a video-format bridge.
// Does not modify engine/longform/core.js, the story's build/, or any existing renderer file.
// usage: node tools/openfilm/compile-film.mjs stories/<name>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wrapPageForOpenFilm } from "./adapter.mjs";
import { buildEditPlan } from "./edit-plan.mjs";

export function compileFilm(storyDir) {
  const projectDir = path.join(storyDir, "openfilm");
  fs.mkdirSync(projectDir, { recursive: true });

  const builtHtml = path.join(storyDir, "build", "index.html");
  if (!fs.existsSync(builtHtml)) throw new Error(`${builtHtml} missing -- build the story first (node tools/longform/make-scene.mjs)`);
  wrapPageForOpenFilm(builtHtml, path.join(projectDir, "page.html"));

  const editPlan = buildEditPlan(storyDir);
  fs.writeFileSync(path.join(projectDir, "edit-plan.json"), JSON.stringify(editPlan, null, 1));

  // Studio/OpenFilm treats the project folder as the sandbox for a film's media: copy assets in rather
  // than reference them by a path that climbs out of the project (../../..).
  const assetsDir = path.join(projectDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  const narration = path.join(storyDir, "narration", "voice", "narration.wav");
  if (!fs.existsSync(narration)) throw new Error(`${narration} missing`);
  fs.copyFileSync(narration, path.join(assetsDir, "narration.wav"));
  const narrationRel = "assets/narration.wav";

  const logo = path.join(fileURLToPath(new URL("../..", import.meta.url)), "channels", "kathaaya", "logo.png");
  fs.copyFileSync(logo, path.join(assetsDir, "logo.png"));
  const logoRel = "assets/logo.png";

  // the story's own page is a fixed-layout canvas page: 540x960 CSS px with a 2x (1080x1920) backing
  // canvas baked in (see build/index.html's own <style>). The OpenFilm stage must match that CSS size,
  // not the backing-pixel size, or the iframe is laid out into a box the page was never sized for.
  const STAGE_W = 540, STAGE_H = 960;
  const overlays = editPlan.shots.filter((s) => s.overlay);
  const overlayClips = overlays.map((s) =>
    `  <img src="${logoRel}#t=0,${s.duration.toFixed(2)}" at="${s.t0.toFixed(2)}" style="left:${STAGE_W - 110}px;top:24px;width:80px;opacity:0.9" title="${s.intent} beat ${s.id}: ${s.reason.replace(/"/g, "'")}">`
  ).join("\n");

  const film = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${STAGE_W}, height=${STAGE_H}">
</head>
<body>
<!-- track 1 (top): native OpenFilm compositing layer -- the channel mark surfaces only on hook/reveal beats,
     the moments tools/openfilm/edit-plan.json marks overlay:true, so it reads as emphasis, not decoration -->
<section>
${overlayClips}
</section>
<!-- track 2: the existing longform renderer, wrapped by adapter.mjs, untouched otherwise -->
<section>
  <iframe src="page.html" at="0"></iframe>
</section>
<!-- track 3: narration, starting at the renderer's own lead-in (its t=0 is "lead seconds before narration") -->
<section>
  <audio src="${narrationRel}" at="${editPlan.lead}"></audio>
</section>
</body>
</html>
`;
  fs.writeFileSync(path.join(projectDir, "film.html"), film);
  return { projectDir, overlays: overlays.length, shots: editPlan.shots.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] || "");
  if (!dir) { console.error("usage: node tools/openfilm/compile-film.mjs stories/<name>"); process.exit(2); }
  const r = compileFilm(dir);
  console.log(`openfilm project -> ${r.projectDir} (${r.shots} shots, ${r.overlays} overlay beats)`);
}
