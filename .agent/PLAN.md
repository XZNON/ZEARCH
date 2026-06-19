# ZEARCH — Project Plan

> Repo: **https://github.com/XZNON/ZEARCH** · Vision source: `docs/idea.md` · Work board: `.agent/TASKS.md`
> Agent guide: `CLAUDE.md` · Original build plan: root `PLAN.md`
>
> This is the living plan: **what ZEARCH is, where it's going, how it's built, and what's left.**
> It folds in the archetype prompt system (built under `apps/orchestrator/src/prompts/archetypes/`).

---

## 1. What ZEARCH is

ZEARCH is **a new kind of search**. Instead of returning a list of links or a wall of text, it
turns a natural-language query into a **single, live, self-contained interactive web page** that
explains and lets you explore the topic — then hosts it at a unique URL and tears it down after
30 minutes idle.

```
query → Architect (tool-loop: plan + research + ground) → Build Spec → Builder (generate + repair) → store → serve live → refine
```

- **Input:** a plain query — "Napoleon Bonaparte", "How black holes work", "React vs Vue".
- **Output:** one self-contained `index.html` (React 18 + Tailwind + Recharts via CDN, transpiled
  by Babel in the browser — no build step), stored by the orchestrator and served at `/app/:id`.
- **Lifecycle:** ephemeral by default; auto-destroyed after 30 min idle.

**Promise: understanding you can touch.** "Search gives answers. ZEARCH gives tools and pages."

### End goal

A query-to-interactive-page engine that reliably produces **accurate, beautiful, genuinely
interactive** pages across a handful of distinct page *archetypes*, grounded in real data, in
~15 seconds, with broken pages never reaching the user. The **flagship proof** is the **Napoleon
test**: typing "Napoleon Bonaparte" yields a page with a hero/portrait, a life timeline, campaign
detail, key relationships, and a legacy section — all interactive — without hand-tuning.

The product began life (v0) as a *financial-calculator generator*. The pivot: calculators are now
just **one archetype among seven**; the product is informational interactive search.

---

## 2. Architecture (today)

**npm workspaces monorepo** (`apps/*` + `packages/*`, no Turborepo). Structure mirrors the
generation pipeline ("screaming architecture"), not generic MVC.

- **`apps/orchestrator/`** (`@zearch/orchestrator`) — Express API (ESM, TypeScript via `tsx`), port
  **8080**. The backend brain.
  - `routes/` — thin HTTP: `generate.ts` (`/api/generate`, `/api/update`), `deploy.ts`
    (`/api/deploy`, `/api/status/:id`, `/api/teardown`), `apps.ts` (`GET /app/:id`).
  - `pipeline/` — **the core**. `generate.ts` = Stage C; `index.ts` is the seam where Stages A/B
    compose in later.
  - `llm/` — `providers.ts` (provider abstraction; `groq` default, `openai` built-in) + `client.ts`
    (the only module that talks HTTP to an LLM, OpenAI-compatible `/chat/completions`).
  - `prompts/` — `shared.ts` (the live `SYSTEM_PROMPT`) + **`archetypes/`** (the archetype system,
    see §4).
  - `store/` — `appStore.ts` (in-memory Map + disk mirror) + `lifecycle.ts` (teardown timers).
  - `lib/` — `html.ts` (`extractHTML`), `logger.ts`. `config.ts` — the one place env is read.
- **`packages/shared/`** (`@zearch/shared`) — the single API contract, `import type` only, zero
  runtime cost.
- **`apps/frontend/`** (`@zearch/frontend`) — Vite + React 18 + Tailwind SPA (dev **5173**). The
  `useGeneration.ts` hook owns the generate→deploy→poll→update→teardown state machine.

### Request flow
`POST /api/generate` (prompt → html) → `POST /api/deploy` (html → id + `tearDownAt`) → frontend
polls `GET /api/status/:id` (native hosting reports `healthy` immediately) → `POST /api/update`
re-generates from previous HTML + an update prompt → `POST /api/teardown` deletes it.

### LLM brain
Provider is config, not code (D4): an OpenAI-compatible base URL + key + model. Groq today
(`openai/gpt-oss-120b`); swap to OpenAI/Anthropic by changing env, no pipeline changes. Plan
(P2-4): a **cheap/fast** model for Stage A classify, a **strong** model for Stage C generate.

---

## 3. The generation pipeline (the core of the product) — the Agentic Core

