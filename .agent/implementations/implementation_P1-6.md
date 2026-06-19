# Session prompt — ZEARCH · P1-6 (Manual Napoleon end-to-end test)

> One self-contained, copy-paste prompt for a single working session.
> Task: **P1-6** in `.agent/TASKS.md`. Generated: 2026-06-09.
> Depends on: **P1-1** (new SYSTEM_PROMPT) and **P1-2** (topical examples) being done first.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working on task P1-6: a manual end-to-end test that
proves a real INFORMATIONAL page (the "Napoleon" case) generates, deploys, and renders in the
iframe with the new Phase 1 system prompt.
This is a VERIFICATION task — not a feature. Follow every rule below.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=5 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/TASKS.md, docs/idea.md,
      apps/orchestrator/src/prompts/shared.ts (confirm P1-1 rewrite is in place)
Run:  npm run typecheck   ← must be green before testing
Confirm: P1-1 (informational SYSTEM_PROMPT) and P1-2 (topical EXAMPLES) are marked done in
         .agent/TASKS.md. If either is NOT done, STOP and tell me — this task can't proceed.
Tell me your test plan, then wait for "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- This is primarily a TEST. Only make code changes if the test surfaces a bug, and if so:
  create a feature branch first (git checkout -b feature/phase-1-napoleon-fixes), make the
  SMALLEST fix, and report it — do not refactor.
- A .env at the repo root with a valid GROQ_API_KEY is REQUIRED for generation to work. If
  GROQ_API_KEY is missing, STOP and ask me to add it (you cannot generate without it).
- Be mindful of Groq free-tier TPM limits (per CLAUDE.md): GROQ_MAX_TOKENS default is 7000.
  If /api/generate returns HTTP 413, that's a token-budget issue, not a prompt bug — report it.
- Do NOT delete generated app files manually; use POST /api/teardown to clean up.

────────────────────────────────────────────────────────
THE TEST (run end-to-end, capture evidence at each step)
────────────────────────────────────────────────────────
Goal: prove the pipeline produces a genuine informational page for "Napoleon Bonaparte"
(hero, timeline, sections, fact cards / gallery) — NOT a financial calculator.

Option A — full stack (preferred if you can run a browser/manual check):
  1. Start the app: npm run dev  (orchestrator :8080 + frontend :5173).
     Run it in the background; confirm orchestrator logs the active LLM provider (groq) and
     does NOT warn about a missing key.
  2. Drive the API directly with curl/Invoke-RestMethod against the orchestrator (:8080):
       a. POST /api/generate  with body { "prompt": "Napoleon Bonaparte" }
          → capture the returned HTML (it's the generated page).
       b. POST /api/deploy    with the returned html
          → capture id / serviceUrl / deploymentId / tearDownAt.
       c. GET  /api/status/:deploymentId
          → confirm it reports healthy.
       d. Open serviceUrl (or GET /app/:id) and confirm the HTML loads.
  3. Verify the GENERATED HTML (static checks on the returned html string):
       - starts with <!DOCTYPE html>
       - contains the 7 required CDN scripts in order (react, react-dom, prop-types,
         recharts, [papaparse], tailwindcss, @babel/standalone)
       - contains <div id="root"></div> and a <script type="text/babel" ...>
       - contains the window.Recharts destructure line
       - does NOT contain financial-calculator tells (no "compound interest", no "₹",
         no "total invested" stat cards driving the whole page)
       - DOES contain informational structure: a hero/title for Napoleon, multiple content
         sections, and at least one of {timeline, fact cards, gallery}
  4. Clean up: POST /api/teardown for the app id.

Option B — if you cannot open a real browser:
  Do steps 1–4 above but for the "renders" check, save the generated HTML to a temp file and
  inspect it thoroughly (structure + the static checks in step 3). Clearly state in your
  report that visual render was inspected via HTML structure, not a live browser, and that I
  should do a final eyeball in the browser at the serviceUrl.

────────────────────────────────────────────────────────
DEFINITION OF DONE
────────────────────────────────────────────────────────
- Show the actual request/response evidence: the /api/generate → /api/deploy → /api/status
  calls and their key fields, plus the static-check results against the generated HTML.
- Give a clear PASS/FAIL verdict: did a real informational Napoleon page render?
  * PASS → mark P1-6 done in .agent/TASKS.md and summarize what the page contained.
  * FAIL → do NOT mark done. Describe exactly what was wrong (e.g. still calculator-flavored,
    missing CDN, blank iframe, 413 token error) and propose the smallest fix — likely a tweak
    to apps/orchestrator/src/prompts/shared.ts (P1-1), which I'll then re-run.
- Confirm the test app was torn down (cleanup done).
- npm run typecheck green if you changed any code.
- List any files changed (path + one-line reason); if none, say "no code changes".
- Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; don't run past them silently
────────────────────────────────────────────────────────
A) After session-start reads + typecheck + key/deps confirmation → test plan, wait for "go".
B) After the generate→deploy→status run → show the evidence + static checks, wait for review.
C) PASS/FAIL verdict + cleanup confirmation before touching TASKS.md.
```
