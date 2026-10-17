#!/usr/bin/env python3
"""Bakes public-domain paintings into 'dot-ready' images for the dot-cinema engine (see CREDITS.md for sources/licenses).
Output PNG channels: R = palette index (16-colour palette per painting, in palettes.json), G = dot size (stylised local contrast + luminance), B = detail (flat paper/sky dims, figures stay bright). The engine draws coloured dots.
Run: python3 prep.py   (reads original/*.jpg, writes baked/*.webp (lossless) and color/*.jpg used by thumbnails)"""
import numpy as np, os
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); os.makedirs(D + "/baked", exist_ok=True); os.makedirs(D + "/color", exist_ok=True); PALS = {}
# crop boxes (left, top, right, bottom) in original pixels: remove museum mats/borders
JOBS = {   # base = weight of the tonal image, edge = weight of line detail, bg = how strongly flat paper/sky is suppressed
 "01-ravivarma-press-durga.jpg": dict(crop=None, mix=0.85, edge=1.0),
 "02-dia-durga-combat-bull.jpg": dict(crop=(205, 205, 1740, 1200), mix=0.85, edge=1.0),
 "03-dia-durga-decapitated-bull.jpg": dict(crop=(205, 205, 1708, 1208), mix=0.85, edge=1.0),
 "04-basholi-bhadrakali-gods.jpg": dict(crop=(235, 215, 1690, 1745), mix=0.85, edge=1.0),
 "06-guler-durga.jpg": dict(crop=None, mix=0.85, edge=1.0),
}
def gauss(a, s): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(s))).astype(float) / 255
for f, p in JOBS.items():
    im = Image.open(f"{D}/original/{f}").convert("RGB")
    if p["crop"]: im = im.crop(p["crop"])
    long = max(im.size); sc = 1500 / long
    if sc < 1: im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    im.save(f"{D}/color/{f[:2]}.jpg", quality=88)
    a = np.asarray(im).astype(float) / 255; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); sat = np.where(mx > 0, (mn * -1 + mx) / np.maximum(mx, 1e-6), 0); lum = 0.299 * r + 0.587 * g + 0.114 * b
    s1 = max(im.size) / 140; blur = gauss(lum, s1); edge = np.abs(lum - blur); local = gauss(edge, s1 * 1.6)   # local detail (figures) vs flat paper/sky
    detail = np.clip(local / 0.045, 0, 1)
    sg = max(im.size) / 16; bigc = np.stack([gauss(a[..., i], sg) for i in range(3)], -1); hpc = np.sqrt(((a - bigc) ** 2).sum(-1) / 3)   # colour-space local contrast: figures stand out from flat paper/sky/ground
    Lc = np.clip(0.03 + 3.6 * hpc, 0, 1)
    L = p["mix"] * Lc + p["edge"] * edge + 0.26 * sat * lum + 0.03 * lum
    yy, xx = np.mgrid[0:L.shape[0], 0:L.shape[1]]; vig = 1 - 0.5 * np.clip((((xx / L.shape[1] - .5) * 2) ** 2 + ((yy / L.shape[0] - .5) * 2) ** 2) - 0.4, 0, 1)
    L = np.clip(L * vig, 0, 1); L = 0.95 * (1 - np.exp(-2.6 * L)) / (1 - np.exp(-2.6))   # soft knee
    # --- palette bake: R = palette index (exact, sampled with nearest-neighbour), G = dot size (0..255), B = detail ---
    K = 16; small = im.resize((max(1, im.width // 3), max(1, im.height // 3)), Image.LANCZOS); q = small.quantize(colors=K, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.asarray(q.getpalette()[:K * 3], dtype=float).reshape(-1, 3) / 255; pal = pal[:K]
    full = np.asarray(im).astype(float) / 255; d2 = ((full[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(-1); idx = d2.argmin(-1)      # nearest palette colour per pixel
    import colorsys; palx = []
    for c in pal:
        h, sa, v = colorsys.rgb_to_hsv(*c); r2, g2, b2 = colorsys.hsv_to_rgb(h, min(1, sa * 1.18), min(1, 0.18 + v * 1.0)); palx.append([int(r2 * 255), int(g2 * 255), int(b2 * 255)])
    paper = (lum > 0.85) & (sat < 0.15)                                  # pale sky / cloud / mat paper: keep as faint texture so the figures lead
    paper = gauss(paper.astype(float), 2.0) > 0.5
    size = np.clip(0.34 + 0.50 * L + 0.22 * lum ** 0.9, 0, 1) * (0.42 + 0.58 * np.clip(local / 0.04, 0, 1)) * np.where(paper, 0.5, 1.0)      # flat paper/sky -> small dots, figures/detail -> big dots
    out = np.stack([idx.astype(np.uint8), (np.clip(size, 0, 1) * 255).astype(np.uint8), ((0.08 + 0.92 * np.clip(local / 0.04, 0, 1) ** 0.8) * np.where(paper, 0.5, 1.0) * 255).astype(np.uint8)], -1)
    Image.fromarray(out, "RGB").save(f"{D}/baked/{f[:2]}.webp", lossless=True, quality=100, method=6); PALS[f[:2]] = palx; print(f[:2], im.size, "palette baked")
import json; json.dump(PALS, open(D + "/baked/palettes.json", "w"))
