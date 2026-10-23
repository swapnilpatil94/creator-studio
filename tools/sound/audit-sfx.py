# Audit used to pick the sound effects (2026-10-22): duration, attack, brightness and bass share of each candidate CC0 sample, to choose a whoosh/impact/riser by its measured character. Reads the Barty-Bart/motion-graphics sfx folder.
import glob, os, json, numpy as np, librosa, warnings; warnings.filterwarnings("ignore")
base = "dl/barty/skills/sound-effects/sfx/"; rows = []
for cat in ["typing", "transition", "riser", "impact", "whoosh", "glitch", "ding", "pop", "tick", "click"]:
    for f in sorted(glob.glob(base + cat + "/*.ogg")):
        y, sr = librosa.load(f, sr=22050, mono=True); d = len(y) / sr; pk = float(np.abs(y).max()); env = librosa.feature.rms(y=y, hop_length=256)[0]; peakt = float(env.argmax() * 256 / sr)
        cent = float(librosa.feature.spectral_centroid(y=y, sr=sr).mean()); S = np.abs(librosa.stft(y, n_fft=1024)); fr = librosa.fft_frequencies(sr=sr, n_fft=1024); low = float(S[fr < 200].sum() / (S.sum() + 1e-9))
        on = librosa.onset.onset_detect(y=y, sr=sr, units="time"); rows.append(dict(cat=cat, file=os.path.basename(f), dur=round(d, 2), peak_at=round(peakt, 2), centroid=round(cent), low=round(low, 2), onsets=len(on)))
for r in rows: print(r["cat"].ljust(10), r["file"][:44].ljust(44), "dur", str(r["dur"]).ljust(5), "peak@", str(r["peak_at"]).ljust(5), "cent", str(r["centroid"]).ljust(5), "low", r["low"], "hits", r["onsets"])
json.dump(rows, open("audit/sfx-analysis.json", "w"), indent=1)
