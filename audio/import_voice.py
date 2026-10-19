"""Import an EXTERNAL narration (ElevenLabs, Google, OpenAI, a human voice: any audio of the whole script read in order) for a story, instead of synthesising it with Chatterbox.
Writes stories/<story>/narration/voice/{narration.wav, segments.json, meta.json} in the same format synth.py writes, so every later step (director, camera, captions, sound, render) is unchanged.
How: ffmpeg normalises the file (mono 24 kHz, -23 LUFS); silence detection finds the pauses; a small dynamic programme picks, for every beat boundary, the pause nearest to where the word count says it should be;
then whisperx forced alignment (the same Hindi model synth.py uses) gives exact word times inside each beat's window. Needs the beats to be read in order, one pause (>= 0.18 s) between beats.
usage: python audio/import_voice.py <story> <audio file>"""
import sys, json, re, subprocess, math
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
def log(*a): print("[voice-import]", *a, flush=True)
def run(story, audio):
    sd = ROOT / "stories" / story; beats = [b for b in json.loads((sd / "beats.json").read_text(encoding="utf-8")) if b.get("text", "").strip()]; out = sd / "narration" / "voice"; out.mkdir(parents=True, exist_ok=True)
    raw = out / "external_raw.wav"; final = out / "narration.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(audio), "-ac", "1", "-ar", "24000", str(raw)], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", "loudnorm=I=-23:TP=-2:LRA=11", "-ar", "24000", str(final)], check=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(final)], capture_output=True, text=True).stdout.strip())
    sd_out = subprocess.run(["ffmpeg", "-i", str(final), "-af", "silencedetect=noise=-38dB:d=0.18", "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", sd_out)]; ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", sd_out)]
    sil = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else dur; sil.append((s, e))
    speech0 = sil[0][1] if sil and sil[0][0] < 0.05 else 0.0; speech1 = sil[-1][0] if sil and sil[-1][1] >= dur - 0.05 else dur
    cands = [((s + e) / 2, e - s) for s, e in sil if s > speech0 + 0.3 and e < speech1 - 0.3]
    n = len(beats); W = [len(b["text"].split()) for b in beats]; tot = sum(W); cum = 0; target = []
    for i in range(n - 1): cum += W[i]; target.append(speech0 + (speech1 - speech0) * cum / tot)
    log(f"{n} beats, {tot} words, speech {speech0:.1f}-{speech1:.1f} s of {dur:.1f} s, {len(cands)} pauses found")
    if len(cands) < n - 1: log(f"WARNING: only {len(cands)} pauses for {n-1} beat boundaries: boundaries will be approximate (add a clear pause between lines in your audio)")
    # dynamic programme: monotonic choice of one pause per boundary, minimising distance to the word-count target (long pauses preferred)
    C = len(cands); INF = 1e18; cost = [[INF] * C for _ in range(max(1, n - 1))]; back = [[-1] * C for _ in range(max(1, n - 1))]
    for i in range(n - 1):
        for c in range(C):
            d = abs(cands[c][0] - target[i]) - 0.15 * min(cands[c][1], 1.0)
            if i == 0: cost[i][c] = d
            else:
                best, bj = INF, -1
                for j in range(c):
                    if cost[i - 1][j] < best and cands[c][0] - cands[j][0] > 0.5: best, bj = cost[i - 1][j], j
                if bj >= 0: cost[i][c] = best + d; back[i][c] = bj
    bounds = []
    if n > 1 and C:
        c = min(range(C), key=lambda k: cost[n - 2][k]); path = [c]
        for i in range(n - 2, 0, -1): c = back[i][c]; path.append(c)
        bounds = [cands[k][0] for k in reversed(path)]
    if len(bounds) != n - 1: bounds = target   # fallback
    edges = [speech0] + bounds + [speech1]
    import whisperx
    model, meta = whisperx.load_align_model(language_code="hi", device="cpu"); wav = whisperx.load_audio(str(final)); segs = []
    for i, b in enumerate(beats):
        s0 = max(0.0, edges[i] - (0.0 if i == 0 else 0.1)); s1 = min(dur, edges[i + 1] + (0.0 if i == n - 1 else 0.1))
        res = whisperx.align([dict(start=s0, end=s1, text=b["text"])], model, meta, wav, "cpu", return_char_alignments=False)
        words = [dict(word=w["word"], start=round(float(w["start"]), 3), end=round(float(w["end"]), 3), score=round(float(w.get("score", 0)), 3)) for a in res["segments"] for w in a.get("words", []) if "start" in w and "end" in w]
        st = words[0]["start"] - 0.05 if words else s0; en = words[-1]["end"] + 0.08 if words else s1
        segs.append(dict(beat_id=b["id"], text=b["text"], start_seconds=round(max(0, st), 3), end_seconds=round(en, 3), words=words, phrases=[dict(id=b["id"] + ".1", text=b["text"], emotion=b.get("intent", "narrate"), start=round(max(0, st), 3), end=round(en, 3), tries=0)]))
    (out / "segments.json").write_text(json.dumps(dict(duration_seconds=round(dur, 3), segments=segs, source="external"), ensure_ascii=False, indent=1), encoding="utf-8")
    sp = sum(s["end_seconds"] - s["start_seconds"] for s in segs)
    (out / "meta.json").write_text(json.dumps(dict(story=story, source="external", audio=str(audio), words=tot, duration_s=round(dur, 2), speech_words_per_s=round(tot / sp, 2)), ensure_ascii=False, indent=1), encoding="utf-8")
    try: subprocess.run([sys.executable, str(Path(__file__).parent / "analyze.py"), str(final), "--segments", str(out / "segments.json"), "--out", str(out / "analysis.json")], check=True, capture_output=True)
    except Exception as e: log("analysis skipped: " + str(e)[:80])
    log(f"done: {len(segs)} beats aligned"); return out
if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2])
