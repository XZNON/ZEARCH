# ZEARCH — Work Board

> Solo backlog. Derived from `.agent/PLAN.md` + root `PLAN.md` (phases) and `docs/idea.md` (vision).
> Format: `id · title · area · status · deps`. **Status:** `todo` → `in-progress` → `done`.
> **Areas:** `monorepo` · `generator` · `frontend` · `orchestrator` · `tools` · `grounding` · `docs`.
> Keep one task `in-progress` at a time. Add `todo`s freely; move finished tasks to the Done log.
> **Phase R must finish before any feature phase** — it moves files, so all later path refs assume
> the post-R layout (`apps/orchestrator/src/…`, `apps/frontend/src/…`).

---

## Phase 0 — Planning _(done)_

| id   | title                                  | area | status | deps |
| ---- | -------------------------------------- | ---- | ------ | ---- |
| P0-1 | Write `docs/idea.md` (source of truth) | docs | done   | —    |
| P0-2 | Write `PLAN.md` (build plan v1)        | docs | done   | —    |
| P0-3 | Seed this work board                   | docs | done   | —    |

## Phase R — Restructure & Monorepo _(done)_

| id  | title                                                                                                                                                                                                                                                                   | area         | status | deps          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ | ------------- |
| R-1 | Add root `package.json` (`private: true`, `workspaces: ["apps/*", "packages/*"]`, name `zearch`) + root scripts that fan out (`dev`, `build`, `typecheck`). No Turborepo                                                                                                | monorepo     | done   | —             |
| R-2 | Move `orchestrator/` → `apps/orchestrator/` and `frontend/` → `apps/frontend/`; fix the env-load path (`../.env` → `../../.env`) and any other relative paths                                                                                                           | monorepo     | done   | R-1           |
| R-3 | Create `packages/shared` (`@zearch/shared`: package.json + tsconfig) and move the API-contract types out of `orchestrator/types.ts` into it (`DeployResult`, `AppEntry`, `DeploymentStatus`, generate/update response shapes)                                           | monorepo     | done   | R-1           |
| R-4 | Add `@zearch/shared` as a dep of both apps; replace the duplicated/local contract types in orchestrator + frontend with imports from it                                                                                                                                 | monorepo     | done   | R-3, R-2      |
| R-5 | Re-lay `apps/orchestrator/src/` per §5: `config.ts`, `routes/`, `pipeline/generate.ts` (+`index.ts`), `llm/client.ts`, `prompts/shared.ts` (current single prompt, no archetype split yet), `store/{appStore,lifecycle}.ts`, `lib/{html,logger}.ts`. Behavior identical | orchestrator | done   | R-2           |
| R-6 | Split `apps/frontend/src/App.tsx` into `components/*`, `hooks/useGeneration.ts`, `api/client.ts`, `types.ts`; `App.tsx` becomes thin wiring                                                                                                                             | frontend     | done   | R-2           |
| R-7 | Update path references in `CLAUDE.md`, `README.md`, `.gitignore` (new `node_modules`/`apps/*/apps` locations) to the post-R layout                                                                                                                                      | docs         | done   | R-2           |
| R-8 | Verify: clean root `npm install`, `npm run dev`, `npm run typecheck` pass; manual generate→deploy→iframe smoke test still works                                                                                                                                         | monorepo     | done   | R-4, R-5, R-6 |

## Phase 1 — Reframe to informational search _(next)_

