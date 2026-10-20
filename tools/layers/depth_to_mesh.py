"""Export a real, textured 3D mesh (.glb) from one of our existing depth maps -- opens directly in Blender, Three.js, AR Quick Look, any modern 3D tool.
This is NOT neural 3D reconstruction (TripoSR/Hunyuan3D researched and rejected for this Mac: heavy ones need 24-29 GB VRAM our unified memory can't spare without starving everything else,
the light one (TripoSR) only gives "basic" geometry unsuited to detailed figures, and the CUDA-specific rasterizers behind the good ones don't run on Apple Silicon).
This is the classic photo-parallax technique instead: a subdivided plane, each vertex pushed back by the depth map, the original photo as the texture. Lightweight (seconds, CPU only,
no new model to download), and it is a REAL mesh you can rotate, re-light and camera-move in an actual 3D tool, not just the 2D canvas parallax DepthFlow already does for us.
Usage: python tools/layers/depth_to_mesh.py <color.jpg> <depth.png> <out.glb> [--grid 160] [--depth-scale 0.35] [--smooth]
"""
import sys, argparse, numpy as np
from PIL import Image, ImageFilter
import trimesh

def build(color_path, depth_path, out_path, grid=160, depth_scale=0.35, smooth=False):
    color = Image.open(color_path).convert("RGB")
    depth_im = Image.open(depth_path).convert("L")
    if smooth: depth_im = depth_im.filter(ImageFilter.GaussianBlur(2))
    w, h = color.size
    aspect = w / h
    # sample the depth map on a regular grid (gx columns, gy rows): more vertices = smoother but heavier mesh
    gx = grid; gy = max(2, round(grid / aspect))
    depth_small = np.asarray(depth_im.resize((gx, gy), Image.BILINEAR), dtype=np.float32) / 255.0
    # Depth Anything's convention here: brighter = closer. Invert so near things sit forward (larger +z) relative to the far plane.
    z = (1.0 - depth_small) * depth_scale

    xs = np.linspace(-aspect / 2, aspect / 2, gx)
    ys = np.linspace(0.5, -0.5, gy)  # top of image = +y
    gxx, gyy = np.meshgrid(xs, ys)
    verts = np.stack([gxx.ravel(), gyy.ravel(), z.ravel()], axis=1)

    # v: trimesh's glTF export applies its own top/bottom flip on write, so this raw (not pre-flipped) v is what comes out correctly oriented in a glTF/Three.js viewer.
    uv = np.stack([ (gxx.ravel() + aspect / 2) / aspect, (gyy.ravel() + 0.5) ], axis=1)

    faces = []
    for j in range(gy - 1):
        for i in range(gx - 1):
            a = j * gx + i; b = a + 1; c = a + gx; d = c + 1
            faces.append([a, c, b]); faces.append([b, c, d])
    faces = np.array(faces)

    mesh = trimesh.Trimesh(vertices=verts, faces=faces, process=False)
    material = trimesh.visual.material.PBRMaterial(baseColorTexture=color, metallicFactor=0.0, roughnessFactor=0.9)
    mesh.visual = trimesh.visual.TextureVisuals(uv=uv, material=material)
    mesh.export(out_path)
    info = { "vertices": len(verts), "faces": len(faces), "aspect": round(aspect, 3), "depth_scale": depth_scale, "out": out_path }
    import json, os
    with open(os.path.splitext(out_path)[0] + ".json", "w") as f: json.dump(info, f)
    return info

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("color"); ap.add_argument("depth"); ap.add_argument("out")
    ap.add_argument("--grid", type=int, default=160)
    ap.add_argument("--depth-scale", type=float, default=0.35)
    ap.add_argument("--smooth", action="store_true")
    a = ap.parse_args()
    r = build(a.color, a.depth, a.out, a.grid, a.depth_scale, a.smooth)
    print(f"wrote {r['out']}: {r['vertices']} vertices, {r['faces']} faces, aspect {r['aspect']}, depth_scale {r['depth_scale']}")
