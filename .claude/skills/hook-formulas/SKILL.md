---
name: hook-formulas
description: Catalog of 21 named hook formulas (statistic, mistake, contrarian flip, receipt, impossible claim, clock, direct address...) with Hindi mythology and Agentic AI examples and the failure mode of each. Use when you need 5 hook options for a script, or when a hook feels generic.
---

# Hook formulas (21)

Formula list and failure modes adapted from `Jakeschincariol/youtube-agent-skill` (MIT, `yt-script/hooks.json`); wording and all examples here are ours. A hook has three jobs in a Short: stop the scroll, filter for the right viewer, and open a question the viewer cannot close. Write FIVE options from different formulas, lint them (`planner/hook-lint.mjs`), keep the best two. Never open with who you are.

`[V]` = replace with a number you have verified and sourced. Never use the placeholder as a real figure.

| # | Formula | Shape | KATHAAYA example | Agentic AI example | Fails when |
|---|---|---|---|---|---|
| 1 | Statistic | a number the viewer didn't know, then the consequence | "सौ योजन का समुद्र। और पार जाने वाला एक भी नहीं।" | "[V]% agent runs fail at the tool-call step. Here is why." | number vague or unsourced |
| 2 | Someone else's result | a named outcome, then the mechanism | "सोलह साल का लड़का सात घेरे तोड़ गया। कैसे?" | "One team cut agent cost by [V]%. The change was one line." | result invented |
| 3 | The mistake | name the error the viewer is making now | "तुम सोचते हो हनुमान को अपनी ताक़त पता थी। नहीं पता थी।" | "Your agent isn't dumb. Your tool descriptions are." | too generic to sting |
| 4 | Contrarian flip | accepted advice, then reject it | "कहते हैं अभिमन्यु मूर्खता में गया। कथा कुछ और कहती है।" | "More tools make agents worse. Here's the proof." | rejection is not backed up |
| 5 | The reveal | promise a specific thing, then show it | "अब देखो चक्रव्यूह अंदर से कैसा था।" | "Watch one agent decide between three tools." | the reveal is late |
| 6 | Superlative | the best/worst/fastest of a category | "महाभारत का सबसे अकेला योद्धा।" | "The cheapest way to stop agent loops." | claim can't be defended |
| 7 | The clock | bound the payoff in time | "इकतीस सेकंड में पूरी कथा।" | "Agent memory in 40 seconds." | the video overruns the promise |
| 8 | I tried it | first-person experiment with a cost | (rare; use as narrator-witness) | "I let an agent run my inbox for 24 hours." | no real experiment behind it |
| 9 | The question | the exact question the viewer would type | "हनुमान समुद्र पार कैसे गए?" | "How does an agent pick a tool?" | question too broad |
| 10 | Before / after | two states, one cut between | "एक पल पहले चुप। एक पल बाद पर्वत से बड़े।" | "Same agent. Before and after retries with backoff." | the change isn't visible |
| 11 | Teardown | take a real thing apart in public | "चक्रव्यूह की सात परतें, एक-एक करके।" | "Taking a real agent trace apart, step by step." | nothing real is opened |
| 12 | The stack | two named things combined into one outcome | - | "Queue + retries = agents that survive outages." | combo not shown |
| 13 | The warning | a cost the viewer is about to pay | "इस एक गलती की क़ीमत अभिमन्यु ने दी।" | "This default will burn your API budget." | scare without payoff |
| 14 | The list | a counted set, count in line 1 | "सात घेरे। हर घेरे पर एक महारथी।" | "Three ways agents loop forever." | count padded |
| 15 | The receipt | show the artifact first, explain second | (open on the finished image: the point of light inside the rings) | (open on the real trace/diagram) | artifact arrives after 20 s |
| 16 | The insider | information from inside a system | "द्रोण ने यह व्यूह क्यों रचा, यह कम लोग जानते हैं।" | "What the framework docs don't tell you." | no real insight |
| 17 | Impossible claim | something that sounds untrue, then proof | "एक अकेला योद्धा, हज़ारों के बीच। और वो डटा रहा।" | "An agent that never loses state. No database." | proof never comes |
| 18 | The comparison | two named options, one winner | "अर्जुन या अभिमन्यु - व्यूह किसे आता था?" | "Queue vs retry: which saves your agent?" | no honest verdict |
| 19 | The origin | where a result actually came from | "यह कथा आई कहाँ से?" | "Where agent loops actually start." | origin unsourced |
| 20 | The deadline | something changes on a date | (rare for myth) | "This API changes on [verified date]." | date unverified |
| 21 | Direct address | name the exact viewer in the first words | "अगर तुम कभी अकेले लड़े हो..." | "If you build agents for production..." | audience unclear |

## Scoring a hook (heuristic, not a promise)
Weakest-link: specificity (numbers, names), address (viewer or hero named), stakes (loss/gain/danger), curiosity (question, gap, "लेकिन"), brevity (<= ~10 words). One dead property drags the hook down. `hook-lint.mjs` computes this for Devanagari and English.
