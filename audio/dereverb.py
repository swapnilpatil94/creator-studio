"""Single-channel dereverberation with WPE (weighted prediction error, nara_wpe, MIT): removes the late-reverb tail of a voice take without touching the dry speech.
Runs in its own venv (~/.venvs/kathaaya-voice: pip install nara_wpe soundfile numpy scipy) so the shared pipeline interpreter is not disturbed.
usage: ~/.venvs/kathaaya-voice/bin/python audio/dereverb.py in.wav out.wav [taps] [delay] [iterations]"""
import sys, numpy as np, soundfile as sf
from nara_wpe.wpe import wpe
from nara_wpe.utils import stft, istft
def dereverb(y, taps=12, delay=2, iterations=3, size=512, shift=128):
    Y = stft(y[None, :], size=size, shift=shift)            # (D=1, T, F)
    Z = wpe(Y.transpose(2, 0, 1), taps=taps, delay=delay, iterations=iterations, statistics_mode="full").transpose(1, 2, 0)
    z = istft(Z, size=size, shift=shift)[0]; z = z[:len(y)]
    return np.pad(z, (0, len(y) - len(z))).astype(np.float32)
if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]; taps = int(sys.argv[3]) if len(sys.argv) > 3 else 12; delay = int(sys.argv[4]) if len(sys.argv) > 4 else 2; it = int(sys.argv[5]) if len(sys.argv) > 5 else 3
    y, sr = sf.read(src, dtype="float32"); y = y if y.ndim == 1 else y.mean(1); z = dereverb(y, taps, delay, it); g = np.sqrt(np.mean(y ** 2)) / (np.sqrt(np.mean(z ** 2)) + 1e-9); sf.write(dst, z * min(g, 2.0), sr)
