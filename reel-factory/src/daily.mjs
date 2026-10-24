// reel daily: take the next queued topic, choose today's template and animation pack, write the script, make the video, file the result. Nothing to type.
import path from "node:path"; import fs from "node:fs";
import { make, episodeDir } from "./make.mjs"; import * as Q from "./queue.mjs"; import { pickTemplate, pickAnimation, recordRun, history } from "./rotation.mjs";
export async function runNext({ log = console.log, model } = {}) {
  const q = Q.load(), item = Q.next(q); if (!item) { log("queue is empty"); return null; }
  const h = history(), template = item.template || pickTemplate(h, item.template_hint), animation = item.animation || pickAnimation(h), slug = `${Q.today()}-${item.id}`.slice(0, 40);
  Object.assign(item, { status: "running", started: new Date().toISOString(), slug, template, animation, error: null }); Q.save(q); log(`@@queue ${item.id} running ${template} ${animation}`);
  try { const man = await make({ slug, topic: item.topic, template, animation, model, log }); const q2 = Q.load(), it = q2.items.find(i => i.id === item.id); Object.assign(it, { status: "done", finished: new Date().toISOString(), final: man.final }); Q.save(q2); recordRun({ slug, template, animation, style: man.style }); log(`@@queue ${item.id} done`); return it; }
  catch (e) { const q2 = Q.load(), it = q2.items.find(i => i.id === item.id); Object.assign(it, { status: "failed", finished: new Date().toISOString(), error: e.message.slice(0, 300) }); Q.save(q2); log(`@@queue ${item.id} failed ${e.message}`); return it; }
}
