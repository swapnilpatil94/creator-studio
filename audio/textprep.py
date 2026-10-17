"""Hindi/Hinglish text preparation for Chatterbox. The caption/display text is NEVER changed; only the spoken (TTS) text.
Steps: spoken forms for English/technical terms (reuses the studio's own dictionary), digits -> Hindi number words, punctuation policy
(Chatterbox's punc_norm turns '…' '...' ':' ';' into commas, '—' into '-', and appends '.' when the text does not end in . ! ? - , ),
and a coverage check (tokenizer [UNK] characters, unmapped Latin words) so mispronunciations are caught before generation."""
import ast, re
from pathlib import Path
from common import TTS_REPO
_ONES = "शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे".split()
assert len(_ONES) == 100
def hindi_number(n: int) -> str:
    if n < 100: return _ONES[n]
    if n < 1000: return (_ONES[n // 100] + " सौ" + (" " + hindi_number(n % 100) if n % 100 else ""))
    for unit, name in ((10**7, "करोड़"), (10**5, "लाख"), (10**3, "हज़ार")):
        if n >= unit: return hindi_number(n // unit) + " " + name + (" " + hindi_number(n % unit) if n % unit else "")
def spoken_forms():
    src = (TTS_REPO / "engine/shorts/voice.py").read_text(encoding="utf-8"); tree = ast.parse(src)
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "_HINDI_SPOKEN_FORMS" for t in node.targets): return ast.literal_eval(node.value)
    return {}
_EXTRA = {"retry": "रीट्राई", "logic": "लॉजिक", "error": "एरर", "rate": "रेट", "fix": "फ़िक्स", "limit": "लिमिट", "exponential": "एक्सपोनेंशियल",
          "backoff": "बैकऑफ़", "agent": "एजेंट", "agents": "एजेंट्स", "smart": "स्मार्ट", "tool": "टूल", "prompt": "प्रॉम्प्ट", "token": "टोकन", "tokens": "टोकन्स",
          "latency": "लेटेंसी", "queue": "क्यू", "cache": "कैश", "memory": "मेमोरी", "loop": "लूप", "timeout": "टाइमआउट", "fallback": "फ़ॉलबैक"}   # director additions (Devanagari so the Hindi model reads them)
_FORMS = {**_EXTRA, **spoken_forms()}; _FORMS_CF = {k.casefold(): v for k, v in _FORMS.items()}
_FORM_RE = re.compile(r"(?<!\w)(" + "|".join(re.escape(k) for k in sorted(_FORMS, key=len, reverse=True)) + r")(?!\w)", re.I) if _FORMS else None
_NUM_RE = re.compile(r"(₹|Rs\.?\s?)?(\d{1,3}(?:,\d{2,3})+|\d+)(\.\d+)?(?:\s?(%|परसेंट))?")
def numbers_to_words(text):
    def rep(m):
        cur, whole, dec, pct = m.group(1), m.group(2), m.group(3), m.group(4)
        n = int(whole.replace(",", "")); out = hindi_number(n) if n < 10**9 else whole
        if dec: out += " दशमलव " + " ".join(_ONES[int(d)] for d in dec[1:])
        if pct: out += " प्रतिशत"
        if cur: out += " रुपये"
        return out
    return _NUM_RE.sub(rep, text)
def apply_spoken_forms(text):
    return _FORM_RE.sub(lambda m: _FORMS_CF.get(m.group(0).casefold(), m.group(0)), text) if _FORM_RE else text
def punctuation(text, policy="director"):
    """policy 'asis' leaves punctuation to the model's punc_norm (current pipeline behaviour).
    'director': '।' -> '.' (avoids the model's '।.' double ender), '…' -> ',' made explicit (the model does this anyway), '—' -> ',' before speech/turns,
    collapse repeated marks. Pauses are then designed by the director in assembly, not by punctuation tricks."""
    if policy == "asis": return text
    t = text.replace("।", ".").replace("…", ",").replace("...", ",").replace("—", ",").replace("–", ",")
    t = re.sub(r"\s+,", ",", t); t = re.sub(r",\s*,+", ",", t); t = re.sub(r"\.\s*\.+", ".", t); t = re.sub(r",\s*\.", ".", t)
    return re.sub(r"\s+", " ", t).strip()
def prepare(text, pronunciation="hindi_mixed", punct="director"):
    t = numbers_to_words(text)
    if pronunciation == "hindi_mixed": t = apply_spoken_forms(t)
    return punctuation(t, punct)
def review(text):
    """Things a human should look at before generation: Latin words with no spoken form (likely mispronounced), stray digits."""
    spoken = prepare(text); latin = sorted({w for w in re.findall(r"[A-Za-z][A-Za-z0-9\-']+", spoken)})
    return dict(spoken=spoken, unmapped_latin=latin, digits_left=bool(re.search(r"\d", spoken)))
if __name__ == "__main__":
    import sys, json
    tests = ["25 लाख रुपये और 12,500 की फीस", "₹5000 का नुकसान, 3.5% ग्रोथ", "एआई एजेंट ने 42 टूल कॉल कर दिए।", "The agent calls the API with retry और rate limit…", "तब आगे आया सोलह साल का अभिमन्यु — वो व्यूह में घुसना जानता था… बाहर निकलना नहीं।"]
    for t in tests: print(json.dumps(dict(src=t, **review(t)), ensure_ascii=False))
