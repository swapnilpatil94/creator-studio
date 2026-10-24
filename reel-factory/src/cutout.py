"""Batch cut-out with rembg + BiRefNet (general). Input: a JSON list [{src, dst}] on argv[1]; writes RGBA PNGs fitted to a 640x640 canvas and prints metrics JSON.
Run with reel-factory/.venv/bin/python. Loads the model once (about 1 GB), unloads on exit."""
import json, sys, numpy as np
from PIL import Image
from rembg import new_session, remove
CANVAS, FIT = 640, 580
jobs = json.load(open(sys.argv[1]))
sess = new_session("birefnet-general")
out = []
for j in jobs:
    im = Image.open(j["src"]).convert("RGB")
    W, H = im.size
    cut = remove(im, session=sess)                      # RGBA, original size
    a = np.array(cut)[:, :, 3]
    ys, xs = np.where(a > 24)
    if len(xs) == 0:
        out.append({**j, "ok": False}); continue
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    touches = x0 <= 2 or y0 <= 2 or x1 >= W - 2 or y1 >= H - 2
    sub = cut.crop((x0, y0, x1, y1))
    s = min(FIT / sub.width, FIT / sub.height)
    sub = sub.resize((max(1, round(sub.width * s)), max(1, round(sub.height * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(sub, ((CANVAS - sub.width) // 2, (CANVAS - sub.height) // 2), sub)
    canvas.save(j["dst"])
    cov = float((a > 24).mean()); cx = (xs.mean() / W - 0.5); cy = (ys.mean() / H - 0.5)
    out.append({**j, "ok": True, "coverage": round(cov, 4), "touches_edge": bool(touches), "center_offset": round(float(np.hypot(cx, cy)), 4), "bbox": [x0, y0, x1, y1]})
print("@@METRICS" + json.dumps(out))
