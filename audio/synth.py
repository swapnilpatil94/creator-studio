"""Synthesize ONE directed narration for a story: stories/<story>/narration/voice/{narration.wav, segments.json, meta.json, analysis.json}. Never touches raw.wav.
beats -> phrases with an emotion each (director.py) -> text prep -> Chatterbox take (supported controls only; a take that fails objective sanity checks is regenerated
with the next seed automatically, there are no variants to choose from) -> trim -> atempo -> loudness match + emotion gain -> designed pauses -> room tone -> post chain -> alignment-only whisperx."""
import argparse, json, os, subprocess, sys, tempfile, hashlib
from pathlib import Path
import numpy as np, soundfile as sf
from common import ROOT, log
import textprep, director, postprocess
from model import Voice as ChatterboxVoice, trim
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
    # one segment at a time: whisperx splits long texts into several output segments, and zipping those with our beats shifted every later beat's words (found 2026-10-18)
    for s in segs:
        res = whisperx.align([dict(start=s["start_seconds"], end=s["end_seconds"], text=s["text"])], model, meta, audio, "cpu", return_char_alignments=False)
        s["words"] = [dict(word=w["word"], start=round(float(w["start"]), 3), end=round(float(w["end"]), 3), score=round(float(w.get("score", 0)), 3)) for a in res["segments"] for w in a.get("words", []) if "start" in w and "end" in w]
    return segs
VEENA_TEMPO_CORRECTION = 0.82   # measured 2026-10-22: Veena's native rate ran ~22% faster than Chatterbox's designed pace for the same beats (raurava-narak: 46.9s vs 57.0s for identical text) -- the per-beat emotion tempos in intents.json were tuned against Chatterbox's own rate, so Veena needs this baseline correction on top of them, not instead of them. Revisit if later measurement shows a different ratio.
# ---- natural flow for Veena (owner 2026-10-23: "Veena is not saying the flow of sentences") ----
# Diagnosis from Tulsi's own narration: every script line was a separate TTS call (no context, so the voice restarted its intonation on each line, even when one sentence runs over two lines),
# and the raw speaking rate swung from 2.3 to 4.4 words/s between lines while a time-stretch tried to fix it with the emotion tempos tuned for Chatterbox.
# Now: (1) a line that does not end its sentence is spoken TOGETHER with the next line in one call and cut apart at the word boundary (forced alignment), with only a breath between them;
# (2) each line's stretch is chosen to bring its raw rate to a steady target (3.0 words/s with a small emotion lean), limited to +-12%, instead of fixed emotion tempos. VOICE_FLOW=classic restores the old behaviour.
FLOW = os.environ.get("VOICE_FLOW", "natural") != "classic"
MODE = os.environ.get("VOICE_MODE", "natural")   # natural (default): keeps the voice's own dynamics and presence, barely stretches it; classic: the earlier soft, levelled chain
TEMPO_LIM = (0.95, 1.05) if MODE == "natural" else (0.88, 1.12)
GAIN_CLIP = 2.5 if MODE == "natural" else 6.0
SENT_END = ("।", ".", "?", "!", "…", '"', "”", "’")
_ALIGN = None
def split_audio(y, ta, tb):
    """cut one take that speaks text A then text B at the pause between the last word of A and the first of B (whisperx forced alignment); None if the alignment does not give the expected words"""
    global _ALIGN
    import whisperx
    if _ALIGN is None: _ALIGN = whisperx.load_align_model(language_code="hi", device="cpu")
    model, meta = _ALIGN
    with tempfile.TemporaryDirectory() as d:
        f = f"{d}/g.wav"; sf.write(f, y, SR); audio = whisperx.load_audio(f)
    res = whisperx.align([dict(start=0.0, end=len(y) / SR, text=ta + " " + tb)], model, meta, audio, "cpu", return_char_alignments=False)
    ws = [w for sgm in res["segments"] for w in sgm.get("words", []) if "start" in w and "end" in w]; na = len(ta.split())
    if len(ws) < na + 1: return None
    cut = (ws[na - 1]["end"] + ws[na]["start"]) / 2; i = int(cut * SR); return y[:i], y[i:]
