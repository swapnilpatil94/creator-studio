"""Chatterbox loader that mirrors tools/chatterbox_tts.py (same package, same dedicated-Hindi T3 swap) so A/B tests use the SAME model and reference voice.
Supported generate() arguments (verified from the installed chatterbox-tts 0.1.7 source): text, language_id, audio_prompt_path, exaggeration,
cfg_weight, temperature, repetition_penalty, min_p, top_p. There is NO speed/pitch/emotion-token control; output is capped at 1000 speech tokens (~40 s)."""
import os, time, numpy as np, torch
from pathlib import Path
from common import TTS_REPO, active_reference, log
SUPPORTED = ["exaggeration", "cfg_weight", "temperature", "repetition_penalty", "min_p", "top_p"]
DEFAULTS = dict(exaggeration=0.64, cfg_weight=0.32, temperature=0.52, repetition_penalty=2.0, min_p=0.05, top_p=1.0)   # storytelling preset + library defaults
class Voice:
    def __init__(self, variant="dedicated_hindi", reference=None):
        import inspect
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"; t0 = time.time()
        loader = ChatterboxMultilingualTTS.from_pretrained
        sel = "t3_model" in inspect.signature(loader).parameters
        self.model = loader(device=self.device, t3_model="v3") if sel else loader(device=self.device)
        if variant == "dedicated_hindi":
            from safetensors.torch import load_file
            ck = Path(os.environ.get("CHATTERBOX_HINDI_T3_CHECKPOINT", str(TTS_REPO / "models/chatterbox-hindi/t3_hi.safetensors")))
            inc = self.model.t3.load_state_dict(load_file(str(ck), device="cpu"), strict=True)
            if inc.missing_keys or inc.unexpected_keys: raise RuntimeError("dedicated Hindi checkpoint mismatch")
        self.variant, self.sr, self.reference = variant, int(self.model.sr), reference or active_reference()
        self.model.prepare_conditionals(self.reference, exaggeration=DEFAULTS["exaggeration"])
        log(f"model loaded in {time.time()-t0:.1f}s variant={variant} device={self.device} sr={self.sr} reference={self.reference}")
    def generate(self, text, seed=42, **params):
        p = {**DEFAULTS, **params}; bad = [k for k in p if k not in SUPPORTED]
        if bad: raise ValueError(f"unsupported Chatterbox control(s): {bad}")
        torch.manual_seed(int(seed)); t0 = time.time()
        wav = self.model.generate(text, language_id="hi", **p)      # conditionals already prepared from the reference
        y = wav.squeeze(0).detach().cpu().numpy().astype(np.float32); return y, time.time() - t0
def trim(y, sr, thr=0.01, margin=0.06):
    m = np.abs(y); pk = m.max() if m.size else 0
    if pk <= 0: return y
    idx = np.nonzero(m > pk * thr)[0]
    if not len(idx): return y
    mg = int(margin * sr); return y[max(0, idx[0] - mg):min(len(y), idx[-1] + mg)]
