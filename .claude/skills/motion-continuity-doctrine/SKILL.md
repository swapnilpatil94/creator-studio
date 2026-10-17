---
name: motion-continuity-doctrine
description: The motion law that makes a multi-shot film feel like ONE continuous camera move instead of stacked slides - vector law, the current, carriers, causal motion, no idle wobble, stillness before climax, anti-"AI look" rules. Load before designing camera paths, transitions or shot-to-shot handoffs.
---

# Motion continuity doctrine

Distilled from HyperFrames' motion-doctrine (Apache-2.0, heygen-com/hyperframes) and Howseen's anti-AI-motion rules (MIT, howseen-ai/claude-motion-design), mapped to our `renderAt(t)` engine.

## The vector law
How shot A exits decides how shot B enters: **same axis, same direction, matched speed, cut mid-motion on both sides.** On the Z axis, direction is the *sign of the scale change*: growing = push, shrinking = pull. A receding exit answered by a grow-from-small entry is a mirrored vector (the most common violation, because grow-from-small is the default entrance). Settling to rest before a cut, or starting from rest after it, is a dead beat.

## The current
Pick ONE dominant direction for the film (e.g. left or forward-in) and use it for ordinary beats. Spend other vectors only for meaning: upward = elevation/conclusion; Z-forward = going deeper; Z-backward = arrival of something bigger; scale-burst = leaving a world. Never run consecutive seams in opposing directions (ping-pong reads as an error) without a visible cause (impact, click).

## Carriers and causes
The eye follows objects. Hand a concrete carrier across each cut at matched position and velocity (a point of light, a ring, a cursor, a word group). Never crossfade - it has no carrier. Chain motion causally: trigger -> squash -> release -> flight -> impact -> recoil -> reveal. Effects start ON the causing frame; reactions scale with mass.

## No idle wobble
Idle sine loops (breathe, float, glow pulse) read as "the video is waiting". If a shot finishes entering with seconds left, add story (staged reveals paid off on narration beats, a second action, a camera move), not wobble. Exception: tiny continuous drift so nothing is ever frozen (the engine QA rejects frozen stretches > 1.5 s). Stillness is a tool: hold still *before* the climax, then spend all the motion.

## Easing and physics
Springs over bounce: damping ratio >= 0.72, small overshoot. Closed-form step response for springs so any `t` is computable. Zoom interpolates in log space; never zoom in then out back-to-back. Exits geometric (x1.5 faster); never key a settle in 3-frame steps. Beat punches on the music grid: +1-2% scale per beat, decaying.

## Anti-"AI look" rules
One accent colour; **one thing moves at a time** unless a slider drives a continuous transform; one shape/visual system start to end - transform, do not cut; no rainbow gradients, emoji, lorem ipsum or gratuitous 3D flips; type big enough for a phone; keep text inside the centre safe zone (platform UI covers the bottom ~25% and top ~10%). Silent test: show the film muted; the viewer should summarise it in one sentence.

## Where this lives in our engine
Camera keys with `kf()` (eased segments), vector/shake in `cam3()`/`camAt()`; verify with `visual-qa` (camera zoom/pan rate rules) and the contact-sheet review in `film-direction-method`.
