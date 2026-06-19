# STATE

> Living status snapshot. Read this to understand where ZEARCH is **today** in under 5 minutes.
> Not a roadmap (see `PLAN.md`) and not a design doc (see `docs/idea.md`). Update at the end of every meaningful session.

## Last Updated

- **Date:** 2026-06-19
- **Contributor:** XZNON (solo)
- **Session summary (2026-06-19, Phase E):** **Phase E — Cutover, frontend, docs: COMPLETE (E1–E3), not committed.**
  **E1** — `pipeline/index.ts` rewritten: `runGeneration()` now calls `runArchitect(prompt) → BuildSpec` then `runBuilder({ spec }) → html`; `generateAppHTML` re-exported for `/api/update`. `routes/generate.ts` updated to destructure `{ html, archetype, title }` directly (dropping `classification`). `pipeline/classify.ts` marked retired with a comment block.
  **E2** — `apps/frontend/src/types.ts`: `Stage` updated to `'idle' | 'planning' | 'researching' | 'building' | 'ready'`. `BuildingCard.tsx`: PHASES extended to 4 items (Planning/Researching/Building/Ready), grids updated to `grid-cols-4`. `useGeneration.ts`: `setStage('thinking')` → `setStage('planning')` with a 1.5s setTimeout to `'researching'` in `run()`; `applyUpdate()` uses `'planning'` only (Builder-only path skips 'researching').
  **E3** — Docs sweep: `CLAUDE.md`, `README.md`, `.agent/TASKS.md`, `.agent/STATE.md`, `PLAN.md`, `.agent/PLAN.md` updated to reflect the shipped Agentic Core pipeline. Groq TPM gotcha retired; Locus copy gotcha retired; pipeline description updated; LLM provider updated to OpenAI as default.
  **Verification:** `npm run typecheck` green across all workspaces. Branch `feature/agentic-core-phase-e`, **awaiting the user's commit**. **Next: Phase 5 — Persistence & sharing.**
- **Session summary (2026-06-19, Phase D):** **Phase D — Live Data: COMPLETE (D1–D2), not committed.**
  **D1** — New `apps/orchestrator/src/routes/live.ts`: CORS-bypass proxy route (`GET /live`, `OPTIONS /live`) with allowlist guard (SSRF), AbortController 15s timeout, lazy-eviction in-memory cache (`X-Cache: HIT/MISS`). Three new env vars in `config.ts` (`LIVE_PROXY_ALLOW_HOSTS`, `LIVE_PROXY_CACHE_TTL_S`, `LIVE_PROXY_API_KEY`). `server.ts` mounts `liveRouter` at `/api` before `appsRouter`.
  **D2** — `prompts/architect.ts`: replaced the sparse liveEndpoint/snapshot two-liner with a full expanded block covering when to use it, four named keyless APIs (Open-Meteo, Open-Notify, CoinGecko, exchangerate.host), the url/description/shape sub-fields, and the requirement to still populate facts[]. Added "Current weather in London" routing example. `pipeline/builder.ts`: `buildUserMessage` now builds a `liveBlock` (non-empty only when `spec.liveEndpoint` is defined) appended before the closing HTML instruction — contains the proxy fetch pattern, the React useState/useEffect template with status badge, and the build-time snapshot as a JSON literal. Correction message extended to preserve the live useEffect on retry. **Verification:** `npm run typecheck` green across all workspaces. Branch `feature/agentic-core-phase-d`, **awaiting the user's commit**. **Next: Phase E (cutover).**
- **Session summary (2026-06-19, Phase C):** **Phase C — Builder: COMPLETE (C1–C2), not committed.**
  Built the Builder in one new file (`apps/orchestrator/src/pipeline/builder.ts`), still ADDITIVE
  (nothing wired into the live pipeline; cutover is Phase E). **C1** — `runBuilder({ spec, provider? }) → Promise<string>`:
  `buildUserMessage(spec)` constructs the grounded-content user turn (numbered facts with inline
  source citations, images section omitted when empty, explicit note for empty-facts path, override
  phrase for grounded image URLs). `composeSystemPrompt(spec.archetype)` supplies the system prompt
  (CDN block byte-for-byte via `hard-requirements.ts` — not duplicated in builder.ts). **C2** —
  validate/repair loop embedded inside `runBuilder` (MAX_ATTEMPTS=3): `validateAppHTML` after each
  attempt; on failure, corrective feedback appended to the next user message with an explicit
  "preserve ALL grounded facts/images/design direction" directive (differs from generate.ts to prevent
  the model stripping content on retry); all-attempts failure returns `lastHtml` (never throws).
  **Verification:** `npm run typecheck` green; smoke test (Ada Lovelace, grounded): valid:true,
  title found, html length 17787; smoke test (empty facts): valid:true, title found, html length 21366.
  Branch `feature/agentic-core-phase-c`, **awaiting the user's commit**. **Next: Phase D (live data)
  or Phase E (cutover) — see TASKS.md.**