| id    | title                                                                                                                                                                                                                                                            | area      | status | deps       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ---------- |
| P1-1  | Rewrite the `SYSTEM_PROMPT` in `apps/orchestrator/src/prompts/shared.ts`: financial-calculator → generic informational page (hero, timeline, sections, fact cards, gallery). Keep the load-bearing CDN URLs/order + `window.Recharts` destructure block verbatim | generator | done   | R-8        |
| P1-2  | Swap financial `EXAMPLES` (now in `apps/frontend/src/`) for topical queries (e.g. "Napoleon Bonaparte", "How black holes work", "Kyoto", "React vs Vue")                                                                                                         | frontend  | done   | R-8        |
| P1-3  | Strip stale **Locus** copy from the frontend components: Header "powered by Locus Build", Footer text, `statusNote`/stage labels ("Pushing to Locus", "Building container"), AppViewer debug row (`projectId`/`serviceId`), SkeletonBuild container copy         | frontend  | done   | R-8        |
| P1-4  | Update Hero/landing copy to the search-not-calculator framing; fix PromptBox + AppViewer update placeholders                                                                                                                                                     | frontend  | done   | P1-3       |
| P1-5  | Fix stale README "Getting Started" (no `backend/`/`node index.js`/Locus keys → monorepo `npm` scripts, `tsx`, Groq)                                                                                                                                              | docs      | done   | R-7        |
| P1-6  | Manual **Napoleon test**: run end-to-end, confirm a real informational page renders in the iframe                                                                                                                                                                | generator | done   | P1-1, P1-2 |
| P1-7  | Collapse `BuildingCard` to 3 honest stages: **Thinking → Building → Ready** (drop fake container-ops stages: packaging/pushing/build/deploying)                                                                                                                  | frontend  | done   | P1-3       |
| P1-8  | New `ArchetypeShowcase` component — 7 archetype cards (person, event, place, concept, comparison, data, tool) with example query + shape description; clicking pre-fills the search bar                                                                          | frontend  | done   | P1-4       |
| P1-9  | New `HowItWorks` component — 3-step explainer: Type a query → ZEARCH builds a live page → Explore and refine                                                                                                                                                     | frontend  | done   | P1-4       |
| P1-10 | Dark/light mode toggle in Header + CSS custom properties for both themes; persisted to `localStorage`; warm off-white light (`#faf9f7`) + deep neutral dark (`#111`)                                                                                             | frontend  | done   | P1-3       |
| P1-11 | AppViewer: remove Locus debug row, add teardown countdown, fix update input placeholder to topical examples                                                                                                                                                      | frontend  | done   | P1-3       |

## Phase 2 — Archetype routing

| id   | title                                                                                                                                  | area      | status | deps |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ---- |
| P2-1 | Stage A classifier: query → `{ archetype, subject, hints }` via cheap LLM call (or heuristic). _Prompt + `ClassifyResult` built in `prompts/archetypes/classify.ts`; LLM-call wiring done in `pipeline/classify.ts` (`classifyQuery`, never throws, falls back to 'concept')._ | generator | done | P1-1 |
| P2-2 | Per-archetype prompt templates, each reusing the shared block. **Built** in `prompts/archetypes/` — 3 families (reference/comparison/interactive) back the 7 archetypes via `composeSystemPrompt()`; shared render contract in `hard-requirements.ts`. Not yet imported by the pipeline. | generator | done   | P2-1 |
| P2-3 | Wire `pipeline/index.ts` to Stage A classify + `composeSystemPrompt(archetype)`, replacing the single `SYSTEM_PROMPT` (keep it as cutover fallback). _Done: `runGeneration()` orchestrates classify→compose→generate with a 0.4 confidence-floor cutover; `/api/generate` uses it; `/api/update` stays on flat path._ | generator | done   | P2-2 |
| P2-4 | Add cheap/strong model tiers (cheap for classify, strong for generate)                                                                 | generator | done   | P2-1 |

> **⚠ Superseded by the Agentic Core re-architecture (Phases A–E below).** The static
> `classify → ground(Wikipedia) → generate` pipeline is replaced by an **Architect → Builder**
> agentic build pipeline (see `PLAN.md` §3 / D12–D15). The standalone `pipeline/classify.ts` and
> the 0.4-confidence cutover in `pipeline/index.ts` are **retired** in **E1**; the archetype
> templates + `hard-requirements.ts` **survive** as the Builder's render contract. The old
> **Phase 3 (Grounding)** and **Phase 4 (render reliability)** are folded into the new phases:
> grounding → the Architect's tool loop (Phase B), render reliability → the Builder repair loop (C2).

## Phase A — Tooling foundation

> The pluggable tool layer the Architect calls, plus the Architect↔Builder contract.

