---
name: narration-craft
description: Write narration that holds attention when spoken by our Chatterbox Hindi/English voice - but/therefore beats, last-line-first endings, rhythm, hook layers, and TTS-aware pacing from measured data. Use whenever drafting or revising a script for a Short or long video, and before generating narration.
---

# Narration craft (Hindi-first, TTS-aware)

Combines the installed third-party craft skills with facts measured on *our* voice. Third-party examples are English marketing niches: take the **principle**, never the wording.

## Skill map (what to load for what)
| Need | Skill |
|---|---|
| Six attention levers; three hook layers (first frame, spoken line, overlay); bookend ending | `storytelling-hooks` (yaxeen, MIT) |
| Hook has ONE job; the four hook killers (delay, confusion, ...) | `viral-hooks` (artemnovitckii, MIT) |
| But/Therefore, write the end first, lens, rhythm, one-person tone | `storytelling` (artemnovitckii, MIT) |
| 21 named hook formulas with Hindi/AI examples | `hook-formulas` (ours) |
| Final filter against hollow, "AI-sounding" prose (English strongest) | `anti-ai-writing` |
| 8-20 min structure; titles + thumbnails; diagnosing a flop; extracting a channel's formula | `long-form-youtube`, `titles-and-thumbnails`, `retention-audit`, `channel-formula` |
| Evidence grading of all of the above | `retention-psychology` |

## Measured facts about our voice (Chatterbox dedicated-Hindi, storytelling preset, tempo 1.08)
From the Hanuman (36.5 s) and Abhimanyu (31.6 s) narrations:
- Average **3.25-3.5 words/second (~200 wpm), ~13 characters/second**. The English rule "2.5 words/second" does **not** apply; budget a 30 s Short at ~95-105 Hindi words, 45 s at ~145-160.
- Beats above **4 words/second** (or ~16 characters/second) sound rushed and strain captions (Hanuman "और सामने… सोने की लंका" hit 18 chars/s; two beats hit 4.5+ w/s). Split the beat, cut words, or lower the preset tempo to 1.0 for dramatic passages.
- `…` produces a real hesitation (measured gaps ~0.35-0.45 s inside a beat); `।` ends the thought with a longer pause; `—` introduces speech or a turn. Use them as stage directions. Beat boundaries add ~0.6-1.2 s of silence - that is where the film breathes.
- Write numbers as words in the narration; keep digits only in captions/visuals if needed. English terms are pronounced Hindi-first (`hindi_mixed`); spell tricky terms phonetically in Devanagari and listen.
- One idea per sentence, <= 10-12 words; no nested clauses. Read it aloud in one breath per sentence.

## Process
1. **Real material only.** Facts come from `claims.json`; never invent a quote, number or source.
2. **Lens**: the uncommon angle (invert the villain, find the asset in the failure, second-order effect, switch the POV).
3. **Write the last line first** (the "last dab": <= 10 words, shareable alone, loops back to the first line or image). Bookend a key word from the hook.
4. **Fill the middle with BUT / THEREFORE** (Hindi: लेकिन, मगर, पर, तभी, इसलिए, नतीजा). If "और फिर" fits between two beats, the beat is boring - rewrite until a "but" or "therefore" fits. Several open loops in the first 30 s.
5. **Rhythm**: one sentence per line; the right edge should be jagged. Short. Then longer, rolling to a close. Then short.
6. **Hook layers**: write (a) the visual first frame, (b) the spoken line (<= 12 words; names a specific question/number/conflict, no greeting), (c) the overlay text that carries the *other half* of the gap, not a copy.
7. **Lint**: `node planner/hook-lint.mjs stories/<name>` (hook strength per property, but/therefore ratio, rhythm, last dab, pacing).
8. **Generate, then listen**: the user judges taste; re-time beats that feel rushed.

## Mythology voice (KATHAAYA)
Oral-tradition (kathā) cadence: restrained, concrete images, stakes in specifics (सौ योजन, सोलह साल). Hedge variants honestly ("कहते हैं", "कुछ कथाओं में", "वाल्मीकि रामायण के अनुसार" only when verified). No sermonising closer; end on an image or a question that echoes the opening. Never invent shlokas or attribute modern morals as scripture.

## Agentic AI voice
Plain and concrete: one verified outcome first, define jargon in one clause, one honest limitation per video. English terms in Devanagari via `hindi_mixed` or an English-language version. No fabricated benchmarks.

## Do not
Open with a greeting or channel intro; chain "और फिर"; explain a gag; end on a generic CTA; ship a script whose rate you did not measure.
