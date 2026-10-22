#!/usr/bin/env python3
"""Runs INSIDE the isolated Veena venv (audio/.venv-veena), never the shared pipeline interpreter --
the shared env's scipy build cannot import transformers' generation module on this Mac (PROPACK dlopen
failure), and upgrading it there breaks numba/whisperx. Loads the model once, then serves one JSON
request per line on stdin until stdin closes: {"text", "speaker", "seed", "temperature", "top_p"} ->
writes a 24kHz wav to a temp path and replies {"ok": true, "path", "seconds"} on stdout."""
import sys, json, time, tempfile, os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from snac import SNAC
import soundfile as sf

DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
SPEAKERS = ["kavya", "agastya", "maitri", "vinaya"]
START_OF_SPEECH_TOKEN, END_OF_SPEECH_TOKEN = 128257, 128258
START_OF_HUMAN_TOKEN, END_OF_HUMAN_TOKEN = 128259, 128260
START_OF_AI_TOKEN, END_OF_AI_TOKEN = 128261, 128262
AUDIO_CODE_BASE_OFFSET = 128266

def log(msg): print(f"[veena] {msg}", file=sys.stderr, flush=True)

MODEL_ID = os.environ.get("VEENA_MODEL_ID", "akh-mysterio/veena-hinglish")   # finalized 2026-10-22 (owner, after listening to real samples): same speaker-locking caveat as base Veena, but pace and quality tested well on real KATHAAYA Hindi beats. override with the base checkpoint ("maya-research/Veena") only to A/B if a future issue is suspected
t0 = time.time()
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, trust_remote_code=True, dtype=torch.float16).to(DEVICE)
model.eval()
snac_model = SNAC.from_pretrained("hubertsiuzdak/snac_24khz").eval().to(DEVICE)
log(f"ready in {time.time()-t0:.1f}s device={DEVICE} model={MODEL_ID}")

def decode_snac_tokens(snac_tokens):
    snac_device = next(snac_model.parameters()).device
    codes_lvl = [[] for _ in range(3)]
    offs = [AUDIO_CODE_BASE_OFFSET + i * 4096 for i in range(7)]
    for i in range(0, len(snac_tokens), 7):
        codes_lvl[0].append(snac_tokens[i] - offs[0])
        codes_lvl[1].append(snac_tokens[i + 1] - offs[1]); codes_lvl[1].append(snac_tokens[i + 4] - offs[4])
        codes_lvl[2].append(snac_tokens[i + 2] - offs[2]); codes_lvl[2].append(snac_tokens[i + 3] - offs[3])
        codes_lvl[2].append(snac_tokens[i + 5] - offs[5]); codes_lvl[2].append(snac_tokens[i + 6] - offs[6])
    hier = []
    for lvl in codes_lvl:
        t = torch.tensor(lvl, dtype=torch.int32, device=snac_device).unsqueeze(0)
        if torch.any((t < 0) | (t > 4095)): raise ValueError("invalid SNAC token values")
        hier.append(t)
    with torch.no_grad():
        audio_hat = snac_model.decode(hier)
    return audio_hat.squeeze().clamp(-1, 1).float().cpu().numpy()

def generate(text, speaker, temperature=0.4, top_p=0.9, seed=42):
    if speaker not in SPEAKERS: raise ValueError(f"unknown speaker {speaker!r}: must be one of {SPEAKERS}")
    torch.manual_seed(int(seed))
    prompt_tokens = tokenizer.encode(f"<spk_{speaker}> {text}", add_special_tokens=False)
    input_tokens = [START_OF_HUMAN_TOKEN, *prompt_tokens, END_OF_HUMAN_TOKEN, START_OF_AI_TOKEN, START_OF_SPEECH_TOKEN]
    input_ids = torch.tensor([input_tokens], device=DEVICE)
    # README's own formula, uncapped at 700 (that default truncates any beat over ~75 chars; KATHAAYA phrases
    # routinely exceed that, so the cap here is the model's real context ceiling minus the prompt instead)
    max_tokens = min(int(len(text) * 1.3) * 7 + 21, 2048 - len(input_tokens) - 8)
    with torch.no_grad():
        output = model.generate(input_ids, max_new_tokens=max_tokens, do_sample=True, temperature=temperature, top_p=top_p,
                                 repetition_penalty=1.05, pad_token_id=tokenizer.pad_token_id,
                                 eos_token_id=[END_OF_SPEECH_TOKEN, END_OF_AI_TOKEN])
    generated_ids = output[0][len(input_tokens):].tolist()
    snac_tokens = [tid for tid in generated_ids if AUDIO_CODE_BASE_OFFSET <= tid < (AUDIO_CODE_BASE_OFFSET + 7 * 4096)]
    if not snac_tokens: raise ValueError("no audio tokens generated")
    usable = (len(snac_tokens) // 7) * 7
    if not usable: raise ValueError("generated audio too short to decode (less than one SNAC frame)")
    if usable != len(snac_tokens): log(f"trimmed {len(snac_tokens) - usable} stray tokens to a full SNAC frame")
    return decode_snac_tokens(snac_tokens[:usable])

for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        req = json.loads(line)
        if req.get("cmd") == "quit": break
        t0 = time.time()
        audio = generate(req["text"], req.get("speaker", "maitri"), req.get("temperature", 0.4), req.get("top_p", 0.9), req.get("seed", 42))
        fd, path = tempfile.mkstemp(suffix=".wav", prefix="veena-"); os.close(fd)
        sf.write(path, audio, 24000)
        print(json.dumps({"ok": True, "path": path, "seconds": round(time.time() - t0, 2), "audio_seconds": round(len(audio) / 24000, 3)}), flush=True)
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}), flush=True)