**Re-architecture (D12–D15).** The pipeline is an **agentic build** in two stages. The Architect
figures out *what to build and gathers everything it needs* via a tool loop; the Builder *builds
it*. Keeping the tool loop entirely inside the Architect quarantines the agentic complexity and
lets the Builder stay a focused, deterministic HTML generator.

- **Stage 1 — Architect (the tool loop).** Input: the raw query. A reasoning LLM with a **tool
  registry** (§4a) runs an OpenAI function-calling loop: decide the app type, the design/
  presentation that fits, and what data is needed — then call tools (Tavily search+extract,
  `wikipedia_summary`, `image_search`) to gather it. Output: a structured **Build Spec**
  `{ intent/archetype, designDirection, presentation, facts[] (+sources), images[],
  liveEndpoint?, snapshot? }`. Bounded (max iterations, timeout); degrades to an ungrounded spec
  on tool failure. *Absorbs the old Stage-A classify.* **Phase B.**
- **Stage 2 — Builder (Build Spec → HTML).** Compose the **render contract**
  (`archetypes/hard-requirements.ts` — the load-bearing CDN/`window.Recharts`/`#root` block) with
  the Build Spec, make one strong generation call, then run a **validate + repair loop** (`#root`,
  CDNs, parseable; auto-retry) so broken pages never reach the iframe. `extractHTML` as today.
  **Phase C.**
- **Live data (D14).** For live-data queries the Architect emits a `liveEndpoint` spec **and** a
  build-time `snapshot`; the Builder writes a page that fetches the live API client-side **through
  the orchestrator `/api/live` proxy** (CORS bypass + key injection) and falls back to the
  snapshot on failure. **Phase D.**
- **Serve & refine.** Store (memory + disk), serve at `/app/:id`, iframe it; follow-up prompts
  regenerate from previous HTML (Builder-only, no new tool loop). *Live today.*

> **What this supersedes:** the live `prompts/shared.ts` `SYSTEM_PROMPT` and the Phase 2
> classify→compose path. `pipeline/classify.ts` and the 0.4-confidence cutover are **retired** at
> cutover (Phase E). **What survives:** the archetype templates + `hard-requirements.ts` (§4)
> become the Builder's render contract — the Architect now owns routing, richer than the old
> classifier.

---

## 4. The archetype system

**Why archetypes:** a "Napoleon" page and a "compound interest calculator" want fundamentally
different shapes, content, and logic. One mega-prompt that says "use compound-interest formulas"
actively sabotages a biography page. So generation routes the query to a specialized prompt.

### Seven archetypes → three template families

The frontend already advertises **seven** archetypes (`components/ArchetypeShowcase.tsx`). But four
of them — Person, Event, Place, Concept — are the same animal (a beautiful structured reference
page) and differ only in section scaffold and one signature visual. So the backend maintains
**three families**, not seven prompts — keeping the 7-archetype UX with far less surface to drift:

| Family | Backs archetypes | Character |
| --- | --- | --- |
| **reference** | person · event · place · concept | Editorial, richly factual reading page. Shared spine + a per-subtype scaffold (life timeline / cause→effect / locator map / labeled diagram). |
| **comparison** | comparison | Verdict-first; contender cards, side-by-side dimension table, radar chart, pros/cons, decision guide. Handles N≥2. |
| **interactive** | tool · data | The only family with compute logic — calculators (inputs→stat cards→chart, correct formulas) and data explorers (illustrative dataset, filters, charts, sortable table). |

### Files (`apps/orchestrator/src/prompts/archetypes/`)

- `hard-requirements.ts` — the three **shared** blocks every family reuses:
  `HARD_REQUIREMENTS` (the load-bearing CDN/render contract — single source of truth),
  `SHARED_DESIGN_FOUNDATION` (house style), `QUALITY_BAR` (the "don't ship garbage" contract).
- `reference.ts` — `buildReference(slug)` + per-subtype scaffolds. `comparison.ts` —
  `buildComparison()`. `interactive.ts` — `buildInteractive(slug)` + tool/data scaffolds.
- `classify.ts` — Stage A: `CLASSIFY_SYSTEM_PROMPT` (strict-JSON, ordered routing rules, few-shot
  examples) + `ClassifyResult` type + `buildClassifyUserMessage()`.
