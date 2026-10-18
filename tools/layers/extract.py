#!/usr/bin/env python
"""Splits a painting into three parallax layers: BG (subject and mid ground removed and repaired), MID (mid-depth band, alpha) and FG (the subject, alpha).
Depth: Depth Anything V2 Small (Hugging Face, Apple GPU). Subject matte: rembg (isnet-general-use). Run with ~/.venvs/kathaaya-layers/bin/python.
usage: extract.py <image> <out_dir> [--max 1600]   -> bg.jpg, mid.webp, fg.webp, depth.png, layers.json
"""
import sys, json, os
import numpy as np
from PIL import Image, ImageFilter
import cv2

def main():
    src, out = sys.argv[1], sys.argv[2]
    mx = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 1600
    os.makedirs(out, exist_ok=True)
    im = Image.open(src).convert("RGB")
    s = min(1.0, mx / max(im.size))
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    W, H = im.size
    # depth (near = 1)
    import torch
    from transformers import pipeline
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    dp = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=dev)
    d = np.array(dp(im)["depth"].resize((W, H), Image.BICUBIC)).astype(np.float32)
    d = (d - d.min()) / max(1e-6, d.max() - d.min())
    d = cv2.GaussianBlur(d, (0, 0), 2.0)
    # subject matte
    from rembg import remove, new_session
    a = np.array(remove(im, session=new_session("isnet-general-use"), only_mask=True)).astype(np.float32) / 255.0
    a = cv2.GaussianBlur(a, (0, 0), 1.2)
    # layer alphas: FG = subject; MID = nearer than the scene median but not subject; BG = rest
    fg = np.clip(a, 0, 1)
    thr = float(np.percentile(d, 55))
    mid = np.clip((d - thr) / 0.12, 0, 1) * (1 - fg)
    mid = cv2.GaussianBlur(mid, (0, 0), 1.5)
    # background plate: remove the subject, repair the hole
    hole = (fg > 0.15).astype(np.uint8) * 255   # only the subject is removed from the plate: the mid band stays in it, so sliding layers never expose a repaired seam
    hole = cv2.dilate(hole, np.ones((9, 9), np.uint8), iterations=2)
    small = 0.5
    arr = np.array(im)
    sm = cv2.resize(arr, None, fx=small, fy=small, interpolation=cv2.INTER_AREA)
    hm = cv2.resize(hole, None, fx=small, fy=small, interpolation=cv2.INTER_NEAREST)
    rep = cv2.inpaint(sm, hm, 7, cv2.INPAINT_TELEA)
    rep = cv2.resize(rep, (W, H), interpolation=cv2.INTER_CUBIC)
    rep = cv2.GaussianBlur(rep, (0, 0), 3.0)  # repaired area reads as soft depth-of-field, not as smears
    bg = np.where(hole[..., None] > 0, rep, arr)
    Image.fromarray(bg.astype(np.uint8)).save(os.path.join(out, "bg.jpg"), quality=86)
    def rgba(alpha, name):
        x = np.dstack([arr, (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])
        Image.fromarray(x, "RGBA").save(os.path.join(out, name), quality=84, method=4, alpha_quality=92)
    rgba(mid, "mid.webp"); rgba(fg, "fg.webp")
    Image.fromarray((d * 255).astype(np.uint8)).save(os.path.join(out, "depth.png"))
    json.dump({"w": W, "h": H, "fg_coverage": round(float(fg.mean()), 3), "mid_coverage": round(float(mid.mean()), 3), "depth_threshold": round(thr, 3)}, open(os.path.join(out, "layers.json"), "w"))
    print(json.dumps({"out": out, "w": W, "h": H, "fg": round(float(fg.mean()), 3), "mid": round(float(mid.mean()), 3)}))

main()
