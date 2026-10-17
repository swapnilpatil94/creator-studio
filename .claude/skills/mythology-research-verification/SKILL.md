---
name: mythology-research-verification
description: Use before scripting any KATHAAYA mythology video — grade every claim as verified / traditional-account / variant / interpretation against a named text and edition, record it in claims.json, and refuse contested details (boons, genealogies, quotes) unless a source is read this session.
---
# Mythology research and verification

**Rule:** no ledger entry, no line in the film. A claim is only `verified` if you read the passage (not a summary) in this session and recorded text + locator. Everything else is labelled.

## Steps
1. List the beats' factual claims (who, what, number, causal link). Include implied ones (e.g. "no man could kill him").
2. For each, find the primary text and a translation: Valmiki Ramayana, Mahabharata (Critical Edition parva/adhyaya), Devi Mahatmya (Markandeya Purana 81-93), Bhagavata/Shiva/Skanda Purana, etc. Reliable places: GRETIL, sanskritdocuments, archive.org translations, library translations (Coburn for Devi Mahatmya). If the text cannot be opened, **say so** in `claims.json` (`verification_state`) and do not upgrade the status.
3. Grade: `verified` (read the passage, locator recorded), `traditional-account` (consistent across secondary sources, passage not read), `variant` (differs by text/region; narrate as "कुछ कथाओं में"), `interpretation` (moral/meaning: hedge in the line), `omitted` (contested, not narrated).
4. Contested-detail list (do not narrate as canon without a read source): boons given to demons; who gave a weapon; exact numbers (years, arms, heads); deathbed lessons; dialogue quotes; "no man can kill him" type loopholes.
5. Run `node planner/claims-check.mjs stories/<name>`. Warnings = unchecked; the film may ship only if the user is told which claims are unchecked, and on-screen disclaimer is present ("illustrative; tellings vary").
6. Sensitive content: respect devotional audience; no ridicule; mark interpretations as interpretations.

## Output
`stories/<name>/claims.json` + `SOURCES.md` (what was read, what could not be opened). Never invent a shloka or attribute a modern moral to scripture.
