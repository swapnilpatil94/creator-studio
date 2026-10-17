"""Synthesize ONE directed narration for a story: stories/<story>/narration/voice/{narration.wav, segments.json, meta.json, analysis.json}. Never touches raw.wav.
beats -> phrases with an emotion each (director.py) -> text prep -> Chatterbox take (supported controls only; a take that fails objective sanity checks is regenerated
with the next seed automatically, there are no variants to choose from) -> trim -> atempo -> loudness match + emotion gain -> designed pauses -> room tone -> post chain -> alignment-only whisperx."""
import argparse, json, subprocess, sys, tempfile, hashlib
from pathlib import Path
import numpy as np, soundfile as sf
from common import ROOT, log
import textprep, director, postprocess
from model import Voice, trim
SR = 24000; CACHE = ROOT / "audio" / "cache" / "takes"
def rms_db(y): return 20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-9)
def atempo(y, f):
    if abs(f - 1) < 0.005: return y
    with tempfile.TemporaryDirectory() as d:
        a, b = f"{d}/a.wav", f"{d}/b.wav"; sf.write(a, y, SR); subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-filter:a", f"atempo={f}", b], check=True); return sf.read(b, dtype="float32")[0]
def fade(y, ms_in=8, ms_out=30):
    a, b = int(SR * ms_in / 1000), int(SR * ms_out / 1000); y = y.copy()
    if len(y) > a + b: y[:a] *= np.linspace(0, 1, a); y[-b:] *= np.linspace(1, 0, b)
    return y
def longest_internal_silence(y, thr_db=-45, hop=0.02):
    n = int(SR * hop); fr = [rms_db(y[i:i + n]) for i in range(0, len(y) - n, n)]; best = cur = 0
    for v in fr[2:-2]: cur = cur + 1 if v < thr_db else 0; best = max(best, cur)
    return best * hop
