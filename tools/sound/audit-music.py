# Audit used to pick the sound library (2026-10-22): measures tempo, beat regularity (pulse), transient spikiness, bass/speech-band share, brightness and loudness range per track, since a bed under narration should be calm and leave the 1-4 kHz band to the voice. Run from a folder holding dl/efface and dl/lofi (see fetch-music.py for the sources).
import sys, os, json, glob, subprocess, numpy as np, librosa, warnings; warnings.filterwarnings("ignore")
rows = []
files = sorted(glob.glob("dl/efface/*.mp3")) + sorted(glob.glob("dl/lofi/*.mp3"))
for f in files:
    try:
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)
        off = max(0, min(dur / 2 - 20, dur - 45))
        y, sr = librosa.load(f, sr=22050, mono=True, offset=off, duration=40)
        S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512)); fr = librosa.fft_frequencies(sr=sr, n_fft=2048)
        tot = S.sum() + 1e-9; low = S[fr < 150].sum() / tot; speech = S[(fr > 1000) & (fr < 4000)].sum() / tot; hi = S[fr > 6000].sum() / tot
        oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512); tempo = float(np.atleast_1d(librosa.beat.beat_track(onset_envelope=oenv, sr=sr)[0])[0])
        ac = librosa.autocorrelate(oenv - oenv.mean()); ac = ac / (ac[0] + 1e-9); pulse = float(ac[10:200].max())   # beat regularity: near 1 = a steady drum pulse
        perc = float(np.percentile(oenv, 90) / (np.mean(oenv) + 1e-9))                                           # transient spikiness
        rms = librosa.feature.rms(y=y, hop_length=512)[0]; rdb = 20 * np.log10(rms + 1e-6); dr = float(np.percentile(rdb, 95) - np.percentile(rdb, 10))
        cent = float(librosa.feature.spectral_centroid(y=y, sr=sr).mean())
        rows.append(dict(file=f, dur=round(dur), tempo=round(tempo), pulse=round(pulse, 2), spiky=round(perc, 2), low=round(float(low), 2), speech=round(float(speech), 2), hi=round(float(hi), 3), dr=round(dr, 1), centroid=round(cent)))
        print(os.path.basename(f)[:42].ljust(42), rows[-1]["dur"], "bpm", rows[-1]["tempo"], "pulse", rows[-1]["pulse"], "spiky", rows[-1]["spiky"], "low", rows[-1]["low"], "speech", rows[-1]["speech"], "dr", rows[-1]["dr"], flush=True)
    except Exception as e: print("ERR", f, str(e)[:80], flush=True)
json.dump(rows, open("audit/music-analysis.json", "w"), indent=1)
