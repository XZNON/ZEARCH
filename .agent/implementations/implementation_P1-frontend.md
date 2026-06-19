# Session prompt — ZEARCH · P1-frontend (Frontend editorial redesign)

> One self-contained, copy-paste prompt for a single working session.
> Tasks: **P1-2, P1-3, P1-4, P1-7, P1-8, P1-9, P1-10, P1-11** in `.agent/TASKS.md`.
> Generated: 2026-06-08.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working on the Phase 1 frontend editorial redesign,
covering tasks P1-2, P1-3, P1-4, P1-7, P1-8, P1-9, P1-10, P1-11.
Follow every rule below. Work in small steps and check in at the checkpoints.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=5 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/TASKS.md, docs/idea.md
Run:  npm run typecheck   ← must be green before any code change
Tell me: what this task changes, which files are affected, and your implementation plan.
Do NOT write code until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- npm run typecheck must be green before you declare done.
- Work on branch: feature/phase-1-frontend-redesign (already created).
- Stay scoped to the files listed in SCOPE. Do not touch orchestrator files.
- Tailwind classes only — no inline style="" blocks unless strictly necessary (e.g. aspect-ratio).
- Do not add new npm packages without asking first.
- The `Stage` type in `apps/frontend/src/types.ts` must stay in sync with `useGeneration.ts` if you change stage values.

────────────────────────────────────────────────────────
DESIGN DIRECTION
────────────────────────────────────────────────────────
Style: Editorial. Think magazine/publication — rich landing that showcases what ZEARCH produces.
NOT a minimal search bar page (that comes later if search volume justifies it).

