"""Measures how 'robotic' Veena sounds under different sampling settings, keeping the same speaker (maitri).
Robotic speech has flat pitch (low F0 variation), metronome rhythm and glitches; the voice identity is the median pitch and timbre, which must stay put.
Run: PYTHONPATH="vendor/tts-repo/.vendor_py:audio" python audio/experiments/veena_naturalness.py"""
import sys, json, numpy as np, soundfile as sf, librosa, time
sys.path.insert(0, "audio")
from model_veena import Voice
LINES = ["सुबह आँख खुलते ही आप चाय माँगते हैं, और लगता है, ये बिल्कुल आपकी अपनी पसंद है।",
         "लेकिन सवा सौ साल पहले, ज़्यादातर भारतीयों के लिए चाय रोज़ की आदत थी ही नहीं।",
         "फ़ैसला आपका ही था, पर विकल्प किसी ने पहले से सजाए थे।"]
CONFIGS = [("t0.40", dict(temperature=0.40, top_p=0.90)), ("t0.60", dict(temperature=0.60, top_p=0.92)), ("t0.75", dict(temperature=0.75, top_p=0.95)), ("t0.90", dict(temperature=0.90, top_p=0.95))]
def stats(y, sr=24000):
    f0, vf, _ = librosa.pyin(y, fmin=70, fmax=420, sr=sr, frame_length=2048)
    v = f0[~np.isnan(f0)]
    if len(v) < 20: return None
    st = 12 * np.log2(v / np.median(v))
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=256)[0]; db = 20 * np.log10(rms + 1e-9)
    on = librosa.onset.onset_detect(y=y, sr=sr, hop_length=256, units="time")
    ioi = np.diff(on) if len(on) > 3 else np.array([1.0])
    mf = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13).mean(axis=1)
    return dict(dur=len(y) / sr, f0_med=float(np.median(v)), f0_std_semitones=float(np.std(st)), f0_range_semitones=float(np.percentile(st, 95) - np.percentile(st, 5)), voiced=float(len(v) / len(f0)), rhythm_cv=float(np.std(ioi) / (np.mean(ioi) + 1e-9)), loud_range_db=float(np.percentile(db, 95) - np.percentile(db, 20)), clip=float((np.abs(y) > 0.99).mean()), mfcc=mf.tolist())
v = Voice(speaker="maitri"); res = {}
for name, p in CONFIGS:
    rows = []
    for li, t in enumerate(LINES):
        for seed in (11, 12):
            t0 = time.time(); y, _ = v.generate(t, seed=seed, **p); sf.write(f"/tmp/veena-ab/{name}_l{li}_s{seed}.wav", y, 24000); s = stats(y)
            if s: s["gen_s"] = time.time() - t0; rows.append(s)
    res[name] = rows; print(name, "n=", len(rows), flush=True)
base = np.array([r["mfcc"] for r in res["t0.40"]]).mean(axis=0)
out = {}
for name, rows in res.items():
    m = lambda k: float(np.mean([r[k] for r in rows])); mf = np.array([r["mfcc"] for r in rows]).mean(axis=0)
    out[name] = dict(f0_med=round(m("f0_med"), 1), f0_std=round(m("f0_std_semitones"), 2), f0_range=round(m("f0_range_semitones"), 2), rhythm_cv=round(m("rhythm_cv"), 2), loud_range=round(m("loud_range_db"), 1), voiced=round(m("voiced"), 2), clip=round(m("clip"), 4), timbre_dist_vs_t040=round(float(np.linalg.norm(mf - base)), 1), dur=round(m("dur"), 2))
json.dump(out, open("/tmp/veena-ab/metrics.json", "w"), indent=1); print(json.dumps(out, indent=1))
