# Session prompt — ZEARCH · P1-1 (Rewrite SYSTEM_PROMPT for informational pages)

> One self-contained, copy-paste prompt for a single working session.
> Task: **P1-1** in `.agent/TASKS.md`. Generated: 2026-06-09.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working on task P1-1: rewrite the SYSTEM_PROMPT
from financial-calculator flavor to a generic informational-page generator.
Follow every rule below. Work in small steps and check in at the checkpoints.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=5 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/TASKS.md, docs/idea.md,
      apps/orchestrator/src/prompts/shared.ts
Run:  npm run typecheck   ← must be green before any code change
Tell me: what this task changes, which files are affected, and your implementation plan.
Do NOT write code until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- npm run typecheck must be green before you declare done.
- Create a feature branch before making any changes:
    git checkout -b feature/phase-1-system-prompt
- Stay scoped to ONE file: apps/orchestrator/src/prompts/shared.ts.
  Do NOT touch routes, pipeline, llm/, the frontend, or any other file.
- LOAD-BEARING — copy this VERBATIM, do not reword, reorder, or "improve":
  * The "HARD REQUIREMENTS" block lines listing the EXACT CDN script URLs and their
    EXACT order (React 18 UMD → react-dom 18 UMD → prop-types 15.8.1 → recharts 2.15.4
    → papaparse 5.4.1 → tailwindcss CDN → @babel/standalone), then the
    `<script type="text/babel" data-presets="react">` tag AFTER all of them.
  * The `const { useState, useEffect, useMemo, useCallback, useRef } = React;` line.
  * The full `window.Recharts` destructure line (LineChart, Line, XAxis, YAxis, ...).
  * The rules: return ONLY raw HTML starting with <!DOCTYPE html>, no markdown fences,
    single file only, <div id="root"></div> + ReactDOM.createRoot mount.
  These exist because generated apps are transpiled by Babel IN THE BROWSER — any drift
  here breaks rendering for EVERY generated page. Keep them character-for-character.
- This task only rewrites the DESIGN + LOGIC sections (and the opening role sentence).
  Do not split per-archetype templates — that is Phase 2 (P2-x). One generic prompt only.

────────────────────────────────────────────────────────
WHAT TO CHANGE (the actual rewrite)
────────────────────────────────────────────────────────
The current prompt tells the model to build a financial calculator (compound interest,
₹ sliders, "total invested / final value / gains" stat cards, "Apple Notes meets Stripe").
Per docs/idea.md, ZEARCH now produces INFORMATIONAL interactive pages that explain a
topic — the "Napoleon" case: hero + portrait, scrollable timeline, sections, fact cards,
gallery, optional charts. Calculators are now just ONE possible shape, not the default.

Rewrite as follows, keeping the HARD REQUIREMENTS block untouched (see guardrails):

1. Opening role sentence — change from "expert web app generator … mini-app that answers
   the user's prompt" to something like:
   "You are an expert at building beautiful, self-contained informational web PAGES. Given
   a topic or question, you produce a SINGLE self-contained HTML file (React + Tailwind +
   Recharts via CDN) that EXPLAINS and lets the user EXPLORE the topic — like a живой,
   interactive encyclopedia page a knowledgeable friend would build for them."
   (Write it in plain English — the point is "informational page", not "calculator app".)

2. Replace the DESIGN section with informational-page design guidance:
   - Editorial, content-rich, magazine-like. Generous whitespace, clear visual hierarchy.
   - Off-white background, dark readable ink, ONE warm accent color used sparingly.
   - A strong HERO at the top: large title, one-line summary/subtitle, and (if relevant)
     a portrait/representative image placeholder.
   - Reusable building blocks the model should choose from based on the topic:
       * scrollable TIMELINE of dated events
       * SECTION blocks with headings + readable prose
       * FACT CARDS / stat cards (rounded-2xl, shadow-sm) for key numbers/quick facts
       * an image GALLERY grid
       * CHARTS (Recharts) only when there is real quantitative data to show
   - Rounded-2xl cards, subtle shadow-sm, max-w-5xl mx-auto, fully responsive (md:).
   - Typography: font-sans, tracking-tight headings, comfortable reading measure for prose.
   - Use placeholder images (e.g. https://placehold.co/...) where a real image would go —
     real grounded imagery comes later (Phase 3); never leave broken <img> tags.

3. Replace the LOGIC section with informational-page logic guidance:
   - All content client-side, no backend calls.
   - Prefer ACCURACY: only state facts you are confident about; do not invent precise
     statistics. When unsure, keep claims qualitative.
   - Make the page INTERACTIVE where it helps understanding: clickable timeline entries,
     tabbed sections, expandable cards, a lightbox gallery, hover tooltips on charts.
   - Use Recharts ONLY when the topic has genuine quantitative data worth charting; do not
     force a chart onto a topic that doesn't need one. (Recharts must still be IMPORTED per
     the HARD REQUIREMENTS, even if unused.)
   - Calculators/simulators are one valid shape — use sliders + live useMemo recompute ONLY
     when the query is actually a tool/calculator request.

4. Keep the closing line: "Produce ONLY the HTML file. No backticks. No commentary."

Keep the file's top-of-file comment, but update the "NOTE (Phase 1+)" comment to reflect
that Phase 1 (this task) has rewritten DESIGN/LOGIC for informational pages and Phase 2
will add per-archetype templates that reuse the HARD REQUIREMENTS block.

────────────────────────────────────────────────────────
DEFINITION OF DONE
────────────────────────────────────────────────────────
- npm run typecheck green (show output).
- Paste the FULL new shared.ts so I can eyeball it.
- Prove the load-bearing block is intact: show that the 7 CDN script lines (same URLs,
  same order), the React hooks destructure line, and the window.Recharts destructure line
  are byte-for-byte unchanged from the original.
- Confirm there is NO remaining financial/calculator-specific language in the DESIGN/LOGIC
  sections (no "compound interest", no "₹", no "total invested/final value/gains",
  no "Apple Notes meets Stripe", no "NO dark mode" mandate that conflicts with informational
  framing — drop or soften it).
- Update .agent/TASKS.md: mark P1-1 as done.
- List every file changed (path + one-line reason).
- Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; don't run past them silently
────────────────────────────────────────────────────────
A) After session-start reads + typecheck green → plan summary, wait for "go".
B) After the rewrite → show the full new shared.ts AND the load-bearing-block diff proof,
   wait for my review.
C) After final typecheck → show output and file list before touching TASKS.md.
```
