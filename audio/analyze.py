#!/usr/bin/env python
"""Objective narration measurements (proxies, NOT emotional quality): loudness, clipping, silence, joins, pacing, pitch dynamics, optional ASR round-trip.
usage: analyze.py <narration.wav> [--segments segs.json] [--joins 12.3,18.1] [--out report.json] [--asr script.txt]"""
import argparse, json, re, subprocess, sys, unicodedata, difflib
import numpy as np, soundfile as sf, librosa, pyloudnorm as pyln
SR = 24000
def load(path):
    y, sr = sf.read(path, dtype="float32", always_2d=True); y = y.mean(axis=1)
    return (librosa.resample(y, orig_sr=sr, target_sr=SR) if sr != SR else y), SR
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(np.square(x)) + 1e-12) + 1e-12)
def frames_rms_db(y, win=0.05, hop=0.025):
    n, h = int(win * SR), int(hop * SR)
    return np.array([rms_db(y[i:i + n]) for i in range(0, max(1, len(y) - n), h)]), hop
def f0_track(y):
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000)
    f0, voiced, _ = librosa.pyin(y16, fmin=65, fmax=330, sr=16000, frame_length=1024, hop_length=160)
    return f0, voiced, 0.01
def semitone_stats(f0, mask):
    v = f0[mask & np.isfinite(f0)]
    if len(v) < 20: return dict(mean_hz=None, std_st=None, range_st=None)
    st = 12 * np.log2(v / np.median(v))
    return dict(mean_hz=float(np.mean(v)), std_st=float(np.std(st)), range_st=float(np.percentile(st, 95) - np.percentile(st, 5)))
