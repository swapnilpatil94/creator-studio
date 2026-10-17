# creator-studio - project rules (keep short)
- Before choosing a topic, a story, or the next piece of work, read `docs/MASTER_PLAYBOOK.md`. It lists the pipeline, skills per stage, gates, measured facts and the roadmap.
- Never claim a render, test, citation or quality gain that you did not verify. Read frames/listen-proxies before sending anything to the user.
- Mythology claims need `claims.json` entries (traditional / variant / interpretation); never invent scripture. AI claims need first-party sources and a date.
- Third-party skills/code: read and scan before installing; record provenance in `docs/THIRD_PARTY.md`.
- Heavy jobs run one at a time (24 GB Mac): Chatterbox, Ollama and renders never in parallel.
- Originals are never overwritten: new variants get new files.

## Strict workflow (added)
- Follow `.claude/skills/workflow-gate/SKILL.md` for every video: **Read the listed skills at each stage** and record them in `stories/<name>/gates.json`; `node planner/gates.mjs stories/<name>` must pass. Set `"requireGates": true` in `story.json` and the pipeline refuses to build otherwise.
- Topics come from data (`planner/yt-outliers.mjs` + `yt-analyze.mjs`), not from memory or taste; the decision is written in `docs/PLAN_*.md` with the numbers.
- The YouTube API key lives only in `.env.local` (gitignored). Never print it, commit it, or send it anywhere except googleapis.com.
- Storytelling is audited with the `storytelling` skill's audit mode and `hook-lint` before any narration is generated.