- `index.ts` — the public seam: the `ARCHETYPES` registry (mirrors the frontend showcase 1:1) and
  `composeSystemPrompt(slug)` = role → render contract → design → family body → quality bar.

### Status & role under the Agentic Core

**Built, type-checked, and now repurposed.** Phase 2 wired a `classify → composeSystemPrompt →
generate` path, but the re-architecture (§3) replaces that wiring. Under the Agentic Core:

- **The Architect owns routing** (richer than `classify.ts`): it decides the archetype/design as
  part of its reasoning loop and writes it into the Build Spec. `pipeline/classify.ts`,
  `CLASSIFY_SYSTEM_PROMPT`, and the confidence cutover are **retired** at cutover (Phase E).
- **`composeSystemPrompt()` + `hard-requirements.ts` survive** as the **Builder's render contract**
  (Phase C) — the family bodies + the load-bearing CDN/`#root` block still shape and stabilize the
  generated page; they're now fed by the Build Spec instead of a raw query.

## 4a. The tool layer & Build Spec (new — Phase A)

**Tool registry (D13).** A pluggable layer under `apps/orchestrator/src/tools/`: each tool is
`{ name, description, parameters (JSON schema), execute() }` and self-registers into a registry;
the Architect pulls the list and hands the schemas to OpenAI function-calling. Adding a tool later
is one file — no loop changes. **Launch tools:** Tavily (search **+** content extraction, behind a
swappable `SearchProvider` seam; `TAVILY_API_KEY`), `wikipedia_summary` (Wikipedia REST),
`image_search` (Wikimedia/Commons, license-safe).

**Build Spec (the Architect↔Builder contract).** Lives in `@zearch/shared` next to the wire types:
`{ intent/archetype, designDirection, presentation, facts[] (+sources), images[], liveEndpoint?,
snapshot? }`. It is the single structured handoff — the Architect fills it, the Builder consumes it.

**Live proxy (D14).** `/api/live` on the orchestrator forwards a generated page's fetch to the real
API, injecting any key server-side and sidestepping CORS, with a cache hook for later. Generated
pages try `/api/live` (live) → fall back to the baked snapshot.

---

## 5. Confirmed decisions

| # | Decision |
| --- | --- |
| D1 | Pivot to informational interactive search; calculators become one archetype. |
| D2 | Output stays a single self-contained `index.html` (React + Tailwind + Recharts CDN, Babel-in-browser). |
| D3 | Native hosting in the orchestrator — store HTML, serve at `/app/:id`. No Locus/containers/git-push. |
| D4 | LLM is provider-agnostic via the OpenAI-compatible API (Groq today; swap by base-URL/key/model). |
| D5 | Ground generations in real data (Wikipedia/Wikimedia) injected before generating. |
| D6 | Archetype routing — detect intent, route to a specialized prompt (3 families back 7 archetypes). |
| D7 | Solo project — `.agent/TASKS.md` is a simple backlog; no ownership/worktrees. |
| D8 | Ephemeral by default (30-min idle teardown); opt-in persistent links are later. |
| D9 | npm workspaces monorepo (`apps/*` + `packages/*`); Turborepo deferred until ~6+ packages. |
| D10 | One shared API contract in `packages/shared`, imported by both apps. |
| D11 | Structure mirrors the pipeline (`pipeline`/`prompts`/`llm`/`store`), not MVC. |
| D12 | **Agentic build pipeline** — replace static `classify→ground→generate` with **Architect → Builder** (§3). Archetype templates survive as the Builder's render contract; `classify.ts` retired. |
| D13 | **Pluggable tool registry**; **Tavily** for web search + extraction. Launch tools: Tavily, `wikipedia_summary`, `image_search` (§4a). |
| D14 | **Live data** via the generated page fetching client-side through an orchestrator **`/api/live` proxy** (CORS + key hiding), with a build-time **snapshot fallback**. |
| D15 | **OpenAI for all calls** (Architect + Builder). Groq/TPM no longer constrains us; multi-turn tool loops are fine. Supersedes D4's Groq-default framing. |

---

## 6. Phased roadmap (with status)