- **Session summary (2026-06-16, Phase B):** **Phase B — Architect: COMPLETE (B1–B2), not committed.**
  Built the tool-loop brain, still ADDITIVE (nothing wired into the live pipeline; cutover is Phase E).
  **B1** — `runArchitect(query) → BuildSpec` in `apps/orchestrator/src/pipeline/architect.ts`: an
  OpenAI function-calling loop (MAX_ITERATIONS=8, WALL_CLOCK_MS=90s) over `toOpenAIToolSchemas()`;
  ends deterministically when the model calls the terminal `emit_build_spec` tool, whose args are
  defensively parsed+normalized into a valid BuildSpec (archetype validated against the 7-slug Set,
  facts/images clamped, liveEndpoint only with url+description). NEVER throws — any failure (no key,
  HTTP error, timeout, no terminal call, bad JSON) degrades to `ungroundedSpec(query)`
  (archetype:'concept', facts:[], images:[]). Added a SIBLING `chatCompletionWithTools()` in
  `llm/client.ts` (new `ToolCall`/`LoopMessage`/`AssistantTurn` exports; does NOT throw on null
  content — the existing text-only `chatCompletion()` is untouched). New self-registering terminal
  tool `tools/emit-build-spec.ts` (+ its import in `tools/index.ts`); its JSON-Schema mirrors
  BuildSpec, `execute()` is an inert never-throws no-op (loop returns before calling it).
  **B2** — `prompts/architect.ts` (TOP-LEVEL, above the archetype taxonomy): `ARCHITECT_SYSTEM_PROMPT`
  (~7.5k chars) + `buildArchitectUserMessage(query)`. Slug enumeration derived from
  `Object.keys(ARCHETYPES)` (drift-safe); routing rules + 7 descriptions lifted verbatim from
  CLASSIFY_SYSTEM_PROMPT; covers archetype routing, research discipline (facts WITH sources, never
  fabricate, per-tool when/why), bounded research-then-emit, EVERY BuildSpec field, and the
  emit-exactly-once directive. Contains NO CDN/HTML/#root/window.Recharts text (Builder's boundary).
  **Verification:** full `npm run typecheck` green; Napoleon grounded run → archetype:'person', 9
  sourced facts, 4 Wikimedia images, liveEndpoint omitted, no throw; degraded run (key unset) →
  ungrounded 'concept' spec, exit 0. Branch `feature/agentic-core-phase-b`, **awaiting the user's
  commit**. **Next: Phase C — the Builder: `runBuilder(spec) → html` (render contract + spec) + the
  validate/repair loop.**
- **Session summary (2026-06-16, Phase A):** **Phase A — Tooling foundation: COMPLETE (A1–A5), not committed.**
  Built the inert tool layer the Architect will stand on, all additive (nothing wired into the live
  pipeline). **A1** — `apps/orchestrator/src/tools/` registry: `types.ts` (`Tool`/`ToolResult`/
  `OpenAIToolSchema`, never-throws `execute()` contract), `registry.ts` (name-keyed Map mirroring
  `llm/providers.ts`: `registerTool`/`getTool`/`listTools`/`toOpenAIToolSchemas`), `index.ts`
  self-registration barrel. **A2** — `web_search` via Tavily behind a `SearchProvider` seam
  (`tools/search/{types,tavily}.ts` + `tools/web-search.ts`); `TAVILY_API_KEY` added to `config.ts`
  and repo-root `.env`. **A3** — `wikipedia_summary` (`tools/wikipedia.ts`, keyless REST summary,
  404→ok:false). **A4** — `image_search` (`tools/images.ts`, Wikimedia Commons, license-safe).
  **A5** — `BuildSpec` contract added to `packages/shared/index.ts` (`ArchetypeSlug` matches
  `ARCHETYPES` exactly; `BuildSpecFact`/`BuildSpecImage`/`LiveEndpoint`/`BuildSpec`). Every tool's
  `execute()` verified never-throws (live + failure paths); full cross-workspace `npm run typecheck`
  green. Branch `feature/agentic-core-phase-a`, **awaiting the user's commit**. **Next: Phase B —
  the Architect tool-loop that consumes this registry and emits a BuildSpec.**
