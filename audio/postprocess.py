"""Optional, conservative narration post-processing via ffmpeg. Original file is never modified; output goes to a new path.
Presets: off (copy), light (highpass + gentle de-ess + level-normalise), medium (adds light denoise, gentle compression, presence EQ).
Every chain ends with loudnorm to a target and a true-peak ceiling. Overprocessing is checked by comparing crest/LRA/noise floor before vs after."""
import subprocess, sys, json
from pathlib import Path
from common import ffmpeg
CHAINS = {
  "off": None,
  "light": "highpass=f=70,deesser=i=0.25:m=0.5:f=0.5,loudnorm=I={lufs}:TP={tp}:LRA=11",
  "warm": "highpass=f=70,equalizer=f=150:t=q:w=0.8:g=1.5,equalizer=f=3000:t=q:w=1.2:g=1.2,deesser=i=0.25:m=0.5:f=0.5,acompressor=threshold=-22dB:ratio=1.8:attack=25:release=250:makeup=1,loudnorm=I={lufs}:TP={tp}:LRA=11",
  # 2026-10-22 (owner: "the audio should be professional voiceover sounding"): documentary/trailer narrator chain -- de-mud at 320 Hz, chest warmth, 4 kHz presence, gentle air,
  # de-ess, two-stage compression (levelling then peak control), light harmonic exciter for the TTS's band-limited top, limiter. Measured on Veena narration: top band 15 dB under the mids.
  "broadcast": "highpass=f=85,lowshelf=f=140:g=2.5,equalizer=f=320:t=q:w=1.1:g=-2.5,equalizer=f=4200:t=q:w=1.0:g=2.5,highshelf=f=8500:g=1.5,deesser=i=0.4:m=0.5:f=0.45,acompressor=threshold=-24dB:ratio=3:attack=6:release=90:makeup=3:knee=4,acompressor=threshold=-14dB:ratio=6:attack=2:release=50:knee=2,aexciter=amount=0.8:drive=4:freq=6500:blend=0,alimiter=limit=0.89:attack=3:release=40,loudnorm=I={lufs}:TP={tp}:LRA=7",
  # 2026-10-23 (owner: the voice sometimes sounds rough and harsh, wants soft storytelling sound): the broadcast chain ADDED to the harshness of a neural voice (+2.5 dB at 4.2 kHz, a high shelf, an exciter that invents upper harmonics, a 2 ms attack compressor).
  # Measured on Tulsi's Veena take (2-5 kHz and 6-9 kHz energy relative to 200-1000 Hz, and frame-to-frame jitter of 2-6 kHz as a roughness proxy): source -15.9 / -31.7 dB, jitter 0.79; broadcast -14.1 / -24.2 dB, jitter 0.76;
  # storyteller -19.1 / -34.9 dB, jitter 0.45. It warms the chest, dips the 2.9 and 3.8 kHz bite, rolls the top off softly, de-esses firmly, levels with slow gentle compressors (no pumping) and adds a very small room tail so the voice sits in a space.
  "storyteller": "highpass=f=80,lowshelf=f=170:g=1.5,equalizer=f=300:t=q:w=1.1:g=-1.5,equalizer=f=2900:t=q:w=1.0:g=-2.0,equalizer=f=3800:t=q:w=1.4:g=-1.0,highshelf=f=6500:g=-1.5,lowpass=f=11000,deesser=i=0.6:m=0.5:f=0.45,acompressor=threshold=-22dB:ratio=2:attack=15:release=160:makeup=2:knee=6,acompressor=threshold=-15dB:ratio=3:attack=8:release=100:knee=4,alimiter=limit=0.89:attack=5:release=60,aecho=0.9:0.9:38|71:0.13|0.07,loudnorm=I={lufs}:TP={tp}:LRA=9",
  "medium": "highpass=f=75,afftdn=nr=8:nf=-45:tn=0,deesser=i=0.3:m=0.5:f=0.5,equalizer=f=3200:t=q:w=1.2:g=1.2,acompressor=threshold=-24dB:ratio=2:attack=20:release=200:makeup=2,loudnorm=I={lufs}:TP={tp}:LRA=9",
}
def process(src, dst, preset="light", lufs=-18, tp=-2.0):
    src, dst = str(src), str(dst)
    chain = CHAINS[preset]
    if chain is None:
        subprocess.run(["cp", src, dst], check=True); return dst
    af = chain.format(lufs=lufs, tp=tp)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", af, "-ar", "24000", "-ac", "1", dst], check=True)
    return dst
if __name__ == "__main__":
    print(process(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "light"))
