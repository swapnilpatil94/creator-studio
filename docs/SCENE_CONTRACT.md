# Scene contract (what the studio accepts)

A scene is one offline HTML file exposing `window.getDuration()` and a pure `window.renderAt(t)` (see `SCENE_PROMPT.md`
for the exact text given to AI models). The studio then adds narration (Chatterbox), word-synced captions, sound design,
QA and encoding.

## What the studio repairs automatically (studio-shim.js, injected before the scene's scripts)
| Problem in the pasted file | Repair |
|---|---|
| `Math.random()` | seeded per frame time (reproducible) |
| `Date`, `new Date()`, `performance.now()` | return the scene time |
| `requestAnimationFrame`, `setTimeout`, `setInterval` | disabled during export (warned) |
| CSS animations / transitions | disabled during export (warned) |
| 1080-wide design not sized for the 540px frame | auto-scaled to fit |
| Over/under-exposed frames | global brightness correction by the QA loop |
| Captions unreadable over bright content | caption backdrop dimmed by the QA loop |
| Scene length != narration length | timeline time-scaled to the narration (reported) |

## What is rejected (with the exact fix shown to the user)
External assets or network APIs; `<video>/<audio>/<iframe>`; missing `renderAt`/`getDuration`; `renderAt` throwing;
output that changes between two renders of the same `t`; blank or static films; runtime page errors; scenes over 3 MB.

## Known limits
Animation that depends *only* on rAF/timers/CSS (no `renderAt`) cannot be exported. Heavy WebGL scenes (three.js) must be
bundled inline and render slowly under `--software` GL. Visual QA on pasted scenes is generic (exposure, caption legibility,
motion, frozen/blank frames); it cannot know whether a figure "looks right".
