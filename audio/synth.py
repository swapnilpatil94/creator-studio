"""Synthesize a directed narration variant from beats.json into stories/<story>/narration/variants/<name>/ (never touches raw.wav).
Per beat: text prep -> generate (supported controls only) -> trim -> optional atempo -> RMS-match to target -> fades -> designed gap. Then optional post preset
and alignment-only whisperx (no gap splicing, so designed pauses survive). Writes narration.wav, segments.json (same schema as raw.wav.segments.json), meta.json."""
import argparse, json, sys, subprocess, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from common import ROOT, log
import textprep, director, postprocess
from model import Voice, trim
SR = 24000
def rms_db(y): return 20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-9)
def atempo(y, f):
    if abs(f - 1) < 0.005: return y
    with tempfile.TemporaryDirectory() as d:
        a, b = f"{d}/a.wav", f"{d}/b.wav"; sf.write(a, y, SR)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-filter:a", f"atempo={f}", b], check=True)
        return sf.read(b, dtype="float32")[0]
def fade(y, ms=12):
    n = int(SR * ms / 1000); y = y.copy()
    if len(y) > 2 * n: y[:n] *= np.linspace(0, 1, n); y[-n:] *= np.linspace(1, 0, n)
    return y
def align(wav, segs):
    """Alignment-only whisperx: words per beat; no splicing."""
    import whisperx
    model, meta = whisperx.load_align_model(language_code="hi", device="cpu"); audio = whisperx.load_audio(str(wav))
    tr = [dict(start=s["start_seconds"], end=s["end_seconds"], text=s["text"]) for s in segs]
    res = whisperx.align(tr, model, meta, audio, "cpu", return_char_alignments=False)
    for s, a in zip(segs, res["segments"]):
        s["words"] = [dict(word=w["word"], start=round(float(w["start"]), 3), end=round(float(w["end"]), 3), score=round(float(w.get("score", 0)), 3)) for w in a.get("words", []) if "start" in w and "end" in w]
    return segs
CACHE = ROOT / "audio" / "cache" / "takes"
def take(voice, spoken, p):
    """Raw (trimmed, untempo'd) take, cached by text+controls+seed+reference so tempo/pause/post tweaks re-assemble without regenerating."""
    import hashlib
    key = hashlib.sha1(json.dumps([spoken, p["params"], p["seed"], str(voice.reference), voice.variant], ensure_ascii=False).encode()).hexdigest()[:16]
    f = CACHE / f"{key}.npy"; CACHE.mkdir(parents=True, exist_ok=True)
    if f.exists(): return np.load(f), 0.0
    y, gen = voice.generate(spoken, seed=p["seed"], **p["params"]); y = trim(y, SR); np.save(f, y); return y, gen
def run(story, name, mode="director", post="light", punct="director", target_db=-23.0, do_align=True, voice=None, global_tempo=None, pause_scale=1.0, room_tone=True):
    sd = ROOT / "stories" / story; beats = json.loads((sd / "beats.json").read_text(encoding="utf-8"))
    out = sd / "narration" / "variants" / name; out.mkdir(parents=True, exist_ok=True)
    voice = voice or Voice()
    gt = global_tempo
    plans = director.plan(beats, global_tempo=gt, pause_scale=pause_scale) if mode == "director" else [dict(id=b["id"], text=b["text"], intent="baseline", params={}, tempo=1.0, pause_after=0.35, seed=42, words=len(b["text"].split())) for b in beats]
    chunks, segs, t, lead = [], [], 0.0, 0.0
    for p in plans:
        spoken = textprep.prepare(p["text"], punct=punct if mode == "director" else "asis")
        y, gen = take(voice, spoken, p)
        y = atempo(y, p["tempo"])
        if mode == "director":
            y = y * 10 ** ((target_db - rms_db(y)) / 20) if abs(target_db - rms_db(y)) < 6 else y * 10 ** (np.clip(target_db - rms_db(y), -6, 6) / 20)
            y = fade(y * 10 ** (p.get('gain_db', 0.0) / 20))
        gap = np.zeros(int(SR * p["pause_after"]), dtype=np.float32)
        segs.append(dict(beat_id=p["id"], text=p["text"], spoken=spoken, intent=p["intent"], params=p["params"], tempo=p["tempo"], start_seconds=round(t, 3), end_seconds=round(t + len(y) / SR, 3), gen_s=round(gen, 1)))
        chunks += [y, gap]; t += (len(y) + len(gap)) / SR; log(f"{p['id']} {p['intent']} {p['params']} dur={len(y)/SR:.2f}s gen={gen:.1f}s")
    y = np.concatenate(chunks)
    rt = director.CFG.get('voice_profile', {}).get('room_tone_dbfs') if mode == 'director' and room_tone else None
    if rt is not None:
        rng = np.random.default_rng(7); n = rng.standard_normal(len(y)).astype(np.float32); n = np.cumsum(n) ; n -= np.convolve(n, np.ones(2400) / 2400, mode='same'); n *= 10 ** (rt / 20) / (np.sqrt(np.mean(n ** 2)) + 1e-9); y = y + n
    y = y / max(1.0, np.abs(y).max() / 0.89)
    raw = out / "pre_post.wav"; sf.write(raw, y, SR)
    final = out / "narration.wav"; postprocess.process(raw, final, post if mode == "director" else "off")
    if do_align: segs = align(final, segs)
    (out / "segments.json").write_text(json.dumps(dict(segments=segs), ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "meta.json").write_text(json.dumps(dict(story=story, name=name, mode=mode, post=post, punct=punct, controls_used=sorted({k for p in plans for k in p["params"]}), plan=plans), ensure_ascii=False, indent=1), encoding="utf-8")
    return out
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("story"); ap.add_argument("name"); ap.add_argument("--mode", default="director"); ap.add_argument("--post", default="light"); ap.add_argument("--punct", default="director"); ap.add_argument("--no-align", action="store_true"); ap.add_argument("--tempo", type=float, default=None); ap.add_argument("--pause-scale", type=float, default=1.0)
    a = ap.parse_args(); print(run(a.story, a.name, a.mode, a.post, a.punct, do_align=not a.no_align, global_tempo=a.tempo, pause_scale=a.pause_scale))
