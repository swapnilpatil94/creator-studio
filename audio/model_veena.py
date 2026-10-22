"""maya-research/Veena (Apache 2.0, apache-licensed, 4 built-in Hindi/English voices, no cloning) as an alternate
engine to Chatterbox (model.py). Same Voice interface (generate(text, seed=...) -> (float32 24kHz array, seconds))
so synth.py and the rest of the pipeline do not need to know which engine is running.
Runs the actual model in audio/.venv-veena (see audio/veena_worker.py): the shared pipeline interpreter's scipy
build cannot import transformers' generation module on this Mac without breaking numba/whisperx (tested
2026-10-22), so Veena talks to a persistent subprocess over stdin/stdout instead of loading in-process."""
import os, sys, json, subprocess, atexit, time
import numpy as np, soundfile as sf
from pathlib import Path
from common import log
SPEAKERS = ["kavya", "agastya", "maitri", "vinaya"]
# No MALE/FEMALE split here on purpose: the model's speaker-token conditioning is unreliable (documented upstream
# at huggingface.co/maya-research/Veena/discussions/17, confirmed here 2026-10-22 -- a multi-sample pitch test came
# back nearly identical across all 4 names). maitri is the one speaker that has come out consistent, hence the
# default below; the other three are requests the model does not reliably honour, not distinct guaranteed voices.
DEFAULT_SPEAKER = "maitri"
VENV_PY = Path(__file__).parent / ".venv-veena" / "bin" / "python"
WORKER = Path(__file__).parent / "veena_worker.py"
class Voice:
    def __init__(self, speaker=DEFAULT_SPEAKER):
        if speaker not in SPEAKERS: raise ValueError(f"unknown Veena speaker {speaker!r}: must be one of {SPEAKERS}")
        if not VENV_PY.exists(): raise RuntimeError(f"Veena venv missing: run `python3 -m venv {VENV_PY.parent}` and pip install torch torchaudio transformers snac soundfile accelerate in it")
        self.speaker, self.sr, self.variant, self.reference = speaker, 24000, "veena", f"veena:{speaker}"
        t0 = time.time()
        self.proc = subprocess.Popen([str(VENV_PY), str(WORKER)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
        atexit.register(self._close)
        # the worker logs "ready" to stderr once the model and SNAC are loaded; block until then (or it dies)
        while True:
            l = self.proc.stderr.readline()
            if not l:
                err = self.proc.stderr.read()
                raise RuntimeError(f"Veena worker exited before it was ready: {err[-2000:]}")
            log(f"[veena worker] {l.rstrip()}")
            if "ready in" in l: break
        log(f"model loaded in {time.time()-t0:.1f}s variant=veena device=worker-subprocess speaker={speaker}")
    def generate(self, text, seed=42, **params):
        # Chatterbox-specific controls (exaggeration, cfg_weight, min_p, repetition_penalty) have no Veena
        # equivalent yet (the model has no exposed emotion/prosody control -- see maya-research/Veena README,
        # "Future Updates"): only temperature/top_p carry through, at their Veena-README defaults.
        req = {"text": text, "speaker": self.speaker, "seed": seed, "temperature": params.get("temperature", 0.4), "top_p": params.get("top_p", 0.9)}
        self.proc.stdin.write(json.dumps(req) + "\n"); self.proc.stdin.flush()
        line = self.proc.stdout.readline()
        if not line:
            err = self.proc.stderr.read()
            raise RuntimeError(f"Veena worker died mid-generation: {err[-2000:]}")
        resp = json.loads(line)
        if not resp.get("ok"): raise RuntimeError(f"Veena generation failed: {resp.get('error')}")
        y, _ = sf.read(resp["path"], dtype="float32"); os.remove(resp["path"])
        return y, resp["seconds"]
    def _close(self):
        try:
            if self.proc.poll() is None:
                self.proc.stdin.write(json.dumps({"cmd": "quit"}) + "\n"); self.proc.stdin.flush()
                self.proc.wait(timeout=5)
        except Exception:
            try: self.proc.kill()
            except Exception: pass
