# Stitch Redesign Notes — AERO Hackathon Presentation v2

**Date:** 2026-04-17
**Related plan:** `docs/superpowers/plans/2026-04-17-aero-hackathon-presentation.md` (Phase C + D)
**Related spec:** `docs/superpowers/specs/2026-04-17-aero-townhall-presentation-design.md`

---

## Design direction — locked

| Dimension | Decision |
|---|---|
| Quality bar | Apple Keynote 2024 · Linear product launch · Rauno Freiberg portfolio · Jony Ive event reveals |
| Core feeling | Cinematic, weightless, precise. "Doświadczenie, nie prezentacja." |
| First 2 sec | WOW moment — particle swarm forming AERO, glitch flash reveal |
| Background | WebGL shader flow field + parallax layers + mouse-reactive glow |
| Typography | Kinetic reveals, blur-to-sharp, per-word stagger, big gradients |
| Motion | Choreographed (not simultaneous) — magnetic easing, stagger, depth |
| Interactions | 3D card tilt (perspective 1200px), custom cursor with trailing ring, ambient follow glow |
| Transitions | Per-slide unique cinematic sequences (zoom, cascade, pulse) — not fade |
| Color temperature | Per-slide shift (neutral → cool → warm → bright → amber → vibrant) |

## Per-slide design direction

### Slide 1 — Tytuł
- WebGL flow field background (custom GLSL fragment shader, no libs)
- Cinematic intro: black → particle swarm forms "AERO" → glitch flash → subtitle reveal
- Blinking cursor (reuse) + glitch effect na start
- Presenter names reveal z blur-to-sharp

### Slide 2 — Sytuacja
- Color temperature: cool (deep blue)
- Presenter cards z 3D tilt on hover
- Brief terminal: scan line effect + typing animation dla listy
- Countdown 48:00:00 subtle pulse

### Slide 3 — Magia / Stack
- Color temperature: warm
- 4 stack cards z orbiting icons (SVG animated)
- Flow diagram lines pulsują z chromatic flow
- Prompt decorations (już w v1) — zwiększyć density, subtle drift animation

### Slide 4 — Dowód
- Color temperature: bright (success green tint)
- Hero video frame z cinematic border (black matte) + corner markers
- Numbers animate w ring progression (SVG stroke dasharray + counter)
- RBAC mini-diagram z animated connection lines (light pulses traveling)
- IAM irony reworked → SysOps angle (już Phase A)

### Slide 5 — Warsztat
- Color temperature: amber (warsztat = toolshop wibe)
- 3 cards z unique per-card background patterns (dots / lines / mesh)
- Card hover: magnetic scale + highlighted accent line
- "// lesson-0N.md" file header → typing effect on slide enter

### Slide 6 — Wasz ruch
- Color temperature: vibrant (full gradient aurora)
- Aurora effect tło (animated gradient mesh, northern lights)
- Hero copy letter-by-letter reveal
- CTA cards z stagger + 3D tilt
- "Pytania?" confetti burst on reveal

## Implementation mapping

All directions above are implemented as CSS/JS in `docs/AERO_Hackathon_Presentation.html` during **Phase D (Manual Polish)**. Stitch mockup tool was available (`mcp__stitch__*`) but skipped for this iteration — design direction was concrete enough from plan + spec that hand-writing the implementation is faster than iterating on generated UI mockups that would need translation to HTML anyway.

**Future iteration:** if user wants visual A/B variants of a specific slide after seeing Phase D result, spawn Stitch generation per slide at that point.

## References

- `docs/AERO_Presentation.html` — existing glassmorphism CSS (already reused in v1)
- `.gsd/projects/49b632c5e274/KNOWLEDGE.md` — hackathon anecdotes
- `.gsd/projects/49b632c5e274/DECISIONS.md` — technical decisions
