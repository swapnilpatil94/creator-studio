# creator-studio

Unified dual-channel AI video production studio for **KATHAAYA** (Indian mythology storytelling)
and **Agentic AI** (practical AI tools/agents content) — one shared JS/TS scene-rendering engine,
independent creative direction and research per channel.

This repository is a fresh extraction target, not a copy of either source project. See:

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system design, grounded in a verified inspection of the
  existing `infographics-motion` and `mythic-video-studio` projects.
- [`MIGRATION_INVENTORY.md`](MIGRATION_INVENTORY.md) — exactly which existing components are
  reused, adapted, left behind, or net-new, and why.

**Start here:** [`docs/MASTER_PLAYBOOK.md`](docs/MASTER_PLAYBOOK.md) (pipeline, skills per stage, gates, measured facts, roadmap) and [`docs/STUDIO_GUIDE.md`](docs/STUDIO_GUIDE.md) (how to run it). Original architecture notes below are historical.

Source projects (preserved, untouched):
- `swapnilpatil94/infographics-motion` — Kathaaya Blender engine + the `technical-data-cinema`
  JS/TS engine this repo builds on.
- `~/mythic-video-studio` — sibling project; source of the Chatterbox reference voice asset.
