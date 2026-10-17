"""Narration director: beat text -> delivery intent -> supported Chatterbox controls + post-tempo + designed pause. Explicit beat['intent'] wins; otherwise heuristics."""
import json, re, hashlib
from pathlib import Path
CFG = json.loads((Path(__file__).parent / "intents.json").read_text(encoding="utf-8"))
INTENTS, LIMITS = CFG["intents"], CFG["limits"]
TENSE = ("तभी", "अचानक", "उसी पल", "सन्नाटा", "अँधेरा", "काँप")
def words(t): return len(re.findall(r"\S+", t))
def pick_intent(beat, idx, n):
    if beat.get("intent") in INTENTS: return beat["intent"]
    t = beat["text"].strip()
    if idx == 0: return "hook"
    if idx == n - 1: return "reflective"
    if t.rstrip("\"'”").endswith("?"): return "question"
    if words(t) <= 6: return "punch"
    if any(k in t for k in TENSE): return "tense"
    return "narrate"
def clamp(v, lo, hi): return max(lo, min(hi, v))
def plan(beats, overrides=None, global_tempo=None, pause_scale=1.0):
    """Returns list of dicts: id, text, intent, params(supported only), tempo, pause_after, seed."""
    n = len(beats); out = []
    for i, b in enumerate(beats):
        intent = pick_intent(b, i, n); spec = INTENTS[intent]
        ex = clamp(float(b.get("exaggeration", spec["exaggeration"])), *LIMITS["exaggeration"])
        tempo = clamp(float(b.get("tempo", (global_tempo if global_tempo else spec["tempo"] * CFG.get("global_tempo", 1.0)))), *LIMITS["tempo"])
        pause = float(b.get("pause_after", spec["pause_after"] * pause_scale)) if i < n - 1 else 0.3
        t = b["text"]
        if "…" in t or "..." in t: pause = max(pause, 0.4 * pause_scale)
        seed = int(hashlib.sha1(b["id"].encode()).hexdigest()[:6], 16) % 100000
        out.append(dict(id=b["id"], text=t, intent=intent, params=dict(exaggeration=ex), tempo=tempo, pause_after=round(pause, 2), seed=seed,
                        words=words(t), warn=("long take" if words(t) > LIMITS["max_words_per_take"] else None)))
    return out
if __name__ == "__main__":
    import sys
    for p in plan(json.load(open(sys.argv[1], encoding="utf-8"))): print(p["id"], p["intent"], p["params"], p["tempo"], p["pause_after"], p["warn"] or "")