| id   | title                                                                                                                                                          | area      | status | deps           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ | -------------- |
| A1   | Tool registry + `Tool` interface (`{ name, description, parameters (JSON schema), execute() }`); self-registration + dynamic OpenAI function-call exposure     | tools     | done   | —              |
| A2   | Tavily tool (search **+** content extraction) behind a `SearchProvider` seam; `TAVILY_API_KEY` env, swappable provider                                         | tools     | done   | A1             |
| A3   | `wikipedia_summary` tool — Wikipedia REST summary + key facts                                                                                                  | tools     | done   | A1             |
| A4   | `image_search` tool — Wikimedia/Commons image URLs (license-safe)                                                                                              | tools     | done   | A1             |
| A5   | **Build Spec** contract in `@zearch/shared`: `{ intent/archetype, designDirection, presentation, facts[] (+sources), images[], liveEndpoint?, snapshot? }`     | generator | done   | —              |

## Phase B — Architect (the tool-loop brain)

| id   | title                                                                                                                                              | area      | status | deps          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ | ------------- |
| B1   | `runArchitect(query) → BuildSpec`: OpenAI function-calling loop over the registry; loop control = max iterations, timeout, graceful degradation to an ungrounded spec | generator | done   | A1, A5        |
| B2   | Architect system prompt — the design-reasoning brain: decide app type/layout/presentation, what data is needed, which tools to call, emit Build Spec | generator | done   | B1            |

## Phase C — Builder (Build Spec → HTML)

| id   | title                                                                                                                                       | area      | status | deps   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ------ |
| C1   | `runBuilder(spec) → html`: compose render contract (`hard-requirements.ts`, CDN block byte-for-byte) + Build Spec; single strong generation call | generator | todo   | A5     |
| C2   | Validate + repair loop — check `#root`/required CDNs/parseable, auto-retry on failure so broken pages never reach the iframe (absorbs old P4-2/P4-3) | generator | todo   | C1     |

## Phase D — Live data

| id   | title                                                                                                                                  | area         | status | deps         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------ | ------------ |
| D1   | `/api/live` proxy on the orchestrator — CORS bypass + server-side key injection + cache hook, so generated pages can fetch live APIs   | orchestrator | todo   | —            |
| D2   | Live-with-snapshot pattern: Architect emits a live-endpoint spec **+** a build-time snapshot; Builder writes the page to fetch live through `/api/live` and fall back to the snapshot on failure | generator    | todo   | D1, B1, C1   |

## Phase E — Cutover, frontend, docs

| id   | title                                                                                                                                  | area      | status | deps     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ | -------- |
| E1   | Rewire `pipeline/index.ts` + routes: `runGeneration` = Architect → Builder; retire `classify.ts` + the confidence cutover. `/api/update` stays a Builder-only re-gen (prev HTML + instruction, no new tool loop) | generator | todo   | B1, C2   |
| E2   | Frontend real build feed (Planning → Researching → Building); optional streaming of the Architect's tool calls                         | frontend  | todo   | E1       |
| E3   | Docs sweep — `CLAUDE.md`, `PLAN.md`, `.agent/PLAN.md`, `STATE.md`, `README.md` reflect the shipped agentic core                        | docs      | todo   | E1       |

## Phase 5 — Persistence & sharing

| id   | title                                                                  | area         | status | deps |
| ---- | ---------------------------------------------------------------------- | ------------ | ------ | ---- |
| P5-1 | Opt-in persistent / shareable link ("keep this page", extend TTL)      | orchestrator | todo   | —    |
| P5-2 | Client-side search history (localStorage recents strip)                | frontend     | todo   | —    |
| P5-3 | Rebuild `apps` Map + teardown timers from disk on orchestrator restart | orchestrator | todo   | —    |

## Phase 6 — Hardening

| id   | title                                                                    | area         | status | deps |
| ---- | ------------------------------------------------------------------------ | ------------ | ------ | ---- |
| P6-1 | Cache generations for repeat/identical queries                           | orchestrator | todo   | —    |
| P6-2 | Rate limiting on `/api/generate` and `/api/update`                       | orchestrator | todo   | —    |
| P6-3 | Surface structured generation errors in the UI (replace silent failures) | frontend     | todo   | P4-2 |
| P6-4 | Instrument cost/latency per request across the two model tiers           | orchestrator | todo   | P2-4 |

---

## Done log

- _(Phase 0 planning artifacts — see table above.)_
