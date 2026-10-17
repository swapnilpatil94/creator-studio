#!/usr/bin/env python3
"""Draws a .stip file to a PNG (ink dots on parchment) to inspect sampler quality. usage: preview.py in.stip out.png [height] [color|ink]"""
import sys, json, struct, numpy as np
from PIL import Image, ImageDraw
d = open(sys.argv[1], 'rb').read(); hl = struct.unpack('<I', d[:4])[0]; hdr = json.loads(d[4:4+hl]); base = 4 + hl; n = hdr['n']; arr = {}
for a in hdr['arrays']:
    dt = np.float32 if a['type'] == 'f32' else np.uint8; cnt = n * a['comps']; arr[a['name']] = np.frombuffer(d, dt, cnt, base + a['offset']).reshape(n, a['comps'])
H = int(sys.argv[3]) if len(sys.argv) > 3 else 1400; asp = hdr['meta']['aspect']; W = int(H * asp); mode = sys.argv[4] if len(sys.argv) > 4 else 'color'
im = Image.new('RGB', (W, H), (236, 222, 190)); dr = ImageDraw.Draw(im)
for i in range(n):
    x = (arr['pos'][i, 0] / asp + 0.5) * W; y = (0.5 - arr['pos'][i, 1]) * H; r = 0.9 + 1.6 * arr['size'][i, 0] * (H / 1400)
    c = tuple(int(v * 0.8) for v in arr['col'][i]) if mode == 'color' else (20, 14, 10)
    dr.ellipse([x - r, y - r, x + r, y + r], fill=c)
im.save(sys.argv[2]); print(sys.argv[2], im.size, n, 'dots')
