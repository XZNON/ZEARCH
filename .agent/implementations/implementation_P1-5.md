# Session prompt — ZEARCH · P1-5 (Fix stale README "Getting Started" + framing)

> One self-contained, copy-paste prompt for a single working session.
> Task: **P1-5** in `.agent/TASKS.md`. Generated: 2026-06-09.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working on task P1-5: rewrite the stale README so
it matches the actual monorepo + Groq + native-hosting reality (no backend/, no node index.js,
no Locus).
Follow every rule below. Work in small steps and check in at the checkpoints.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=5 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/TASKS.md, docs/idea.md, README.md
Run:  npm run typecheck   ← must be green before any change (docs-only, but confirm baseline)
Tell me: what's stale in the current README and your rewrite plan.
Do NOT write until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- Create a feature branch before making any changes:
    git checkout -b feature/phase-1-readme
- Scope: README.md only. Do NOT change code, CLAUDE.md, or other docs.
- Every command and path you put in the README must be REAL — verify against the repo
  (root package.json scripts, CLAUDE.md "Commands" + "Required environment" sections).
  Do not invent scripts. Do not document a backend/ dir or node index.js — they do not exist.
- Keep it honest: ZEARCH hosts generated pages NATIVELY (stores + serves the HTML itself).
  There is NO Locus, NO containers, NO git-push deploy. Do not reintroduce that language.

────────────────────────────────────────────────────────
WHAT'S STALE (must all be fixed)
────────────────────────────────────────────────────────
The current README still describes the v0 product. Specifically:
- Tagline/intro frames it as "interactive tools — dashboards, simulators, data explorers".
  ZEARCH is now INFORMATIONAL interactive SEARCH (the Napoleon case); tools are one archetype.
- "Instant Deployment (Locus)", "Locus-wrapped Anthropic API", Tech Stack listing Locus +
  Anthropic — ALL WRONG. It's Groq for the LLM and native orchestrator hosting now.
- "How it works" diagram says "deployed via Locus (project + service)" — wrong.
- Getting Started step 3 only sets GROQ_API_KEY — fine, but the surrounding framing implies
  Locus keys elsewhere; make sure nothing references Locus/Anthropic keys.
- Use Cases lead with "Financial simulators" — reframe to informational pages first.

────────────────────────────────────────────────────────
SCOPE (rewrite README.md)
────────────────────────────────────────────────────────
Rewrite the README so it is accurate and reads as the informational-search product. Sections
to produce (keep it tight; emoji headers are fine to match house style):

1. Title + one-liner — pull the framing from docs/idea.md:
   "A new kind of search: type a query, get a live, interactive web page that explains,
    visualizes, and lets you explore the topic." Tagline: "Search gives answers.
    ZEARCH gives understanding you can touch."

2. What is ZEARCH — short paragraph: natural-language query → LLM generates a single
   self-contained index.html (React + Tailwind + Recharts via CDN, Babel-in-browser) →
   orchestrator stores + serves it at a unique URL → page auto-tears-down after 30 min idle.

3. Demo — keep the existing screenshot block(s) if the asset files still exist (check
   ./assets/*.png referenced in the current README; keep whichever exist, drop refs to any
   that don't). Use a topical example query in the prose, e.g. "Napoleon Bonaparte" or
   "How black holes work" — NOT the IPL/financial framing as the headline example.

4. Page archetypes — brief list (person, event, place, concept, comparison, data, tool)
   summarized from docs/idea.md. One line each.

5. How it works — corrected flow (NO Locus):
     Prompt → LLM (Groq) generates a self-contained HTML page → orchestrator stores + serves
     it at /app/:id → frontend iframes the live page → auto teardown after 30 min idle.

6. Tech Stack — correct it:
     - Groq (OpenAI-compatible) — LLM generation (default model openai/gpt-oss-120b)
     - Node.js + Express (TypeScript, ESM, run via tsx) — orchestrator
     - Vite + React 18 + Tailwind — frontend SPA
     - React + Tailwind + Recharts via CDN — the generated pages
     - npm workspaces monorepo (apps/orchestrator, apps/frontend, packages/shared)

7. Getting Started — make it match CLAUDE.md "Commands" + "Required environment" EXACTLY:
     1. git clone … && cd ZEARCH
     2. npm install            (from repo root — installs all workspaces, one hoisted node_modules)
     3. Create a .env at the repo ROOT with:
            GROQ_API_KEY="your_groq_api_key"
        (mention optional: LLM_PROVIDER, GROQ_MODEL, GROQ_MAX_TOKENS, PUBLIC_BASE, PORT —
         brief, point at CLAUDE.md for the full list. Use KEY="value" form.)
     4. npm run dev            (orchestrator :8080 + frontend :5173 in parallel)
        Also mention: npm run dev:orch, npm run dev:web, npm run typecheck, npm run build.
   Orchestrator API: http://localhost:8080 · Frontend: http://localhost:5173

8. Roadmap (optional) — keep light; can reflect the phases (archetype routing, grounding,
   persistence/sharing). Don't overpromise.

Remove every remaining mention of Locus, "Locus-wrapped Anthropic", containers, and
"node index.js"/"cd backend".

────────────────────────────────────────────────────────
DEFINITION OF DONE
────────────────────────────────────────────────────────
- Paste the full new README.md.
- Prove no stale strings remain — run and show empty results:
    grep -ni "locus" README.md
    grep -ni "anthropic" README.md
    grep -ni "node index.js" README.md
    grep -ni "backend/" README.md
- Every command in Getting Started exists in the root package.json scripts (show the scripts
  block to cross-check).
- npm run typecheck still green (sanity; docs-only change).
- Update .agent/TASKS.md: mark P1-5 as done.
- List every file changed (path + one-line reason).
- Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; don't run past them silently
────────────────────────────────────────────────────────
A) After session-start reads → list of stale items + rewrite outline, wait for "go".
B) After the rewrite → show full new README + the four grep results, wait for my review.
C) Before touching TASKS.md → confirm done criteria met.
```
