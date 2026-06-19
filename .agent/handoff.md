# Session Handoff
_Generated: 2026-06-16 (Phase B)_

## Goal
Implement **Phase PB (Agentic Core — Architect)** of ZEARCH per
`.agent/implementations/implementation_PB.md`: build `runArchitect(query) → BuildSpec`, a
tool-using OpenAI function-calling loop over the Phase-A tool registry that researches a query and
emits a structured `BuildSpec` (the Architect↔Builder handoff). Two tasks: **B1** (the loop
machinery + terminal `emit_build_spec` tool) and **B2** (the Architect design-reasoning system
prompt). Hard constraints: phase is **strictly additive** (do NOT wire into the live pipeline —
cutover is Phase E); `runArchitect` must **never throw** (degrade to an ungrounded spec); OpenAI is
the provider for all real calls; **do not commit** (the user commits everything personally).

## Current State
**Phase PB is COMPLETE (B1 + B2), typecheck green, NOT committed.** On branch
`feature/agentic-core-phase-b` (created off `main`).

- `npm run typecheck` green across all three workspaces (`@zearch/frontend`, `@zearch/orchestrator`, `@zearch/shared`).
- **B1 done & verified:** Napoleon grounded run → `archetype:'person'`, sourced facts, Wikimedia
  images, no throw. Degraded run (key unset) → ungrounded `concept` spec, exit 0, no throw.
- **B2 done & verified:** static checks (prompt non-empty ~7.5k chars; all 7 slugs present & derived
  from `Object.keys(ARCHETYPES)`; no render-contract tokens; user msg embeds query) all pass; the
  real-prompt Napoleon run → `archetype:'person'`, 9 facts (all sourced), 4 images, `liveEndpoint`
  omitted, no throw.
- Both tasks marked `done` in `.agent/TASKS.md`; `.agent/STATE.md` updated (Phase B ✅, Phase C next).
- The live pipeline is UNCHANGED — `/api/generate` still runs the Phase-2 classify→compose path;
  `chatCompletion()`, `pipeline/index.ts`, `generate.ts`, `classify.ts`, `routes/*` all untouched.

## Files Being Edited
All on branch `feature/agentic-core-phase-b`, all additive. `git status --short`:
```
 M apps/orchestrator/src/llm/client.ts
 M apps/orchestrator/src/tools/index.ts
?? apps/orchestrator/src/pipeline/architect.ts
?? apps/orchestrator/src/prompts/architect.ts
?? apps/orchestrator/src/tools/emit-build-spec.ts
```
- `apps/orchestrator/src/llm/client.ts` (M) — added SIBLING `chatCompletionWithTools()` + exported
  `ToolCall` / `LoopMessage` / `AssistantTurn` interfaces. POSTs body + `tools` + `tool_choice`;
  does NOT throw on null content (tool-call turns legitimately have `content:null`). The original
  text-only `chatCompletion()` is UNTOUCHED (it still throws on empty content — correct for HTML gen).
- `apps/orchestrator/src/tools/emit-build-spec.ts` (new) — terminal `emit_build_spec` tool;
  JSON-Schema `parameters` mirror `BuildSpec` (archetype enum of 7 slugs, facts/images arrays,
  optional liveEndpoint/snapshot). `execute()` is an inert never-throws no-op returning
  `{ok:true, content:'spec received'}` — the loop returns on detecting the call by NAME before
  executing it. Self-registers via `registerTool`.
- `apps/orchestrator/src/tools/index.ts` (M) — added `import './emit-build-spec.js';`.
- `apps/orchestrator/src/pipeline/architect.ts` (new) — `runArchitect(query, opts?)`: bounded loop
  (MAX_ITERATIONS=8, WALL_CLOCK_MS=90_000). Per turn calls `chatCompletionWithTools({messages,
  tools: toOpenAIToolSchemas(), tier:'strong'})`; on `emit_build_spec` → `specFromEmitArgs` returns
  the BuildSpec (grounded); on no tool_calls → break/degrade; else append the assistant turn + one
  role:'tool' message per call (matching tool_call_id). Helpers: `runToolCall` (never-throws —
  unknown tool / bad-JSON args → clear string), `specFromEmitArgs` + `parseEmitJSON` (fence-strip +
  outermost-{…}-slice, defensive normalize/clamp, archetype validated against a 7-slug Set),
  `normalizeFacts`/`normalizeImages`/`normalizeLiveEndpoint`, `ungroundedSpec` (archetype:'concept',
  facts:[], images:[]). Whole loop wrapped in try/catch → `ungroundedSpec`.