def cer(ref, hyp):
    norm = lambda s: re.sub(r"[\s\"'“”‘’,.;:!?।…\-–—()\[\]]+", "", unicodedata.normalize("NFC", s)).lower()
    r, h = norm(ref), norm(hyp); sm = difflib.SequenceMatcher(None, r, h)
    return dict(similarity=round(sm.ratio(), 3), ref_chars=len(r), hyp_chars=len(h))
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("wav"); ap.add_argument("--segments"); ap.add_argument("--joins", default=""); ap.add_argument("--out"); ap.add_argument("--asr"); ap.add_argument("--asr-model", default="small"); a = ap.parse_args()
    y, sr = load(a.wav); dur = len(y) / sr; rep = dict(file=a.wav, duration_s=round(dur, 3))
    peak = float(np.max(np.abs(y))); rep["peak_dbfs"] = round(20 * np.log10(peak + 1e-12), 2); rep["clipped_samples"] = int(np.sum(np.abs(y) >= 0.999))
    meter = pyln.Meter(sr); rep["lufs_integrated"] = round(float(meter.integrated_loudness(y)), 2)
    lra = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", a.wav, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"LRA:\s+(-?[\d.]+) LU", lra); tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", lra)
    rep["lra_lu"] = float(m[-1]) if m else None; rep["true_peak_dbfs"] = float(tp[-1]) if tp else None
    fr, hop = frames_rms_db(y); speech_db = np.percentile(fr, 90); thr = max(speech_db - 28, -62); sp = fr > thr
    rep["noise_floor_dbfs"] = round(float(np.percentile(fr, 8)), 1); rep["crest_db"] = round(rep["peak_dbfs"] - rms_db(y[np.abs(y) > 10 ** (thr / 20)]), 1) if np.any(sp) else None
    rep["speech_ratio"] = round(float(sp.mean()), 3)
    # pauses (silent runs between speech), start/end excluded
    pauses = []; i = 0; first = int(np.argmax(sp)); last = len(sp) - 1 - int(np.argmax(sp[::-1]))
    while i <= last:
        if first <= i and not sp[i]:
            j = i
            while j <= last and not sp[j]: j += 1
            if (j - i) * hop >= 0.3: pauses.append(dict(at=round(i * hop, 2), len=round((j - i) * hop, 2)))
            i = j
        else: i += 1
    rep["pauses"] = pauses; rep["longest_pause_s"] = max([p["len"] for p in pauses], default=0); rep["pauses_over_1_2s"] = [p for p in pauses if p["len"] > 1.2]
    # abrupt cuts / clicks: sample-to-sample jumps far above local speech
    d = np.abs(np.diff(y)); loc = np.convolve(d, np.ones(480) / 480, mode="same") + 1e-6; clicks = np.where(d > 14 * loc)[0]; clicks = clicks[(clicks > 480) & (clicks < len(y) - 480)]
    rep["click_events"] = int(len(np.unique(clicks // 240)))
    # pitch
    f0, voiced, fh = f0_track(y); rep["voiced_ratio"] = round(float(np.mean(voiced)), 3); rep["pitch"] = {k: (round(v, 2) if v is not None else None) for k, v in semitone_stats(f0, voiced).items()}
    # per beat
    beats = []
    if a.segments:
        segs = json.load(open(a.segments))["segments"]
        for s in segs:
            t0, t1 = s["start_seconds"], s["end_seconds"]; seg = y[int(t0 * sr):int(t1 * sr)]; f0m = np.zeros(len(f0), bool); f0m[int(t0 / fh):int(t1 / fh)] = True; msk = f0m & voiced
            w = len(s.get("words") or s["text"].split()); st = semitone_stats(f0, msk); sfr, _ = frames_rms_db(seg) if len(seg) > 1200 else (np.array([rms_db(seg)]), 0)
            beats.append(dict(id=s["beat_id"], start=round(t0, 2), end=round(t1, 2), words=w, words_per_s=round(w / max(0.1, t1 - t0), 2), chars_per_s=round(len(re.sub(r"\s", "", s["text"])) / max(0.1, t1 - t0), 1),
                              rms_dbfs=round(rms_db(seg[np.abs(seg) > 10 ** (thr / 20)]) if np.any(np.abs(seg) > 10 ** (thr / 20)) else -90, 1), peak_dbfs=round(20 * np.log10(np.max(np.abs(seg)) + 1e-12), 1), f0_mean_hz=None if st["mean_hz"] is None else round(st["mean_hz"], 1), f0_std_st=None if st["std_st"] is None else round(st["std_st"], 2), f0_range_st=None if st["range_st"] is None else round(st["range_st"], 2), energy_std_db=round(float(np.std(sfr[sfr > thr])) if np.any(sfr > thr) else 0, 2)))
        rep["beats"] = beats; r = np.array([b["rms_dbfs"] for b in beats]); rep["beat_loudness"] = dict(std_db=round(float(np.std(r)), 2), max_dev_from_median_db=round(float(np.max(np.abs(r - np.median(r)))), 2))
        rep["rate"] = dict(mean_words_per_s=round(sum(b["words"] for b in beats) / sum(b["end"] - b["start"] for b in beats), 2), fastest=max(b["words_per_s"] for b in beats), slowest=min(b["words_per_s"] for b in beats))
        rep["pitch_dynamics"] = dict(mean_f0_std_st=round(float(np.mean([b["f0_std_st"] for b in beats if b["f0_std_st"] is not None])), 2), mean_f0_range_st=round(float(np.mean([b["f0_range_st"] for b in beats if b["f0_range_st"] is not None])), 2), between_beat_f0_spread_st=round(float(np.std([12 * np.log2(b["f0_mean_hz"] / np.median([x["f0_mean_hz"] for x in beats if x["f0_mean_hz"]])) for b in beats if b["f0_mean_hz"]])), 2))
        # boundaries between beats; those that coincide with independent-take joins (--joins) are reported separately
        given = [float(x) for x in a.joins.split(",") if x]; joins = []
        for i in range(len(beats) - 1):
            e, st_ = beats[i]["end"], beats[i + 1]["start"]; t = (e + st_) / 2
            lo = y[max(0, int((e - 0.40) * sr)):int(e * sr)]; hi = y[int(st_ * sr):int((st_ + 0.40) * sr)]; lo = lo[np.abs(lo) > 10 ** (thr / 20)]; hi = hi[np.abs(hi) > 10 ** (thr / 20)]
            if len(lo) < 800 or len(hi) < 800: continue
            ia = int(e / fh); ib = int(st_ / fh); fa = f0[max(0, ia - 40):ia]; fb = f0[ib:ib + 40]; ma = voiced[max(0, ia - 40):ia]; mb = voiced[ib:ib + 40]
            fj = None
            if np.sum(ma & np.isfinite(fa)) > 5 and np.sum(mb & np.isfinite(fb)) > 5: fj = float(12 * np.log2(np.nanmedian(fb[mb]) / np.nanmedian(fa[ma])))
            joins.append(dict(at=round(t, 2), take_join=any(abs(t - g) < 0.7 for g in given), loudness_jump_db=round(float(rms_db(hi) - rms_db(lo)), 2), pitch_jump_st=None if fj is None else round(fj, 2)))
        rep["boundaries"] = joins
        for tag, sel in (("take_joins", [j for j in joins if j["take_join"]]), ("within_take", [j for j in joins if not j["take_join"]])):
            pj = [abs(j["pitch_jump_st"]) for j in sel if j["pitch_jump_st"] is not None]
            rep[tag] = dict(n=len(sel), loudness_jump_abs_mean_db=round(float(np.mean([abs(j["loudness_jump_db"]) for j in sel])), 2) if sel else None, pitch_jump_abs_mean_st=round(float(np.mean(pj)), 2) if pj else None)
    if a.asr:
        from faster_whisper import WhisperModel
        mdl = WhisperModel(a.asr_model, device="cpu", compute_type="int8"); segs_, _ = mdl.transcribe(a.wav, language="hi", beam_size=5, condition_on_previous_text=False); hyp = " ".join(s.text for s in segs_)
        rep["asr"] = dict(model=a.asr_model, text=hyp.strip()[:500], **cer(open(a.asr, encoding="utf-8").read(), hyp))
    if a.out: json.dump(rep, open(a.out, "w"), ensure_ascii=False, indent=1)
    keys = ["duration_s", "peak_dbfs", "true_peak_dbfs", "clipped_samples", "lufs_integrated", "lra_lu", "noise_floor_dbfs", "crest_db", "speech_ratio", "longest_pause_s", "click_events", "voiced_ratio"]
    print(json.dumps({k: rep.get(k) for k in keys}, ensure_ascii=False)); 
    for k in ["rate", "beat_loudness", "pitch", "pitch_dynamics", "take_joins", "within_take", "asr"]:
        if k in rep: print(k, json.dumps(rep[k], ensure_ascii=False))
if __name__ == "__main__":
    main()
