#!/usr/bin/env python
"""Control discovery: change ONE supported Chatterbox control at a time on a fixed sentence/seed; measure duration, pitch dynamics, loudness, intelligibility.
Includes a seed-noise floor (same settings, different seeds) so effects are only trusted when they exceed run-to-run noise.
usage: sweep.py [--out audio/experiments/sweep]"""
import argparse, json, sys, time, numpy as np, soundfile as sf
from pathlib import Path
from model import Voice, trim, DEFAULTS
import analyze as A
SENT = {"narrative": "तभी जाम्बवान ने कहा — तुम पवनपुत्र हो। तुम्हारे लिए ये समुद्र कुछ भी नहीं।", "question": "क्या वो सच में अकेला था? नहीं। उसके साथ उसका हौसला था।"}
SWEEPS = {"exaggeration": [0.3, 0.5, 0.8, 1.0], "cfg_weight": [0.0, 0.15, 0.5, 0.7], "temperature": [0.3, 0.8, 1.0], "repetition_penalty": [1.2, 3.0], "min_p": [0.02, 0.15], "top_p": [0.8]}
def metrics(y, sr, text):
    y = trim(y, sr); yy = A.librosa.resample(y, orig_sr=sr, target_sr=A.SR) if sr != A.SR else y
    fr, hop = A.frames_rms_db(yy); thr = max(np.percentile(fr, 90) - 28, -62); sp = fr > thr
    f0, vo, fh = A.f0_track(yy); st = A.semitone_stats(f0, vo); words = len(text.split()); dur = len(yy) / A.SR
    return dict(dur_s=round(dur, 2), words_per_s=round(words / dur, 2), f0_std_st=None if st["std_st"] is None else round(st["std_st"], 2), f0_range_st=None if st["range_st"] is None else round(st["range_st"], 2), f0_mean_hz=None if st["mean_hz"] is None else round(st["mean_hz"], 1),
                rms_dbfs=round(float(A.rms_db(yy[np.abs(yy) > 10 ** (thr / 20)])), 1), energy_std_db=round(float(np.std(fr[sp])), 2), peak_dbfs=round(float(20 * np.log10(np.abs(yy).max() + 1e-9)), 1))
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default=str(Path(__file__).parent / "experiments/sweep")); a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    v = Voice(); res = []
    def run(sent, label, seed=42, **p):
        t0 = time.time(); y, gen = v.generate(SENT[sent], seed=seed, **p); sf.write(out / f"{sent}_{label}.wav", y, v.sr); m = metrics(y, v.sr, SENT[sent])
        rec = dict(sentence=sent, label=label, seed=seed, params=p, gen_s=round(gen, 1), **m); res.append(rec); print(json.dumps(rec, ensure_ascii=False), flush=True); json.dump(res, open(out / "results.json", "w"), ensure_ascii=False, indent=1)
    for s in SENT:
        for seed in (42, 7, 123, 2024): run(s, f"base_seed{seed}", seed=seed)           # noise floor
    for ctl, vals in SWEEPS.items():
        for val in vals:
            for s in (["narrative", "question"] if ctl in ("exaggeration", "cfg_weight") else ["narrative"]): run(s, f"{ctl}={val}", **{ctl: val})