| Phase | Goal | Status |
| --- | --- | --- |
| **0 — Planning** | `docs/idea.md`, `PLAN.md`, `.agent/TASKS.md`. | ✅ done |
| **R — Restructure & Monorepo** | Convert to npm workspaces; `apps/` + `packages/shared`; lay out orchestrator + frontend per the pipeline. Behavior-identical. | ✅ done |
| **1 — Reframe to informational search** | Rewrite `SYSTEM_PROMPT` financial → generic; strip Locus copy; topical examples; archetype showcase + how-it-works UI; theme toggle; honest 3-stage build UI. | ✅ done (P1-6 Napoleon smoke test still open) |
| **2 — Archetype routing** | Stage A classifier + per-archetype templates + classify→compose→generate wiring + model tiers. | ✅ done — **classify/cutover wiring superseded** by the Agentic Core; templates kept as the Builder's render contract |
| **A — Tooling foundation** | Tool registry + `Tool` interface; Tavily / `wikipedia_summary` / `image_search` tools; **Build Spec** contract in `@zearch/shared` (§4a). | ⬜ todo — **next** |
| **B — Architect** | `runArchitect(query) → BuildSpec` tool-loop (bounded, degrades gracefully) + design-reasoning system prompt. | ⬜ todo |
| **C — Builder** | `runBuilder(spec) → html` (render contract + spec) + validate/repair loop (absorbs old Phase 4). | ⬜ todo |
| **D — Live data** | `/api/live` proxy (CORS + key injection) + live-with-snapshot-fallback pattern. | ⬜ todo |
| **E — Cutover, frontend, docs** | Rewire `pipeline/index.ts` to Architect→Builder, retire `classify.ts`; real Planning→Researching→Building UI; docs sweep. | ⬜ todo |
| **5 — Persistence & sharing** | Opt-in shareable/persistent links; client-side search history; rebuild the apps Map + teardown timers from disk on restart. | ⬜ todo |
| **6 — Hardening** | Generation caching; rate limiting; structured errors in the UI; cost/latency instrumentation across the Architect + Builder calls. | ⬜ todo |

Per-task detail and dependencies live in `.agent/TASKS.md`.

### Immediate next steps
1. **Phase A** — build the tool registry + `Tool` interface, the Tavily / `wikipedia_summary` /
   `image_search` tools, and the **Build Spec** contract in `@zearch/shared` (§4a). This unblocks
   the Architect (B) and Builder (C).
2. Per the `.agent/PROMPTS.md` workflow, the next artifact is
   `.agent/implementations/implementation_PA.md` planning every Phase A task.
3. Then **Phase B** (Architect loop) → **Phase C** (Builder + repair) → **Phase D** (live) →
   **Phase E** (cutover). _Nothing implemented yet._

---

## 7. Risks / open items

1. **Hallucination** — the Architect's tool loop (Phase B) is the mitigation: real facts + sources
   before the Builder writes. `QUALITY_BAR` factual-discipline + the synthesized-content footer note
   remain backstops. Risk shifts to *tool quality* (#3) and the Architect trusting a bad source.
2. **Browser-Babel render fragility** — the exact CDN URLs/order and `window.Recharts` destructure
   are load-bearing. They live in **one** place (`archetypes/hard-requirements.ts`'s
   `HARD_REQUIREMENTS`); never duplicate them. The Builder's validate+repair loop (C2) is the net.
3. **Tool reliability & agentic cost** — the Architect depends on Tavily (rate limits, downtime,
   result quality); the `SearchProvider` seam (D13) makes it swappable and the loop degrades to an
   ungrounded spec on failure. Tool loops also raise **latency + per-query cost** (planning + N tool
   calls + generation) — a bounded loop + caching (Phase 6) keep it in check.
4. **Architect misroute / spec quality** — a wrong design decision gives a wrong-shaped page.
   Mitigations: a tight Build Spec schema, the archetype render contract constraining output, and
   the repair loop catching broken renders.
5. **Live-data plumbing** — client-side live fetch only works through `/api/live` (CORS + key
   hiding); the build-time snapshot is the fallback. APIs without a usable public endpoint degrade
   to snapshot-only. **Never put a live-API key in generated page JS.**
6. **Ephemeral state on restart** — the apps Map + teardown timers live in process memory and are
   not rebuilt from disk on restart (Phase 5 fixes; disk HTML survives).
7. **`PUBLIC_BASE` correctness** — `serviceUrl` is absolute; a wrong `PUBLIC_BASE` in prod breaks the
   iframe even though deploy "succeeds."
8. **Secrets** — `OPENAI_API_KEY` + `TAVILY_API_KEY` (+ any live-API keys) via `.env` only, never
   committed (`.env` is gitignored — keep it so).