Light theme: warm off-white background (#faf9f7), near-black ink (#1a1814), orange accent (#ef5b36).
Dark theme:  deep neutral background (#111109), warm white text (#f0ede8), same orange accent.
Toggle: sun/moon icon in Header, persisted to localStorage under key "zearch-theme".
CSS approach: add `data-theme="light"|"dark"` on <html>; define --bg, --ink, --accent, --card
  CSS custom properties in index.css; replace hardcoded colors with var(--...) in components.

────────────────────────────────────────────────────────
IMPLEMENTATION ORDER (do in this sequence)
────────────────────────────────────────────────────────
1. P1-10 — CSS variables + theme toggle (foundation; everything else uses vars)
2. P1-3  — Strip all Locus copy
3. P1-4  — Hero + PromptBox + AppViewer update placeholder copy
4. P1-2  — Swap example chips
5. P1-7  — Collapse BuildingCard stages
6. P1-11 — AppViewer: remove debug row, add teardown countdown
7. P1-8  — New ArchetypeShowcase component
8. P1-9  — New HowItWorks component

────────────────────────────────────────────────────────
SCOPE
────────────────────────────────────────────────────────

### P1-10 — Dark/light mode
Files:
- apps/frontend/src/index.css  — add CSS custom properties under [data-theme="light"] and [data-theme="dark"]
- apps/frontend/src/components/Header.tsx  — add theme toggle button (sun/moon SVG icon)
- apps/frontend/src/main.tsx  — read localStorage "zearch-theme" on mount, set data-theme on <html>

CSS variables to define:
  --bg         (page background)
  --ink        (primary text)
  --ink-muted  (secondary text, ~60% opacity equivalent)
  --card-bg    (card/surface background)
  --card-border(card border)
  --accent     (#ef5b36 in both themes)

Replace existing hardcoded Tailwind bg-[#faf9f7], text-ink/60, etc. with var()-based classes
or inline vars where Tailwind can't reach.

### P1-3 — Strip Locus copy
Files:
- apps/frontend/src/components/Header.tsx
  REMOVE: `<span className="dot-pulse" /> powered by Locus Build`
  REPLACE with: nothing (keep the right-side area for the theme toggle from P1-10)

- apps/frontend/src/components/Footer.tsx
  REPLACE entire text with:
  "Powered by Groq. Pages are ephemeral — auto-destroyed after 30 min idle."

- apps/frontend/src/components/AppViewer.tsx  (SkeletonBuild inner component)
  REMOVE: "Locus is provisioning a real container. This usually takes 1–3 minutes."
  REPLACE with: "Building your page…"
  Also remove the 6-stage progress bar from SkeletonBuild (it duplicates BuildingCard and uses
  the fake container stages). Replace with a single centered shimmer + the note text + elapsed.

- apps/frontend/src/hooks/useGeneration.ts
  Find all statusNote strings that reference Locus ("Pushing to Locus", "Building container",
  "Locus is packaging", etc.) and replace with honest equivalents:
    generating → "Thinking…"
    packaging  → "Preparing…"
    pushing    → "Building…"
    building   → "Building…"
    deploying  → "Almost ready…"
    healthy    → "Ready"

### P1-4 — Copy updates
Files:
- apps/frontend/src/components/Hero.tsx
  Headline: keep "Search gives answers." / change "We give tools." → "We give understanding."
  Subtext: "Ask anything — get a live, interactive page that explains, visualizes, and lets
  you explore the topic. In seconds."
  Keep the eyebrow tag "a new kind of search".

- apps/frontend/src/components/PromptBox.tsx
  Placeholder: change from "If I invest ₹10,000/month…" →
  "Napoleon Bonaparte, How black holes work, French Revolution…"
  Button label: change "Build it →" → "Search →" (idle) / "Searching…" (busy)

- apps/frontend/src/components/AppViewer.tsx  (update input)
  Placeholder: change from "Make it yearly instead of monthly, add inflation adjustment…" →
  "Focus on his military campaigns, add a timeline, make it darker…"
  Label above iframe: change "Your app" → "Your page"

### P1-2 — Example chips
Files:
- apps/frontend/src/App.tsx  (or wherever EXAMPLES const lives — search for it)
  Replace financial examples with:
  [
    "Napoleon Bonaparte",
    "How black holes work",
    "French Revolution",
    "Kyoto, Japan",
    "React vs Vue",
    "Apollo 11 mission",
    "CRISPR gene editing",
  ]

### P1-7 — Collapse BuildingCard stages
Files:
- apps/frontend/src/types.ts
  Change Stage type to: 'thinking' | 'building' | 'ready'
  (keep 'healthy' as alias or map it — see useGeneration.ts)

- apps/frontend/src/hooks/useGeneration.ts
  Map the internal polling stages to the 3 new UI stages:
    generating/packaging → 'thinking'
    pushing/building/deploying → 'building'
    healthy → 'ready'

- apps/frontend/src/components/BuildingCard.tsx
  New 3-step progress bar (3 segments instead of 6).
  Labels: "Thinking", "Building", "Ready"
  Remove old labelFor() switch with container-ops labels.

### P1-11 — AppViewer improvements
Files:
- apps/frontend/src/components/AppViewer.tsx
  REMOVE the debug row:
    <span>project: <code>{result.projectId}</code></span>
    <span>service: <code>{result.serviceId}</code></span>
  KEEP the teardown time. Convert to a countdown: "Auto-destroys in Xm Ys" using a
  useEffect + setInterval that counts down from result.tearDownAt. Show in the same
  small-text row below the iframe.

### P1-8 — ArchetypeShowcase component
Files:
- apps/frontend/src/components/ArchetypeShowcase.tsx  (NEW FILE)
  7 cards in a responsive grid (2 cols mobile, 3-4 cols desktop).
  Each card:
    - Archetype icon (simple SVG or emoji as fallback)
    - Archetype name (bold)
    - Example query (muted, italic)
    - Shape hint (tiny text, e.g. "timeline · map · battles · gallery")
  Clicking a card calls onPick(exampleQuery) → pre-fills PromptBox.
  Disabled when busy.

  Archetype data (hardcode in the component):
  { name: "Person / Biography", icon: "👤", example: "Napoleon Bonaparte",     shape: "timeline · portrait · battles · legacy" },
  { name: "Event / History",    icon: "📅", example: "French Revolution",       shape: "cause→effect · key figures · map · aftermath" },
  { name: "Place / Geography",  icon: "🌍", example: "Kyoto, Japan",            shape: "map · facts · gallery · things to know" },
  { name: "Concept / Science",  icon: "🔬", example: "How black holes work",    shape: "explainer · diagrams · analogy · sim" },
  { name: "Comparison",         icon: "⚖️",  example: "React vs Vue",            shape: "side-by-side · radar chart · verdict" },
  { name: "Data / Stats",       icon: "📊", example: "World population trends", shape: "charts · filters · sortable tables" },
  { name: "Tool / Calculator",  icon: "🧮", example: "SIP calculator ₹10k/mo",  shape: "sliders · live stat cards · charts" },

- apps/frontend/src/App.tsx
  Import and render <ArchetypeShowcase> between Hero/PromptBox/Examples and footer area,
  only when not busy and no result yet (landing state).
  Pass onPick={setPrompt} and disabled={busy}.

### P1-9 — HowItWorks component
Files:
- apps/frontend/src/components/HowItWorks.tsx  (NEW FILE)
  3-step horizontal (desktop) / vertical (mobile) layout.
  Steps:
    1. "Type a query"       — "Ask about any person, event, place, or concept."
    2. "ZEARCH builds"      — "A live, interactive page is generated in seconds."
    3. "Explore and refine" — "Scroll, interact, and tweak it with follow-up prompts."
  Simple numbered steps or icon + text. No heavy graphics.
  Render between ArchetypeShowcase and Footer in App.tsx (landing state only).

────────────────────────────────────────────────────────
DEFINITION OF DONE
────────────────────────────────────────────────────────
- npm run typecheck green (show output).
- All 8 tasks (P1-2, P1-3, P1-4, P1-7, P1-8, P1-9, P1-10, P1-11) acceptance:
  - No "Locus" string anywhere in apps/frontend/src/ (run: grep -r "Locus" apps/frontend/src/)
  - No "₹" or "investment" in placeholder copy
  - Stage type has 3 values (thinking/building/ready)
  - ArchetypeShowcase and HowItWorks render on the landing page
  - Theme toggle switches data-theme on <html> and persists to localStorage
  - AppViewer debug row gone; teardown countdown present
- Update .agent/TASKS.md: mark P1-2, P1-3, P1-4, P1-7, P1-8, P1-9, P1-10, P1-11 as done.
- List every file changed (path + one-line reason).
- Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; don't run past them silently
────────────────────────────────────────────────────────
A) After session-start reads + typecheck green → plan summary, wait for "go".
B) After P1-10 (CSS vars + toggle) → confirm theme switches visually, wait for review.
C) After P1-3 + P1-4 + P1-2 + P1-7 + P1-11 → grep for "Locus", show result, wait for review.
D) After P1-8 + P1-9 (new components) → show component code, wait for review.
E) After final typecheck → show output and full file list before touching TASKS.md.
```