def merge_flow(plans, order):
    """join an unfinished sentence (no closing mark at the end of a beat's last phrase) with the first phrase of the very next beat"""
    out, i = [], 0
    while i < len(plans):
        a = plans[i]; b = plans[i + 1] if i + 1 < len(plans) else None
        if b and b["beat"] != a["beat"] and order.get(b["beat"], -9) == order.get(a["beat"], -9) + 1 and not a["text"].rstrip().endswith(SENT_END) and a["words"] + b["words"] <= 30:
            out.append(dict(a, merged=(a, b), text=a["text"].rstrip() + " " + b["text"].lstrip(), words=a["words"] + b["words"], id=a["id"] + "+" + b["id"])); i += 2
        else: out.append(a); i += 1
    return out
def flow_tempo(p, y, tempo_scale):
    rate = p["words"] / max(len(y) / SR, 1e-3); rel = max(0.93, min(1.07, (p["tempo"] / max(tempo_scale, 1e-3)) / 1.15)); return round(max(TEMPO_LIM[0], min(TEMPO_LIM[1], 3.0 * rel / rate)), 3)
def run(story, post=None, tempo_scale=None, do_align=True, target_db=-23.0, voice=None):
    sd = ROOT / "stories" / story; beats = json.loads((sd / "beats.json").read_text(encoding="utf-8")); out = sd / "narration" / "voice"; out.mkdir(parents=True, exist_ok=True)
    prof = director.PROFILE; post = post or ("natural" if MODE == "natural" else prof["post"]); tempo_scale = tempo_scale if tempo_scale is not None else prof.get("tempo_scale", 1.0)
    if getattr(voice, "variant", None) == "veena": tempo_scale *= VEENA_TEMPO_CORRECTION
    plans = director.plan(beats, tempo_scale=tempo_scale); voice = voice or ChatterboxVoice()
    chunks, segs, phr, t = [], {}, [], 0.0
    order = {b["id"]: i for i, b in enumerate(beats)}; silent = [b for b in beats if b.get("silent") and not b.get("text", "").strip()]; done_silent = set()
    def silences_before(idx):
        nonlocal t
        for sb in silent:
            if sb["id"] in done_silent or order[sb["id"]] >= idx: continue
            done_silent.add(sb["id"]); n = int(SR * float(sb["silent"])); chunks.append(np.zeros(n, dtype=np.float32)); segs[sb["id"]] = dict(beat_id=sb["id"], text="", silent=True, start_seconds=round(t, 3), end_seconds=round(t + n / SR, 3), phrases=[]); t += n / SR
    veena_flow = FLOW and getattr(voice, "variant", None) == "veena"
    def emit(p, y, tries, spoken, pause):
        nonlocal t
        raw_dur = len(y) / SR
        if veena_flow: p = dict(p, tempo=flow_tempo(p, y, tempo_scale))
        y = atempo(y, p["tempo"]); d = target_db - rms_db(y); y = fade(y * 10 ** (np.clip(d, -GAIN_CLIP, GAIN_CLIP) / 20) * 10 ** (p["gain_db"] / 20))
        gap = np.zeros(int(SR * pause), dtype=np.float32); s0 = t
        sg = segs.setdefault(p["beat"], dict(beat_id=p["beat"], text=next(b["text"] for b in beats if b["id"] == p["beat"]), start_seconds=round(s0, 3), phrases=[]))
        sg["end_seconds"] = round(s0 + len(y) / SR, 3); sg["phrases"].append(dict(id=p["id"], text=p["text"], emotion=p["emotion"], exaggeration=p["params"]["exaggeration"], tempo=p["tempo"], start=round(s0, 3), end=round(s0 + len(y) / SR, 3), tries=len(tries)))
        phr.append(dict(**sg["phrases"][-1], beat=p["beat"], pause_after=pause, spoken=spoken, raw_dur_s=round(raw_dur, 2), checks=tries))
        chunks.extend([y, gap]); t += (len(y) + len(gap)) / SR; log(f"{p['id']} {p['emotion']:<10} ex={p['params']['exaggeration']} x{p['tempo']} {len(y)/SR:.2f}s ({p['words']/(len(y)/SR):.1f} w/s) tries={len(tries)}")
    items = merge_flow(plans, order) if veena_flow else plans
    for p in items:
        silences_before(order[p["beat"]])
        if p.get("merged"):
            pa, pb = p["merged"]; spoken = textprep.prepare(p["text"], punct="director"); y, tries = take(voice, spoken, p); parts = None
            try: parts = split_audio(y, textprep.prepare(pa["text"], punct="director"), textprep.prepare(pb["text"], punct="director"))
            except Exception as e: log(f"{p['id']}: could not split the joined take ({e}); speaking the lines separately")
            if parts:
                log(f"{p['id']}: one sentence over two lines spoken in one go")
                emit(pa, parts[0], tries, textprep.prepare(pa["text"], punct="director"), 0.1); silences_before(order[pb["beat"]]); emit(pb, parts[1], tries, textprep.prepare(pb["text"], punct="director"), pb["pause_after"]); continue
            for q in (pa, pb):
                silences_before(order[q["beat"]]); sp = textprep.prepare(q["text"], punct="director"); yy, tt = take(voice, sp, q); emit(q, yy, tt, sp, q["pause_after"])
            continue
        spoken = textprep.prepare(p["text"], punct="director"); y, tries = take(voice, spoken, p); emit(p, y, tries, spoken, p["pause_after"])
    silences_before(10 ** 9); y = np.concatenate(chunks); rt = prof.get("room_tone_dbfs")
    if rt is not None:
        rng = np.random.default_rng(7); n = np.cumsum(rng.standard_normal(len(y)).astype(np.float32)); n -= np.convolve(n, np.ones(2400) / 2400, mode="same"); n *= 10 ** (rt / 20) / (np.sqrt(np.mean(n ** 2)) + 1e-9); y = y + n
    y = y / max(1.0, np.abs(y).max() / 0.89); raw = out / "pre_post.wav"; sf.write(raw, y, SR); final = out / "narration.wav"; postprocess.process(raw, final, post)
    seglist = list(segs.values())
    if do_align: seglist = sorted(align(final, [g for g in seglist if g["text"]]) + [g for g in seglist if not g["text"]], key=lambda g: g["start_seconds"])
    (out / "segments.json").write_text(json.dumps(dict(duration_seconds=round(len(y) / SR, 3), segments=seglist), ensure_ascii=False, indent=1), encoding="utf-8")
    words_total = sum(len(s["text"].split()) for s in seglist); speech = sum(s["end_seconds"] - s["start_seconds"] for s in seglist)
    (out / "meta.json").write_text(json.dumps(dict(story=story, profile=prof["name"], post=post, tempo_scale=tempo_scale, controls_used=["exaggeration"], words=words_total, duration_s=round(len(y) / SR, 2), speech_words_per_s=round(words_total / speech, 2), phrases=phr), ensure_ascii=False, indent=1), encoding="utf-8")
    try: subprocess.run([sys.executable, str(Path(__file__).parent / "analyze.py"), str(final), "--segments", str(out / "segments.json"), "--out", str(out / "analysis.json")], check=True, capture_output=True)
    except Exception as e: log("analysis skipped: " + str(e))
    return out
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("story"); ap.add_argument("--post", default=None); ap.add_argument("--tempo-scale", type=float, default=None); ap.add_argument("--no-align", action="store_true")
    ap.add_argument("--engine", default="veena", choices=["chatterbox", "veena"], help="chatterbox clones a reference voice; veena uses one of its 4 built-in Hindi/English voices (no cloning, no per-phrase emotion control yet)")
    ap.add_argument("--reference", default=None, help="chatterbox only: WAV clip to clone the voice from (zero-shot cloning via audio_prompt_path); omit to use the active/default reference")
    ap.add_argument("--speaker", default="maitri", choices=["kavya", "agastya", "maitri", "vinaya"], help="veena only: the model's own speaker-token conditioning is unreliable (documented upstream, confirmed here 2026-10-22) -- maitri is the one speaker that has come out consistent in testing and community reports, so it is the default; the others are not reliably different voices")
    a = ap.parse_args()
    if a.engine == "veena":
        from model_veena import Voice as VeenaVoice
        v = VeenaVoice(speaker=a.speaker)
    else:
        v = ChatterboxVoice(reference=a.reference) if a.reference else None
    print(run(a.story, a.post, a.tempo_scale, do_align=not a.no_align, voice=v))
