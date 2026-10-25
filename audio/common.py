"""Shared paths/helpers for the voice director. Runs under the Chatterbox python (pyenv 3.12.0) with .vendor_py first on PYTHONPATH."""
import json, os, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
TTS_REPO = Path(os.environ.get("TTS_REPO", str(Path(__file__).resolve().parent.parent / "vendor/tts-repo")))
PY = os.environ.get("TTS_PYTHON", str(Path.home() / ".pyenv/versions/3.12.0/bin/python"))
def active_reference():
    cfg = TTS_REPO / "output/voice/active_reference.json"
    try:
        p = json.loads(cfg.read_text()).get("path")
        if p and os.path.isfile(p): return p
    except Exception: pass
    return str(Path(__file__).resolve().parent / "reference-voices/hindi-male-narrator.wav")
def ffmpeg(*args, check=True):
    r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *map(str, args)], capture_output=True, text=True)
    if check and r.returncode: raise RuntimeError("ffmpeg failed: " + r.stderr[-400:])
    return r
def log(*a): print("[voice]", *a, file=sys.stderr, flush=True)
