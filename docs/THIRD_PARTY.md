# The "15 Claude Code skills" list - what each is, and what we did

Checked 2026-10-17 by searching, then fetching the repos read-only into an isolated folder, scanning every file for
download-and-execute, credential access, obfuscation and prompt-injection patterns (all clean), and reading the skills.
Skills are instructions your agent follows, so none was installed unread. Upstream licences are in `docs/third-party/`.

| # | Name | What it really is | Licence | Verdict |
|---|---|---|---|---|
| 01 | **GSAP** | Official `greensock/gsap-skills` (head aed9cfd): core API, timelines, plugins, ScrollTrigger, React... | MIT | **INSTALLED** `gsap-core`, `gsap-timeline`, `gsap-plugins` (the rest are web-app/scroll topics). GSAP timelines can be seeked with `tl.time(t)` from `renderAt(t)`; SplitText/MorphSVG/DrawSVG are now free |
| 02 | Cube Motion | Not found by name | - | Not identified, not installed |
| 03 | Oil Motion | `oil-oil/oil-motion`: scroll/cursor web animation, not video | - | Skipped (wrong tool) |
| 04 | ShaderCN | No project by that name; closest are shadcn-registry WebGL shader components (shaders.com etc.) | varies | Skipped; our dot-cinema already does glow/particles; revisit if you want shader backgrounds |
| 05 | Hairline | Not found by name | - | Not identified, not installed |
| 06 | **Remotion** | Official `remotion-dev/skills` (React video framework) | none detected in the skills repo; Remotion itself has its own licence terms | Reference only. We use our own renderer; check Remotion's licence before any commercial use |
| 07 | Evil Buttons | Not found by name | - | Not identified, not installed |
| 08 | **Motion B-roll** | `Barty-Bart/motion-graphics` (timed B-roll over talking heads) | **no licence** | Concept only (we already time visuals to word timestamps); do not copy |
| 09 | **Lemo-Opuscar** | `lemomo-ai/lemo-opuscar` (head ded40b2): short films from code, 43 styles, director + technique guides | MIT | **DISTILLED** into `film-direction-method`; its ink-wash/watercolor style cards are inspiration for KATHAAYA |
| 10 | **OpenMontage** | `calesthio/OpenMontage`: agentic video pipelines (YAML playbooks + tools) | **AGPL-3.0** | Ideas only. Copying code would force AGPL on our work; not copied |
| 11 | **HyperFrames** | `heygen-com/hyperframes` (head fa93669): HTML-to-MP4 for agents, GSAP, 19 skills | Apache-2.0 | **DISTILLED** its motion doctrine into `motion-continuity-doctrine`; closest architectural cousin to our engine; optional alternative renderer |
| 12 | Diffusion Studio | Open-source agent video *editor* (macOS Apple Silicon desktop app + CLI `dapi`) | MIT (skills) | Not installed; useful only if you start cutting live footage/screen recordings |
| 13 | Whiteboard Video | Several unrelated repos with that name (hand-drawn explainers) | varies | Skipped; our ink/dot reveal covers the need |
| 14 | **Video Shotcraft** | `Vincentwei1021/video-shotcraft`: 100+ shot recipe cards, Remotion product videos (Chinese-language SKILL) | Apache-2.0 | Reference for Agentic AI product films; not installed |
| 15 | **Howseen Motion** | `howseen-ai/claude-motion-design` (head 3d90d34): HTML + Playwright + ffmpeg film pipeline, very similar to ours | MIT | **DISTILLED** (springs, beat maps, sub-frame motion blur, critique loop, anti-"AI look" rules) into `motion-continuity-doctrine` and `seekable-libs-and-render-quality`. Not installed verbatim: it embeds the author's brand rules and personal paths |

Why distill instead of installing everything: every installed skill adds instructions to your agent's context and can conflict
(for example Howseen's "no em dashes" or its brand colours). We kept the craft and dropped the baggage.
Attribution: ideas credited here and in each skill's body; upstream licence texts kept in `docs/third-party/`.
A curated, security-graded directory of video skills (180 repos) exists at zhuyansen/awesome-claude-video-skills if you want to browse more.