def tighten(y):
    """TTS stretches commas/dashes into long gaps that kill reels pace: shrink silences inside a take longer than min_gap to keep_gap (the pause stays audible, the drag goes)."""
    T = director.LIM["tighten"]; n = int(SR * 0.01); thr = T["silence_db"]; fr = [rms_db(y[i:i + n]) < thr for i in range(0, len(y) - n, n)]
    keep, i, N = int(SR * T["keep_gap_s"]), 0, len(fr); out, pos = [], 0
    while i < N:
        if fr[i]:
            j = i
            while j < N and fr[j]: j += 1
            if (j - i) * n > SR * T["min_gap_s"] and i > 10 and j < N - 10:
                out.append(y[pos:i * n + keep // 2]); pos = j * n - keep // 2
            i = j
        else: i += 1
    out.append(y[pos:]); z = np.concatenate(out); return z
def sane(y, w):
    dur = len(y) / SR; rate = w / max(dur, 1e-3); lo, hi = director.LIM["raw_words_per_s_ok"]
    why = []
    if dur < 0.35: why.append("too short")
    if not lo <= rate <= hi: why.append(f"raw pace {rate:.1f} w/s outside {lo}-{hi}")
    if np.abs(y).max() >= 0.995: why.append("clipping")
    if longest_internal_silence(y) > 0.7: why.append("dead air inside the take")
    return why, rate
def take(voice, spoken, p):
    """Cached raw take; regenerate with the next seed until it passes the sanity checks (max 3 tries, then keep the pace-closest)."""
    tries = []; best = None
    for k in range(3):
        seed = p["seed"] + k * 7919; key = hashlib.sha1(json.dumps([spoken, p["params"], seed, str(voice.reference), voice.variant], ensure_ascii=False).encode()).hexdigest()[:16]; f = CACHE / f"{key}.npy"; CACHE.mkdir(parents=True, exist_ok=True)
        if f.exists(): y = np.load(f)
        else: y, _ = voice.generate(spoken, seed=seed, **p["params"]); y = tighten(trim(y, SR)); np.save(f, y)
        why, rate = sane(y, p["words"]); tries.append(dict(seed=seed, rate=round(rate, 2), problems=why))
        if best is None or abs(rate - 2.8) < abs(best[1] - 2.8): best = (y, rate)
        if not why: return y, tries
        log(f"{p['id']}: retry (seed {seed}): {'; '.join(why)}")
    return best[0], tries
def align(wav, segs):
    import whisperx
    model, meta = whisperx.load_align_model(language_code="hi", device="cpu"); audio = whisperx.load_audio(str(wav))
    res = whisperx.align([dict(start=s["start_seconds"], end=s["end_seconds"], text=s["text"]) for s in segs], model, meta, audio, "cpu", return_char_alignments=False)
    for s, a in zip(segs, res["segments"]):
        s["words"] = [dict(word=w["word"], start=round(float(w["start"]), 3), end=round(float(w["end"]), 3), score=round(float(w.get("score", 0)), 3)) for w in a.get("words", []) if "start" in w and "end" in w]
    return segs
def run(story, post=None, tempo_scale=None, do_align=True, target_db=-23.0, voice=None):
    sd = ROOT / "stories" / story; beats = json.loads((sd / "beats.json").read_text(encoding="utf-8")); out = sd / "narration" / "voice"; out.mkdir(parents=True, exist_ok=True)
    prof = director.PROFILE; post = post or prof["post"]; tempo_scale = tempo_scale if tempo_scale is not None else prof.get("tempo_scale", 1.0); plans = director.plan(beats, tempo_scale=tempo_scale); voice = voice or Voice()
    chunks, segs, phr, t = [], {}, [], 0.0
    for p in plans:
        spoken = textprep.prepare(p["text"], punct="director"); y, tries = take(voice, spoken, p); raw_dur = len(y) / SR
        y = atempo(y, p["tempo"]); d = target_db - rms_db(y); y = fade(y * 10 ** (np.clip(d, -6, 6) / 20) * 10 ** (p["gain_db"] / 20))
        gap = np.zeros(int(SR * p["pause_after"]), dtype=np.float32); s0 = t
        sg = segs.setdefault(p["beat"], dict(beat_id=p["beat"], text=next(b["text"] for b in beats if b["id"] == p["beat"]), start_seconds=round(s0, 3), phrases=[]))
        sg["end_seconds"] = round(s0 + len(y) / SR, 3); sg["phrases"].append(dict(id=p["id"], text=p["text"], emotion=p["emotion"], exaggeration=p["params"]["exaggeration"], tempo=p["tempo"], start=round(s0, 3), end=round(s0 + len(y) / SR, 3), tries=len(tries), words_per_s=round(p["words"] / (len(y) / SR), 2)))
        phr.append(dict(**sg["phrases"][-1], beat=p["beat"], pause_after=p["pause_after"], spoken=spoken, raw_dur_s=round(raw_dur, 2), checks=tries))
        chunks += [y, gap]; t += (len(y) + len(gap)) / SR; log(f"{p['id']} {p['emotion']:<10} ex={p['params']['exaggeration']} x{p['tempo']} {len(y)/SR:.2f}s ({p['words']/(len(y)/SR):.1f} w/s) tries={len(tries)}")
    y = np.concatenate(chunks); rt = prof.get("room_tone_dbfs")
    if rt is not None:
        rng = np.random.default_rng(7); n = np.cumsum(rng.standard_normal(len(y)).astype(np.float32)); n -= np.convolve(n, np.ones(2400) / 2400, mode="same"); n *= 10 ** (rt / 20) / (np.sqrt(np.mean(n ** 2)) + 1e-9); y = y + n
    y = y / max(1.0, np.abs(y).max() / 0.89); raw = out / "pre_post.wav"; sf.write(raw, y, SR); final = out / "narration.wav"; postprocess.process(raw, final, post)
    seglist = list(segs.values())
    if do_align: seglist = align(final, seglist)
    (out / "segments.json").write_text(json.dumps(dict(duration_seconds=round(len(y) / SR, 3), segments=seglist), ensure_ascii=False, indent=1), encoding="utf-8")
    words_total = sum(len(s["text"].split()) for s in seglist); speech = sum(s["end_seconds"] - s["start_seconds"] for s in seglist)
    (out / "meta.json").write_text(json.dumps(dict(story=story, profile=prof["name"], post=post, tempo_scale=tempo_scale, controls_used=["exaggeration"], words=words_total, duration_s=round(len(y) / SR, 2), speech_words_per_s=round(words_total / speech, 2), phrases=phr), ensure_ascii=False, indent=1), encoding="utf-8")
    try: subprocess.run([sys.executable, str(Path(__file__).parent / "analyze.py"), str(final), "--segments", str(out / "segments.json"), "--out", str(out / "analysis.json")], check=True, capture_output=True)
    except Exception as e: log("analysis skipped: " + str(e))
    return out
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("story"); ap.add_argument("--post", default=None); ap.add_argument("--tempo-scale", type=float, default=None); ap.add_argument("--no-align", action="store_true")
    a = ap.parse_args(); print(run(a.story, a.post, a.tempo_scale, do_align=not a.no_align))
