#!/usr/bin/env python
"""Renders one camera move over a still painting with DepthFlow (a depth-parallax shader running on the Apple GPU through Metal-backed OpenGL):
true perspective parallax with proper occlusion, 70+ frames per second at 1080x1920. Run with ~/.venvs/depthflow/bin/python.
usage: depthflow_clip.py <image> <depth.png> <out.mp4> <effect> <seconds> [width height fps]
effects: the camera/depth subset of the strict list (see CAMERA below)."""
import math, sys, os, tempfile
import numpy as np
from PIL import Image, ImageFilter
from attrs import define
from depthflow.scene import DepthScene

AMP = float(os.environ.get("MOTION_AMP", "0.55"))   # global motion scale: gentle by default, because faces, hands and deities must never look warped

def rigid_depth(dep_path):
    """Flattens the depth map inside the cut-out subject (the layers' fg.webp): each figure then moves as ONE rigid card, so noses, hands and hair strands cannot shear.
    Only the scene behind the subject gets parallax. Returns the path of a temporary depth image (or the original if there is no cut-out)."""
    fg = os.path.join(os.path.dirname(dep_path), "fg.webp")
    if not os.path.exists(fg): return dep_path
    d = Image.open(dep_path).convert("L"); a = Image.open(fg).convert("RGBA").split()[3].resize(d.size)
    m = a.point(lambda v: 255 if v > 100 else 0)
    core = np.array(m.filter(ImageFilter.MinFilter(9))) > 0
    if core.sum() < 50: return dep_path
    da = np.array(d).astype(np.float32); med = float(np.median(da[core]))
    soft = np.array(m.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32) / 255.0   # a little beyond the outline, so hair edges move with the figure
    out = da * (1 - soft) + med * soft
    tmp = os.path.join(tempfile.gettempdir(), f"rigid_{os.getpid()}.png"); Image.fromarray(out.astype(np.uint8)).save(tmp); return tmp

def sm(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)

def noise(t, a=0.0): return 0.5 * math.sin(t * 1.7 + a) + 0.3 * math.sin(t * 2.9 + a * 2.3) + 0.2 * math.sin(t * 5.3 + a * 0.7)

# each preset: function(state, k (0..1 smoothed progress), p (linear progress), t (seconds)) sets the camera
def push_in(s, k, p, t):      s.height = 0.12 + 0.70 * k; s.steady = 0.30; s.isometric = 0.40; s.offset = (0.06 * math.sin(p * math.pi), 0.10 * k)
def pull_out(s, k, p, t):     s.height = 0.80 - 0.68 * k; s.steady = 0.30; s.isometric = 0.40; s.offset = (-0.05 * math.sin(p * math.pi), -0.10 * k)
def orbit(s, k, p, t):        s.steady = 0.30; s.focus = 0.30; s.zoom = 0.98; s.isometric = 0.55 + 0.25 * math.sin(p * math.pi); s.height = 0.30; s.offset = (0.55 * (2 * k - 1), 0.03 * math.sin(p * math.pi))
def top_down(s, k, p, t):     s.height = 0.30; s.steady = 0.28; s.isometric = 0.25 + 0.35 * k; s.zoom = 1.0 - 0.06 * k; s.offset = (0.0, -0.60 * k)
def fpv(s, k, p, t):          s.height = 0.10 + 0.95 * (p * p); s.steady = 0.30; s.isometric = 0.30; s.offset = (0.22 * p * math.sin(t * 3.1), 0.08 * math.sin(t * 2.3)); s.zoom = 1.0 - 0.08 * p
def vertigo(s, k, p, t):      s.height = 0.30; s.steady = 0.35; s.focus = 0.35; s.zoom = 0.95; s.isometric = 0.45 * (1.0 - math.cos(math.pi * k))
def crane_up(s, k, p, t):     s.height = 0.35; s.steady = 0.30; s.isometric = 0.45; s.offset = (0.0, 0.58 * (2 * k - 1)); s.zoom = 1.0 - 0.05 * k
def crane_down(s, k, p, t):   s.height = 0.35; s.steady = 0.30; s.isometric = 0.45; s.offset = (0.0, -0.58 * (2 * k - 1)); s.zoom = 1.0 - 0.05 * k
def handheld(s, k, p, t):     s.height = 0.22; s.steady = 0.30; s.isometric = 0.60; s.zoom = 0.97 - 0.01 * math.sin(t * 1.1); s.offset = (0.07 * noise(t * 1.3, 1) + 0.03 * noise(t * 3.1, 2), 0.06 * noise(t * 1.1, 5) + 0.02 * noise(t * 2.9, 3))
def parallax_25d(s, k, p, t): s.height = 0.25; s.steady = 0.30; s.isometric = 0.60; s.offset = (0.45 * (2 * k - 1), 0.0)
def occlusion_3d(s, k, p, t): s.height = 0.40; s.steady = 0.30; s.isometric = 0.55; s.offset = (0.45 * math.sin(p * math.tau), 0.28 * math.sin(p * math.tau + math.pi / 2))
def rack_focus(s, k, p, t):   s.height = 0.25; s.steady = 0.30; s.isometric = 0.55; s.offset = (0.12 * (2 * k - 1), 0.0); s.blur.intensity = 1.1; s.blur.start = 0.15 + 0.75 * k; s.blur.end = 1.0; s.blur.exponent = 3.0; s.blur.quality = 6

CAMERA = {"drone_push_in": push_in, "drone_pull_out_reveal": pull_out, "drone_orbit_180": orbit, "drone_top_down_bird_eye": top_down, "drone_fpv_flythrough": fpv, "dolly_zoom_vertigo": vertigo, "crane_up_reveal": crane_up, "crane_down": crane_down, "handheld_breathing_shake": handheld, "2.5d_parallax": parallax_25d, "parallax_occlusion_3d": occlusion_3d, "depth_rack_focus": rack_focus}

@define
class Cam(DepthScene):
    effect: str = "drone_push_in"
    def update(self):
        p = max(0.0, min(1.0, self.tau)); CAMERA[self.effect](self.state, sm(p), p, self.time)
        st = self.state; st.offset = (st.offset[0] * AMP, st.offset[1] * AMP); st.height = min(0.45, st.height * (0.5 + AMP / 2))
        self.state.vignette.intensity = 0.0

if __name__ == "__main__":
    img, dep, out, eff, secs = sys.argv[1:6]; w, h, fps = (int(sys.argv[6]), int(sys.argv[7]), float(sys.argv[8])) if len(sys.argv) > 8 else (1080, 1920, 24.0)
    sc = Cam(effect=eff); sc.input(image=img, depth=rigid_depth(dep))
    sc.main(output=out, width=w, height=h, fps=fps, time=float(secs), ssaa=1.0, quality=70)