- **Prior session summary (2026-06-11):** **Re-architecture planned (no code).** Pivoted the pipeline plan
  from static `classify→ground→generate` to an **Agentic Core: Architect → Builder** — a tool-using
  LLM (Architect) plans + researches the page via a tool loop and emits a **Build Spec**; the Builder
  turns that into `index.html` with a validate/repair loop. Decisions: **OpenAI for all calls**
  (Groq/TPM dropped), **Tavily** for search+extract behind a pluggable tool registry, **live data**
  via generated pages fetching through an orchestrator `/api/live` proxy with a build-time snapshot
  fallback. New phases **A–E** replace the old Grounding/render phases; old Phase 2 classify/cutover
  wiring is superseded (archetype templates survive as the Builder's render contract). Captured in
  `PLAN.md` (D12–D15, §3), `.agent/PLAN.md` (§3, §4a), `.agent/TASKS.md` (Phases A–E). **Nothing
  implemented.**
- **Prior session summary:** **Phase 2 complete.** Wired the prebuilt archetype system into the live pipeline. P2-4 (cheap/strong model tiers threaded through `llm/providers.ts` + `client.ts`, default `strong` so generation is byte-for-byte unchanged), P2-1 (new `pipeline/classify.ts` — `classifyQuery()` calls the cheap tier, parses/validates JSON, never throws, falls back to `concept`/conf 0), P2-3 (`pipeline/index.ts` is now the `runGeneration()` orchestrator: classify → `composeSystemPrompt(archetype)` above a 0.4 confidence floor, else flat-`SYSTEM_PROMPT` cutover; `/api/generate` uses it, `/api/update` stays flat). Work on branch `feature/phase-2-archetype-routing`, **not committed**. All LLM calls now use **OpenAI** per the user's standing instruction.

## Current Phase

- **Milestone:** **Agentic Core re-architecture — Phase E (Cutover, frontend, docs) ✅ COMPLETE. All phases A–E shipped.**
- **Overall progress:** Phase 0 ✅ · Phase R ✅ · Phase 1 ✅ · Phase 2 ✅ (wiring superseded) · Phase A ✅ · Phase B ✅ · Phase C ✅ · Phase D ✅ · **Phase E ✅**
- **Status:** The live pipeline is **Architect → Builder**. `pipeline/index.ts` (`runGeneration`) calls `runArchitect(query) → BuildSpec`, then `runBuilder(spec) → html`. `classify.ts` and the confidence cutover are retired. `/api/update` uses `generateAppHTML` (Builder-only flat path). `/api/live` proxy is live. Frontend shows Planning → Researching → Building → Ready. **Next: Phase 5 — Persistence & sharing.**

## Completed

- **Phase A — Tooling foundation** — tool registry under `apps/orchestrator/src/tools/`; `web_search` (Tavily), `wikipedia_summary`, `image_search`, `emit-build-spec`; `BuildSpec`/`BuildSpecFact`/`BuildSpecImage`/`LiveEndpoint`/`ArchetypeSlug` added to `@zearch/shared`.
- **Phase B — Architect** — `pipeline/architect.ts`: `runArchitect(query) → BuildSpec` OpenAI function-calling loop (MAX_ITERATIONS=8, 90s, degrades to `ungroundedSpec`); `chatCompletionWithTools()` in `llm/client.ts`; `ARCHITECT_SYSTEM_PROMPT` in `prompts/architect.ts`.
- **Phase C — Builder** — `pipeline/builder.ts`: `runBuilder({ spec }) → html`; `buildUserMessage(spec)` with grounded facts/images; validate/repair loop (MAX_ATTEMPTS=3); never throws.
- **Phase D — Live data** — `routes/live.ts`: `/api/live` CORS-bypass proxy with SSRF allowlist, 15s timeout, lazy-eviction cache, `X-Cache` header; `config.ts` gains three new env vars; Architect prompt expanded with live-endpoint guidance; Builder generates a `liveBlock` with proxy fetch + snapshot fallback.
- **Phase E — Cutover, frontend, docs** — `pipeline/index.ts` rewired to Architect→Builder; `classify.ts` retired; frontend stage labels → Planning/Researching/Building/Ready; docs sweep.
- **Phase 0 — Planning.** `docs/idea.md` (source of truth) and `PLAN.md` (build plan) written; work board seeded in `.agent/TASKS.md`.
- **Phase R — Monorepo restructure** *(merged, PR #1)*. npm workspaces monorepo: `apps/orchestrator`, `apps/frontend`, `packages/shared` (`@zearch/shared` API contract). Source re-laid into the screaming-architecture layout (`routes/`, `pipeline/`, `llm/`, `prompts/`, `store/`, `lib/`). One hoisted `node_modules`; `npm run typecheck` green across all three workspaces.
- **Phase 1 frontend editorial redesign** *(merged, PR #2)* — tasks P1-2, P1-3, P1-4, P1-7, P1-8, P1-9, P1-10, P1-11:
  - Stripped all stale Locus/Claude copy from Header, Footer, AppViewer, `useGeneration.ts`.
  - Topical EXAMPLES (Napoleon, black holes, Kyoto, React vs Vue) replacing financial queries.
  - Search-not-calculator landing copy; new `ArchetypeShowcase` (7 archetype cards) and `HowItWorks` components.
  - BuildingCard collapsed to 3 honest stages (Thinking → Building → Ready).
  - Dark/light theme toggle with `localStorage` persistence.
  - AppViewer: teardown countdown, debug row removed, topical update placeholder.
- **Phase 1 backend + docs** *(branch `feature/phase-1-finish`, not committed)* — tasks P1-1, P1-5, P1-6:
  - **P1-1** — `SYSTEM_PROMPT` in `apps/orchestrator/src/prompts/shared.ts` rewritten from financial-calculator to a generic informational-page generator (editorial design; hero/timeline/sections/fact-cards/gallery building blocks; charts only when data warrants). The load-bearing CDN block + `window.Recharts` destructure were preserved byte-for-byte.
  - **P1-5** — `README.md` rewritten to the informational-search product: Groq + native orchestrator hosting, monorepo `npm` scripts, `tsx`; all Locus / Anthropic / `backend/` / `node index.js` references removed.
  - **P1-6** — Napoleon end-to-end test **PASSED**: generate → deploy → status `healthy` → served page byte-identical → teardown (404). Structure/CDN/content checks all green.

## In Progress

- No active in-progress branches. All Phase A–E work is complete.
- **Owner:** XZNON (solo project).
- **Open PRs:** none.

## Next

Phase E is complete. The Agentic Core (Phases A–E) is fully shipped.

**Phase 5 — Persistence & sharing:**
1. **P5-1** — Opt-in persistent/shareable link ("keep this page", extend TTL).
2. **P5-2** — Client-side search history (localStorage recents strip).
3. **P5-3** — Rebuild `apps` Map + teardown timers from disk on orchestrator restart.

## Blockers

- **No blocking issues.** All Agentic Core phases are complete.
- **`.env` gotcha (still applies):** key lines must be `KEY="val"` with **no spaces around `=`** — Node's `--env-file` parser silently ignores `KEY = "val"`.
- **Env dependency:** end-to-end generation needs `OPENAI_API_KEY` and `TAVILY_API_KEY` in repo-root `.env`. Without `OPENAI_API_KEY`, Architect/Builder calls fail. Without `TAVILY_API_KEY`, `web_search` silently fails and the Architect degrades to an ungrounded spec.

## Important Notes

- **Git: the user commits everything personally. Never run `git commit`/`git push`.** Stage changes, confirm `npm run typecheck` is green, and stop.
- **Use the OpenAI provider for ALL LLM calls** (generation + classification + manual checks) per the user's standing instruction. `LLM_PROVIDER=openai` in repo-root `.env`; don't switch to Groq even for quick tests. (The earlier "OpenAI out of quota" blocker no longer holds — live calls succeed.)
- **The CDN block in `prompts/shared.ts` is load-bearing.** Exact script URLs, their order (React 18 UMD, Recharts 2.15.4, Babel standalone, Tailwind CDN), and the `window.Recharts` destructure must be preserved byte-for-byte through any prompt rewrite — generated apps are babel-in-browser and break otherwise.
- **Groq TPM cap no longer applies** (D15): OpenAI is the active provider. Groq remains a `LLM_PROVIDER=groq` option but is not the recommended path.
- **State is in-process.** The `apps` Map and teardown timers are NOT rebuilt from disk on restart (HTML is mirrored to `APPS_DIR`, but live status/pending teardowns are lost on restart). Deferred to P5-3.
- **`PUBLIC_BASE` correctness matters.** `serviceUrl` is built from it and iframed directly; a wrong value (e.g. localhost in prod) breaks app display even when deploy "succeeds."
- **Gitignored local-only docs:** `CLAUDE.md`, `PLAN.md`, `.agent/`, `docs/` are gitignored — changes there don't ship. (STATE.md lives at repo root; decide intentionally whether to track it.)
- **No tests.** Type-checking (`npm run typecheck`) is the only static check.
- **Type-checking is the done-gate.** Must be green before any task is declared done.

## Quick Resume Guide

A new contributor starting today should:

1. **Read first:** `CLAUDE.md` (architecture + gotchas), this `STATE.md`, `.agent/TASKS.md` (work board), `docs/idea.md` (vision). For the next task, also `apps/orchestrator/src/prompts/shared.ts`.
2. **Branches:** uncommitted Phase 1 work is on `feature/phase-1-finish` (commit + merge it first). The Phase R and earlier Phase 1 frontend branches are already merged.
3. **Set up:** root `.env` with `OPENAI_API_KEY` and `TAVILY_API_KEY`, then `npm install` → `npm run dev`. Verify with `npm run typecheck`.
4. **Continue with:** **Phase 5 — Persistence & sharing** (P5-1 through P5-3). The Agentic Core (Phases A–E) is fully shipped.
