"""A/B: analyse original vs one or more variants of a story and print a delta table; writes narration/variants/ab_report.json."""
import json, subprocess, sys, os
from pathlib import Path
from common import ROOT, PY
import textprep
KEYS = ["duration_s","lufs_integrated","lra_lu","true_peak_dbfs","clipped_samples","crest_db","longest_pause_s","click_events","pitch.std_st","pitch.range_st","beat_loudness.max_dev_from_median_db","rate.mean_words_per_s","rate.fastest","rate.slowest","pitch_dynamics.mean_f0_std_st","pitch_dynamics.mean_f0_range_st"]
def get(d, k):
    for p in k.split("."): d = d.get(p) if isinstance(d, dict) else None
    return d
def analyse(wav, seg, out, asr=None):
    env = dict(os.environ); subprocess.run([sys.executable, str(Path(__file__).parent / "analyze.py"), str(wav), "--segments", str(seg), "--out", str(out)] + (["--asr", str(asr)] if asr else []), env=env, check=True, capture_output=True)
    return json.loads(Path(out).read_text())
def main(story, variants):
    n = ROOT / "stories" / story / "narration"; sd = n.parent
    import tempfile; txt = Path(tempfile.gettempdir()) / f"ab_{story}.txt"; txt.write_text(" ".join(textprep.prepare(b["text"]) for b in json.loads((sd / "beats.json").read_text(encoding="utf-8"))), encoding="utf-8")
    ob = n / "raw.wav" if (n / "raw.wav").exists() else n / "variants" / "base" / "narration.wav"; osg = n / "raw.wav.segments.json" if (n / "raw.wav").exists() else n / "variants" / "base" / "segments.json"
    res = {"original": analyse(ob, osg, f"/tmp/ab_orig_{story}.json", txt)}
    for v in variants: res[v] = analyse(n / "variants" / v / "narration.wav", n / "variants" / v / "segments.json", f"/tmp/ab_{v}_{story}.json", txt)
    print(f"{'metric':<42}" + "".join(f"{k:<16}" for k in res))
    for k in KEYS: print(f"{k:<42}" + "".join(f"{get(r, k)!s:<16}" for r in res.values()))
    (n / "variants" / "ab_report.json").write_text(json.dumps({k: {m: get(r, m) for m in KEYS} for k, r in res.items()}, indent=1))
if __name__ == "__main__": main(sys.argv[1], sys.argv[2:])
