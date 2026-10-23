#!/usr/bin/env python3
"""Rebuilds assets/sound/music/*.m4a from the two CC0 sources (they are not kept in git: 46 MB).
  open-lofi    https://github.com/btahir/open-lofi        CC0 1.0; tracks only exist in a 554 MB release zip, so the zip's index is read over HTTP ranges and just the chosen tracks are pulled
  effacestudios https://github.com/effacestudios/Royalty-Free-Music-Pack  CC0 1.0 (the studio's own music), plain files
Each track is loudness-normalised to -23 LUFS (TP -3), high-passed at 55 Hz and stored as AAC 112k; the source, licence and processing of every file is in assets/sound/LEDGER.json.
usage: python3 tools/sound/fetch-music.py [--only <substring of a track label>]      (needs ffmpeg; no other dependency)
"""
import io, os, sys, json, zipfile, subprocess, urllib.request, urllib.parse, tempfile, hashlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUT = os.path.join(ROOT, "assets/sound/music"); LEDGER = os.path.join(ROOT, "assets/sound/LEDGER.json")
LOFI_ZIP = "https://github.com/btahir/open-lofi/releases/download/v1.0.0/openlofi.zip"
EFFACE = "https://raw.githubusercontent.com/effacestudios/Royalty-Free-Music-Pack/master/"
# mood -> (source, file in the source, label). Chosen by measurement (tempo, beat regularity, speech-band energy, bass weight) for narration beds; see the audit notes in the ledger.
TRACKS = {
 "sorrow": [("lofi", "glasshouse-ghosts"), ("lofi", "soft-weightless-hours"), ("lofi", "aurora-on-mute")],
 "war": [("efface", "The Templer", "the-templer"), ("efface", "Fury", "fury"), ("efface", "Mysterious", "mysterious")],
 "devotion": [("lofi", "bells-before-sunrise"), ("lofi", "teacup-morning-fog"), ("lofi", "misty-mountain-sunrise")],
 "cosmic": [("lofi", "warm-constellations"), ("lofi", "underwater-dreamscape"), ("lofi", "sea-glass-evening")],
 "river": [("lofi", "green-after-midnight"), ("lofi", "moonlit-moss"), ("lofi", "bamboo-shadow-waltz")],
 "neutral": [("lofi", "quiet-credits"), ("lofi", "first-light-on-the-ridge")]}

class HTTPFile(io.RawIOBase):
    def __init__(self, url):
        r = urllib.request.urlopen(urllib.request.Request(url, method="HEAD")); self.url = r.geturl(); self.size = int(r.headers["Content-Length"]); self.pos = 0
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0): self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off; return self.pos
    def read(self, n=-1):
        if n < 0 or self.pos + n > self.size: n = self.size - self.pos
        if n <= 0: return b""
        b = urllib.request.urlopen(urllib.request.Request(self.url, headers={"Range": f"bytes={self.pos}-{self.pos + n - 1}"})).read(); self.pos += len(b); return b
    def readinto(self, buf): b = self.read(len(buf)); buf[:len(b)] = b; return len(b)

def main():
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    os.makedirs(OUT, exist_ok=True); zf = None; led = json.load(open(LEDGER)); names = None; made = 0
    for mood, tracks in TRACKS.items():
        for t in tracks:
            src, label = t[0], t[-1]
            if only and only not in label: continue
            dst = os.path.join(OUT, f"{mood}-{label}.m4a")
            if os.path.exists(dst): print("have", os.path.basename(dst)); continue
            with tempfile.TemporaryDirectory() as td:
                raw = os.path.join(td, "in.mp3")
                if src == "lofi":
                    if zf is None: zf = zipfile.ZipFile(HTTPFile(LOFI_ZIP)); names = {os.path.basename(n): n for n in zf.namelist()}
                    open(raw, "wb").write(zf.read(names[label + ".mp3"]))
                else: open(raw, "wb").write(urllib.request.urlopen(EFFACE + urllib.parse.quote(t[1] + ".mp3")).read())
                r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-vn", "-map", "0:a:0", "-af", "highpass=f=55,loudnorm=I=-23:TP=-3:LRA=7", "-ar", "48000", "-c:a", "aac", "-b:a", "112k", dst]); assert r.returncode == 0, label
            made += 1; print("made", os.path.basename(dst), round(os.path.getsize(dst) / 1e6, 1), "MB")
    print(f"{made} track(s) rebuilt; ledger entries stay as written ({sum(1 for f in led['files'] if f['kind'] == 'music')} music files recorded)")
main()
