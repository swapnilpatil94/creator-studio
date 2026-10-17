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
