#!/usr/bin/env python3
"""Synthesizes the background music beds in assets/music/ from scratch (own work, no licence questions):
a Karplus-Strong tanpura cycle (Pa Sa Sa kharaj-Sa, tuned to the cue bed's 98 Hz root) over a slow mood pad,
plus a heartbeat drum for war. Each file is seamless when looped (the tail is crossfaded into the head).
usage: python3 tools/reel/make-music-beds.py [outdir]"""
import sys, os
import numpy as np
from scipy.signal import lfilter, butter, sosfiltfilt
from scipy.io import wavfile

SR, LEN, XF = 48000, 120.0, 4.0
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "../../assets/music")
SA = 196.0

def pluck(f, dur, bright, rng):
    n, D = int(dur * SR), int(round(SR / f))
    buf, out, idx = rng.uniform(-1, 1, D) * np.hanning(D) ** 0.3, np.zeros(n), 0
    decay = 0.4985 + 0.0013 * (1 - bright)
    for i in range(n):
        a, b = buf[idx], buf[(idx + 1) % D]
        v = decay * (a + b)
        buf[idx] = v; out[i] = a; idx = (idx + 1) % D
    jw = np.tanh(out * (2.2 + 2.5 * bright)) / np.tanh(2.2 + 2.5 * bright)   # jawari buzz
    env = np.minimum(1, np.arange(n) / (0.004 * SR))
    return (0.55 * out + 0.45 * jw) * env

def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)

def reverb(x, wet):
    y = np.zeros_like(x)
    for d, g in [(1557, 0.84), (1617, 0.83), (1491, 0.85), (1422, 0.86), (1277, 0.87), (1356, 0.86)]:
        a = np.zeros(d + 1); a[0], a[d] = 1, -g
        y += lfilter([1], a, x)
    for d in (225, 556):
        b = np.zeros(d + 1); a = np.zeros(d + 1); b[0], b[d], a[0], a[d] = -0.5, 1, 1, -0.5
        y = lfilter(b, a, y)
    return (1 - wet) * x + wet * y / 6

def pad(t, freqs, cutoff, lfo_rate, rng):
    x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ph = rng.uniform(0, 2 * np.pi)
            ff = f * (1 + det / 100 * 5)
            for h in range(1, 9):
                x += np.sin(2 * np.pi * ff * h * t + ph * h) / h ** 1.15
    x = lowpass(lowpass(x, cutoff), cutoff * 1.4)
    swell = 0.62 + 0.38 * np.sin(2 * np.pi * lfo_rate * t - np.pi / 2)
    return x * swell

def drum(t, bpm, rng):
    x, beat = np.zeros_like(t), 60 / bpm
    k = np.arange(int(0.7 * SR)) / SR
    hit = np.sin(2 * np.pi * (48 * k + 70 * (1 - np.exp(-k * 28)) / 28)) * np.exp(-k * 6.5)
    for i, tt in enumerate(np.arange(0.0, t[-1], beat)):
        for off, g in ((0.0, 1.0), (0.24 * beat, 0.55)):   # lub-dub
            s = int((tt + off) * SR)
            if s >= len(x): continue
            e = min(len(x), s + len(hit)); x[s:e] += hit[:e - s] * g * (0.85 + 0.15 * rng.random())
    return x

MOODS = {
    #           pad intervals over Sa,            cutoff, lfo,   tanpura gain, cycle s, drum bpm, reverb
    "devotion": ([0.5, 0.75, 1.0, 1.25],          1400, 1/22, 0.55, 2.9, None, 0.35),
    "sorrow":   ([0.5, 0.75, 1.0, 1.2],           750,  1/26, 0.45, 3.4, None, 0.45),
    "war":      ([0.25, 0.5, 0.75, 1.0, 1.0667],  900,  1/14, 0.40, 2.4, 64,   0.30),
    "cosmic":   ([0.5, 1.0, 1.5, 2.0, 2.25],      2200, 1/30, 0.30, 3.8, None, 0.60),
    "river":    ([0.5, 0.75, 1.0, 1.125],         1600, 1/18, 0.50, 2.7, None, 0.40),
    "neutral":  ([0.5, 0.75, 1.0],                1100, 1/24, 0.50, 3.0, None, 0.38),
}

def make(mood, spec):
    ivs, cutoff, lfo, tg, cyc, bpm, wet = spec
    rng = np.random.default_rng(sum(ord(c) * 31 ** i for i, c in enumerate(mood)) % 2**32)
    n = int((LEN + XF) * SR); t = np.arange(n) / SR
    strings = [(SA * 0.75, -0.35), (SA, 0.15), (SA, -0.1), (SA * 0.5, 0.3)]   # Pa, Sa, Sa, kharaj Sa
    tones = [pluck(f, cyc * 1.6, 0.6, rng) for f, _ in strings]
    L, R = np.zeros(n), np.zeros(n)
    step = cyc / 4
    for c, start in enumerate(np.arange(0, LEN + XF, cyc)):
        for j, ((f, pan), tone) in enumerate(zip(strings, tones)):
            s = max(0, int((start + j * step + rng.normal(0, 0.012)) * SR))
            if s >= n: continue
            e = min(n, s + len(tone)); g = tg * (0.8 + 0.2 * rng.random()) * (1.15 if j == 3 else 1)
            L[s:e] += tone[:e - s] * g * (1 - pan) / 2; R[s:e] += tone[:e - s] * g * (1 + pan) / 2
    p = pad(t, [SA * i for i in ivs], cutoff, lfo, rng) * 0.11
    L += p; R += np.roll(p, int(0.011 * SR))
    if bpm:
        d = drum(t, bpm, rng) * 0.55
        d *= 0.35 + 0.65 * np.clip(t / 40, 0, 1)   # slow build
        L += d; R += d
    L, R = reverb(L, wet), reverb(R, wet)
    N, F = int(LEN * SR), int(XF * SR)
    fade = np.linspace(0, 1, F)
    out = np.stack([L[:N], R[:N]], 1)
    out[:F] = out[:F] * fade[:, None] + np.stack([L[N:N + F], R[N:N + F]], 1) * (1 - fade[:, None])
    out = sosfiltfilt(butter(2, 60, "highpass", fs=SR, output="sos"), out, axis=0)   # sub rumble would fight the narration's low end
    out /= np.max(np.abs(out)) / 0.89
    return out

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for mood, spec in MOODS.items():
        x = make(mood, spec)
        f = os.path.join(OUT, f"{mood}-tanpura-drone.wav")
        wavfile.write(f, SR, (x * 32767).astype(np.int16))
        print(f, f"{len(x)/SR:.0f}s")