- `apps/orchestrator/src/prompts/architect.ts` (new) — the B2 deliverable. `ARCHITECT_SYSTEM_PROMPT`
  + `buildArchitectUserMessage(query)`. Slug enumeration derived from `Object.keys(ARCHETYPES)`
  (drift-safe); routing rules + 7 descriptions lifted VERBATIM from `CLASSIFY_SYSTEM_PROMPT`; covers
  archetype routing, research discipline (facts WITH sources, never fabricate, per-tool when/why),
  bounded research-then-emit, EVERY BuildSpec field, emit-exactly-once directive. Contains NO
  CDN/HTML/#root/window.Recharts text. (B1 first wrote a minimal STUB here so it compiled; B2
  replaced it with the full prompt — file path/exports unchanged.)
- `.agent/TASKS.md` (M, gitignored) — B1, B2 → `done`.
- `.agent/STATE.md` (M, gitignored) — Phase B session summary + Current Phase block (Phase C next).

## What We Tried That Failed
Nothing failed — the phase went cleanly on the first attempt. Things handled correctly (do NOT
"fix" or undo): the B1⇄B2 ordering seam (B1 wrote a stub `prompts/architect.ts` that B2 replaced);
`chatCompletionWithTools` is a SIBLING, never a change to `chatCompletion()`; degraded path verified
by unsetting the key, not by editing code.

## Next Step
**Start Phase C — the Builder** (after the user commits Phase B). Tasks in `.agent/TASKS.md` Phase C:
- **C1** — `runBuilder(spec) → html`: compose the render contract
  (`apps/orchestrator/src/prompts/archetypes/hard-requirements.ts` `HARD_REQUIREMENTS`, byte-for-byte)
  + the BuildSpec into ONE strong generation call (`chatCompletion`, tier:'strong'); `extractHTML`
  as today.
- **C2** — validate + repair loop: check `#root` / required CDNs / parseable, auto-retry on failure
  so broken pages never reach the iframe (absorbs old P4-2/P4-3).
Per the `.agent/PROMPTS.md` workflow, first produce `.agent/implementations/implementation_PC.md`
(the implementation_PB.md plan is the model). Phase C consumes the `BuildSpec` from `@zearch/shared`
that Phase B now produces.

## Additional Context
- **Never commit / push** — the user commits everything personally. Stage + typecheck-green + stop.
- **OpenAI for ALL LLM calls** (user's standing instruction; `LLM_PROVIDER=openai` in repo-root
  `.env`). Repo-root `.env` (gitignored) has `OPENAI_API_KEY`, `TAVILY_API_KEY`, `LLM_PROVIDER`,
  `OPENAI_CLASSIFY_MODEL`, `OPENAI_CLASSIFY_MAX_TOKENS` — all present and funded (live runs succeed).
- **`.env` parser gotcha:** `KEY="val"` with NO spaces around `=` (Node `--env-file` drops `KEY = "val"`).
- **Smoke-test commands** (PowerShell, from repo root):
  - typecheck: `npm run typecheck`
  - grounded run: `npx tsx --env-file=.env -e "import('./apps/orchestrator/src/pipeline/architect.js').then(m=>m.runArchitect('Napoleon Bonaparte')).then(s=>{console.log(JSON.stringify(s,null,2));process.exit(0)}).catch(e=>{console.error('THREW:',e);process.exit(1)})"`
  - degraded run: prefix `$env:LLM_PROVIDER='openai'; $env:OPENAI_API_KEY=''; $env:GROQ_API_KEY='';`
    then run the same `npx tsx -e ...` WITHOUT `--env-file`.
- **Phase E (later) is where cutover happens:** rewire `pipeline/index.ts` `runGeneration` to
  Architect → Builder and retire `classify.ts` + the 0.4-confidence floor. NOT now — keep additive.
- **The CDN block in `hard-requirements.ts` / `prompts/shared.ts` is load-bearing** — exact URLs,
  order, and `window.Recharts` destructure must be preserved byte-for-byte; the Builder (C1) composes
  it, the Architect never touches HTML.
- Cross-package contract: `ArchetypeSlug` (`@zearch/shared`) == `ARCHETYPES` keys
  (`prompts/archetypes/index.ts`) == `person|event|place|concept|comparison|data|tool`, byte-for-byte.
- Default strong model comes from `OPENAI_MODEL` (providers.ts default `gpt-5.4-mini`); `.env` does
  not override it. Tool-calling works fine on it (verified by the Napoleon runs).
- **Plan source of truth:** `.agent/implementations/implementation_PB.md` (Phase B, full plan),
  `.agent/TASKS.md` (work board), `.agent/STATE.md` (status), `PLAN.md` §3 / D12–D15, `.agent/PLAN.md` §3/§4a.
