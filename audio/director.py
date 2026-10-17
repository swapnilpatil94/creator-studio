"""Narration director: story beats -> phrases with an emotion each -> supported Chatterbox controls (exaggeration), post tempo, loudness and pauses.
One narration per film. Emotion comes from the beat's `intent` (hook/curious/narrate/tense/awe/punch/reveal/reflective) and is modulated per phrase:
a question -> curious, a very short phrase -> punch, a phrase that trails off (… or —) -> tense (+exaggeration, slightly slower).
beats.json may override per beat: `intent`, `exaggeration`, `tempo`, `gain_db`, `pause_after`; author the emotional flow with `emotions: [one per auto-split phrase]` or give explicit `phrases: [{text, emotion}]`."""
import json, re, hashlib
from pathlib import Path
CFG = json.loads((Path(__file__).parent / "intents.json").read_text(encoding="utf-8"))
EM, LIM, PROFILE = CFG["emotions"], CFG["limits"], CFG["profile"]
def words(t): return len(re.findall(r"\S+", t))
def clamp(v, lo, hi): return max(lo, min(hi, v))
def emotion_name(e): return CFG["aliases"].get(e, e) if e not in EM else e
def beat_emotion(beat, idx, n):
    e = emotion_name(beat.get("intent", ""))
    if e in EM: return e
    t = beat["text"].strip()
    if idx == 0: return "hook"
    if idx == n - 1: return "reflective"
    if t.rstrip("\"'”").endswith("?"): return "curious"
    if words(t) <= 6: return "punch"
    return "narrate"
def split_phrases(text):
    """Split after sentence enders and after … / — when both sides keep >= 3 words, so emotion can move inside a beat. Each piece keeps its closing mark."""
    parts = [p for p in re.split(r"(?<=[।?!.])\s+|(?<=[…—])\s*", text.strip()) if p and p.strip()]
    out = []
    for p in parts:
        if out and (words(p) < 3 or words(out[-1]) < 3): out[-1] = (out[-1] + " " + p).strip()
        else: out.append(p.strip())
    return out or [text.strip()]
def phrase_emotion(base, ph, first, last_in_story):
    if base in ("reflective", "reveal"): return base
    t = ph.rstrip("\"'”")
    if t.endswith("?") and base != "hook": return "curious"
    if words(ph) <= 3 and base != "hook": return "punch"
    if t.endswith(("…", "—", "...")) and base in ("narrate", "curious", "awe"): return "tense" if base == "narrate" else base
    return base
def plan(beats, tempo_scale=1.0):
    """Returns phrase dicts: beat, id, text, emotion, params(exaggeration), tempo, gain_db, pause_after, seed, warn."""
    n = len(beats); out = []
    for i, b in enumerate(beats):
        if not b.get("text", "").strip() and not b.get("phrases"): continue      # silent cards/breaths: the synth inserts their silence
        base = beat_emotion(b, i, n)
        phs = [dict(text=p["text"], emotion=emotion_name(p.get("emotion", base))) for p in b["phrases"]] if b.get("phrases") else [dict(text=t, emotion=phrase_emotion(base, t, k == 0, i == n - 1)) for k, t in enumerate(split_phrases(b["text"]))]
        if b.get("emotions") and not b.get("phrases"):                       # authored emotional flow: one emotion per auto-split phrase
            if len(b["emotions"]) == len(phs): phs = [dict(text=p["text"], emotion=emotion_name(e)) for p, e in zip(phs, b["emotions"])]
            else: raise ValueError(f"beat {b['id']}: {len(b['emotions'])} emotions for {len(phs)} phrases {[p['text'] for p in phs]}")
        elif len(phs) > 1 and phs[0]["emotion"] == "punch" and base == "narrate": phs[0]["emotion"] = base
        for k, ph in enumerate(phs):
            e = EM[ph["emotion"]]; last = k == len(phs) - 1
            ex = clamp(float(b.get("exaggeration", e["exaggeration"])) + (0.04 if ph["text"].rstrip().endswith(("…", "—")) else 0), *LIM["exaggeration"])
            tempo = clamp(float(b.get("tempo", e["tempo"])) * tempo_scale * (0.98 if ph["text"].rstrip().endswith(("…", "—")) else 1.0), *LIM["tempo"])
            pause = float(b.get("pause_after", e["pause_after"] + LIM["beat_gap_extra"])) if last else e["pause_after"] * (0.6 if not ph["text"].rstrip().endswith(("…", "—")) else 0.9)
            if last and i == n - 1: pause = 0.3
            pid = f"{b['id']}.{k + 1}"; seed = int(hashlib.sha1(pid.encode()).hexdigest()[:6], 16) % 100000
            out.append(dict(beat=b["id"], id=pid, text=ph["text"], emotion=ph["emotion"], params=dict(exaggeration=round(ex, 3)), tempo=round(tempo, 3), gain_db=float(b.get("gain_db", e["gain_db"])), pause_after=round(pause, 2), seed=seed, words=words(ph["text"]), warn=("long phrase" if words(ph["text"]) > LIM["max_words_per_phrase"] else None)))
    return out
if __name__ == "__main__":
    import sys
    for p in plan(json.load(open(sys.argv[1], encoding="utf-8"))): print(p["id"], p["emotion"], p["params"], p["tempo"], p["pause_after"], "|", p["text"], p["warn"] or "")
