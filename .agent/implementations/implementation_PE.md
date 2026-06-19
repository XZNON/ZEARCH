# Session prompt — ZEARCH · Phase E (Cutover, frontend, docs)

> One self-contained, copy-paste prompt covering the WHOLE phase.
> Phase: **Phase E** in `.agent/TASKS.md`. Tasks: E1, E2, E3. Generated: 2026-06-19.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working through ALL of Phase E:
Cutover, frontend, docs. The phase has these tasks, to be done in this order:
  E1 — Rewire pipeline/index.ts + routes to Architect→Builder; retire classify.ts
  E2 — Frontend stage labels: Planning → Researching → Building → Ready
  E3 — Docs sweep (CLAUDE.md, PLAN.md, .agent/PLAN.md, STATE.md, TASKS.md, README.md)

Work ONE task at a time, in order. Check in at the checkpoints. Follow every rule below.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=6 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/TASKS.md, docs/idea.md, .agent/STATE.md
Run:  npm run typecheck   ← must be green before any code change
Tell me: the task list for this phase, which is first, and your plan for it.
Do NOT write code until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- npm run typecheck must be green before you declare ANY task done.
- Create one feature branch for the phase before changes:
    git checkout -b feature/agentic-core-phase-e
- Do ONE task at a time, in dependency order. Finish + verify a task before starting the next.
- After finishing each task: mark it done in .agent/TASKS.md and pause for my review before
  starting the next task.
- The CDN block in apps/orchestrator/src/prompts/shared.ts is load-bearing:
  exact script URLs/order (React 18 UMD, Recharts 2.15.4, Babel standalone, Tailwind CDN)
  and the window.Recharts destructure must be preserved byte-for-byte. Do NOT touch that file.

────────────────────────────────────────────────────────
PER-TASK PLAN
────────────────────────────────────────────────────────

### E1 — Rewire pipeline/index.ts + routes; retire classify.ts

**SCOPE:**

**File 1: `apps/orchestrator/src/pipeline/index.ts` — REWRITE**

Replace the entire file with the following (the old classify→compose→generate path is gone;
generateAppHTML is re-exported so /api/update can still import it):

```ts
// The generation pipeline (query → interactive page).
// Phase E cutover: runArchitect(query) → BuildSpec → runBuilder(spec) → html.
// The old classify→compose→generate path is retired.

import { runArchitect } from './architect.js';
import { runBuilder } from './builder.js';
import type { BuildSpec, ArchetypeSlug } from '@zearch/shared';
import { createLogger } from '../lib/logger.js';

export { generateAppHTML } from './generate.js'; // kept: /api/update still calls it

const log = createLogger('pipeline');

export interface GenerateResult {
  html: string;
  archetype: ArchetypeSlug;
  title: string;
  grounded: boolean; // true when spec.facts.length > 0
}

export async function runGeneration(
  { prompt, provider }: { prompt: string; provider?: string },
): Promise<GenerateResult> {
  const spec: BuildSpec = await runArchitect(prompt, { provider });
  log(`archetype=${spec.archetype} grounded=${spec.facts.length > 0} title="${spec.title}"`);
  const html = await runBuilder({ spec, provider });
  return {
    html,
    archetype: spec.archetype,
    title: spec.title,
    grounded: spec.facts.length > 0,
  };
}
```

**File 2: `apps/orchestrator/src/routes/generate.ts` — SMALL EDIT**

The `/api/generate` handler currently destructures `{ html, classification }` from `runGeneration`.
After the rewrite, `GenerateResult` no longer has `classification`; it has `archetype` and `title`
directly. Update only the two lines that reference `classification`:

Old (in the POST /api/generate handler):
```ts
const { html, classification } = await runGeneration({ prompt });
res.json({
  html,
  sizeBytes: Buffer.byteLength(html, 'utf8'),
  archetype: classification?.archetype ?? null,
  title: classification?.title ?? null,
});
```

New:
```ts
const { html, archetype, title } = await runGeneration({ prompt });
res.json({
  html,
  sizeBytes: Buffer.byteLength(html, 'utf8'),
  archetype,
  title,
});
```

The `/api/update` handler calls `generateAppHTML` directly — do NOT change it.

**File 3: `apps/orchestrator/src/pipeline/classify.ts` — ADD DEPRECATION COMMENT**

Add this block at the very top of the file (before any imports):
```ts
// RETIRED in Phase E. classifyQuery is no longer called by the pipeline.
// pipeline/index.ts now routes through runArchitect → runBuilder.
// This file is kept for reference. Safe to delete once Phase E is confirmed stable.
```

Do NOT delete the file — it is safe to delete later but not during the session.

**ACCEPTANCE:**
1. `npm run typecheck` exits 0 across all workspaces.
2. No remaining references to `classification` in `routes/generate.ts`.
3. `pipeline/index.ts` imports only `runArchitect`, `runBuilder`, `@zearch/shared`, `logger`.
4. Runtime smoke test (optional, if keys are available): POST `/api/generate` with
   `{"prompt": "Albert Einstein"}` → response contains `archetype: "person"`, `title` string,
   `html` with non-zero length, `sizeBytes`.
5. `/api/update` still works (no change to its handler or generateAppHTML).

**NOTES:**
- `runArchitect` takes positional `(query: string, opts?: { provider? })` — bridge via
  `runArchitect(prompt, { provider })`.
- `runBuilder` takes `{ spec: BuildSpec; provider?: string }` and returns `Promise<string>`.
- Both `runArchitect` and `runBuilder` never throw — any failure degrades gracefully
  (ungrounded spec / lastHtml fallback). No try/catch needed in `runGeneration`.
- The old `GenerateResult` had `classification: ClassifyResult | null`. The route's only
  consumers of that were `classification?.archetype` and `classification?.title` — both
  now come directly from the BuildSpec and are always non-null strings.
- `prompts/archetypes/classify.ts` is a DIFFERENT file from `pipeline/classify.ts`.
  The archetype prompts file (`prompts/archetypes/classify.ts`) is still used by the Builder
  via `composeSystemPrompt()` and must NOT be touched.
- `composeSystemPrompt` and `ClassifyResult` imports in the old `pipeline/index.ts` are
  dropped entirely — the Builder calls `composeSystemPrompt(spec.archetype)` internally.

---

### E2 — Frontend stage labels: Planning → Researching → Building → Ready

**SCOPE:**

**File 1: `apps/frontend/src/types.ts` — EDIT Stage type**

Old:
```ts
export type Stage = 'idle' | 'thinking' | 'building' | 'ready';
```

New:
```ts
export type Stage = 'idle' | 'planning' | 'researching' | 'building' | 'ready';
```

**File 2: `apps/frontend/src/components/BuildingCard.tsx` — UPDATE PHASES + grid**

The component currently has 3 phases in `PHASES` and `grid-cols-3`. Change to 4 phases and
`grid-cols-4`.

Old PHASES:
```ts
const PHASES: { id: Stage; label: string }[] = [
  { id: 'thinking', label: 'Thinking' },
  { id: 'building', label: 'Building' },
  { id: 'ready',    label: 'Ready' },
];
```

New PHASES:
```ts
const PHASES: { id: Stage; label: string }[] = [
  { id: 'planning',    label: 'Planning' },
  { id: 'researching', label: 'Researching' },
  { id: 'building',    label: 'Building' },
  { id: 'ready',       label: 'Ready' },
];
```

Also update the two grid classNames from `grid-cols-3` to `grid-cols-4` (there are two: the
progress bar grid and the label grid — both at `<div className="mt-5 grid grid-cols-3 gap-2">`
and `<div className="mt-2 grid grid-cols-3 text-center">`).

**File 3: `apps/frontend/src/hooks/useGeneration.ts` — UPDATE setStage calls**

In the `run()` function:

Old:
```ts
setStage('thinking'); setStatusNote('Thinking…');
const gen = await postJSON('/api/generate', { prompt: userPrompt });
```

New:
```ts
setStage('planning'); setStatusNote('Planning…');
// Brief delay then move to researching to reflect the Architect tool loop
setTimeout(() => {
  setStage('researching'); setStatusNote('Researching…');
}, 1500);
const gen = await postJSON('/api/generate', { prompt: userPrompt });
```

In the `applyUpdate()` function (update path is Builder-only, no Architect loop, so skip
'researching' and go straight to 'building' after 'planning'):

Old:
```ts
setStage('thinking'); setStatusNote('Thinking…');
```

New:
```ts
setStage('planning'); setStatusNote('Rebuilding…');
```

Also update the `useEffect` idle check — `'thinking'` no longer exists:

Old:
```ts
if (stage === 'idle' || stage === 'ready') return;
```

This line does NOT need to change — it already catches planning/researching/building correctly
since none of those are 'idle' or 'ready'. Leave it as-is.

The `busy` computed value:
```ts
const busy = stage !== 'idle' && stage !== 'ready';
```
Also does NOT need to change — still correct.

**ACCEPTANCE:**
1. `npm run typecheck` exits 0 across all workspaces.
2. No references to `'thinking'` in any frontend file.
3. BuildingCard renders 4 columns (visually: Planning / Researching / Building / Ready).
4. After submitting a prompt, the card briefly shows "Planning" then transitions to "Researching"
   while the generate call is in flight, then "Building" during deploy, then "Ready".

**NOTES:**
- `App.tsx` only passes `stage` as an opaque value to `BuildingCard` and does not switch on
  specific stage strings — the rename is fully contained to types.ts, BuildingCard.tsx,
  and useGeneration.ts.
- The `pollStatus` function sets `setStage('building')` when `s.status === 'building' ||
  s.status === 'deploying'` — this still uses `'building'` which is correct; no change needed.
- The setTimeout approach is lightweight and requires no backend changes. Streaming the
  Architect's tool calls (optional stretch) would require SSE or WebSocket changes on both
  sides — defer to a later phase.
- The LOG lines in BuildingCard.tsx can be updated if desired to reflect the new pipeline
  (e.g. "researching topic", "fetching images", "generating HTML") but this is cosmetic and
  optional — leave them as-is to keep the task scoped.

---

### E3 — Docs sweep

**Dependency note:** Execute E3 ONLY after E1 is committed (the code must match what the docs
describe). E2 can be done before or after E3 since it is purely frontend.

**SCOPE:**

The implementation agent should read each file in full before editing, find the stale passages
listed below, and make the targeted replacements. Do not rewrite entire files.

---

**File 1: `CLAUDE.md`**

1a. Replace the `pipeline/` bullet (the one starting "the core. `generate.ts` = `generateAppHTML()`"):
OLD contains: "`pipeline/` — **the core**. `generate.ts` = `generateAppHTML()` (Stage C: ... `index.ts` is the seam where Stage A (classify) and B (ground) will compose later."
NEW:
```
  - `pipeline/` — **the core**. `architect.ts` = `runArchitect(query) → BuildSpec` (OpenAI function-calling loop over the tool registry; bounded at MAX_ITERATIONS=8 / 90s; degrades to an ungrounded spec on failure). `builder.ts` = `runBuilder(spec) → html` (composes render contract from `prompts/archetypes/` + Build Spec; validate/repair loop, MAX_ATTEMPTS=3). `generate.ts` = legacy `generateAppHTML()` (flat single-prompt path, still used by `/api/update`). `index.ts` = `runGeneration()` — wired to Architect→Builder (Phase E). `classify.ts` = retired (Phase E).
  - `tools/` — **the Architect's tool registry** (`apps/orchestrator/src/tools/`). Each tool is `{ name, description, parameters (JSON schema), execute() }` and self-registers. Tools: `web_search` (Tavily, behind a `SearchProvider` seam; `TAVILY_API_KEY`), `wikipedia_summary` (Wikipedia REST, keyless), `image_search` (Wikimedia/Commons, license-safe), `emit-build-spec` (terminal — causes the loop to emit a BuildSpec and exit).
```

1b. Replace the `packages/shared/` bullet:
OLD contains: "`@zearch/shared`) — the single API contract (`DeployResult`, `DeployResponse`, `DeploymentStatus`, `GenerateResponse`, …). Pure types"
NEW: add after the ellipsis, before ". Pure types":
```
, `BuildSpec` (`{ intent, archetype, designDirection, presentation, facts[] (+sources), images[], liveEndpoint?, snapshot? }`), `BuildSpecFact`, `BuildSpecImage`, `LiveEndpoint`, and `ArchetypeSlug`
```

1c. Replace the `llm/` bullet:
OLD: "`client.ts` (`chatCompletion()`, the only module that talks HTTP to an LLM)."
NEW: "`client.ts` (`chatCompletion()` for text-only calls; `chatCompletionWithTools()` for the Architect's function-calling loop — takes `LoopMessage[]` + OpenAI tool schemas, never throws on null content)."

1d. In the Request flow section, replace the last paragraph:
OLD: "The frontend stage machine (`generating → packaging → pushing → building → deploying → healthy`) is now mostly cosmetic, since native hosting is instant."
NEW: "The frontend stage machine shows **Planning → Researching → Building → Ready**, matching the Architect (Planning/Researching) and Builder (Building) pipeline stages. `POST /api/update` re-generates from previous HTML + an update prompt using `generateAppHTML` (Builder-only flat path — no new Architect loop). `GET /api/live` is a CORS-bypass proxy for live-data pages (Phase D): forwards client-side fetches to a real API, injects keys server-side, and serves a lazy-eviction in-memory cache."

1e. In the Required environment section, replace the `LLM_PROVIDER` + Groq + OpenAI block:
OLD starts with: "- `LLM_PROVIDER` — `groq` (default) or `openai`."
NEW:
```
- `LLM_PROVIDER` — `openai` (the active provider for all Architect + Builder calls) or `groq` (legacy fallback).
- OpenAI provider (current): `OPENAI_API_KEY` (required for the Architect tool loop and Builder generation), `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_MAX_TOKENS` (default `16000`), `OPENAI_BASE_URL` (default OpenAI; override for any OpenAI-compatible endpoint).
- Groq provider (legacy option): `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`), `GROQ_MAX_TOKENS` (default `7000`), `GROQ_BASE_URL`/`GROQ_BASE`, `GROQ_REASONING_EFFORT` (default `low`).
- `TAVILY_API_KEY` — required for the Architect's `web_search` tool. Without it, `web_search` fails silently and the Architect degrades to an ungrounded spec using only `wikipedia_summary` and `image_search`.
- Live proxy (Phase D): `LIVE_PROXY_ALLOW_HOSTS` (SSRF allowlist), `LIVE_PROXY_CACHE_TTL_S` (cache TTL), `LIVE_PROXY_API_KEY` (optional server-side key injection).
```

1f. In the Gotchas section:
- Remove entirely the bullet about "The README's 'Getting Started' ... is stale" (P1-5 is done).
- Replace the Groq TPM bullet with: "**Groq TPM cap no longer applies** (D15): OpenAI is the active provider. Groq remains a `LLM_PROVIDER=groq` option but is not the recommended path."
- Remove entirely the bullet about stale Locus/Claude UI copy (Phase 1 is done).

---

**File 2: `README.md`**

2a. Replace the "How it works" diagram block:
OLD contains: "LLM (Groq) generates a single self-contained HTML page"
NEW diagram:
```
Prompt
  ↓
Architect (OpenAI function-calling loop) — plans page type, researches topic via tools
  (web_search / wikipedia_summary / image_search) → emits a structured Build Spec
  ↓
Builder (OpenAI generation call) — turns Build Spec into a single self-contained HTML page
  (React + Tailwind + Recharts via CDN, Babel-in-browser); validate + repair loop
  ↓
Orchestrator stores the HTML (memory + disk) and serves it at /app/:id
  ↓
Frontend iframes the live page (follow-up prompts regenerate / refine — Builder-only re-gen)
  ↓
Auto teardown after 30 min idle
```

2b. In the tech stack list, replace:
OLD: "🤖 **Groq** (OpenAI-compatible API) — LLM generation; default model `openai/gpt-oss-120b`"
NEW: "🤖 **OpenAI** — LLM for all calls (Architect tool loop + Builder generation); `gpt-4o-mini` default, swappable via `OPENAI_MODEL`"

2c. In the Getting Started env section, replace the env block:
OLD: `GROQ_API_KEY="your_groq_api_key"` + the optional overrides mentioning Groq
NEW:
```
OPENAI_API_KEY="your_openai_api_key"
TAVILY_API_KEY="your_tavily_api_key"
```
And update the optional overrides line to: `LLM_PROVIDER` (`openai` default), `OPENAI_MODEL` (default `gpt-4o-mini`), `PUBLIC_BASE`, `PORT`.

2d. In the Roadmap section, check/update items so the shipped features are checked:
- `[x] Agentic pipeline — Architect tool loop → Build Spec → Builder with validate/repair loop`
- `[x] Archetype routing — Architect decides page type; per-archetype render contract`
- `[x] Grounding — real Wikipedia facts + Wikimedia images in every Build Spec`
- `[x] Render reliability — validate/repair loop; broken pages never reach the iframe`
- `[x] Live data — generated pages can fetch live APIs through /api/live proxy with snapshot fallback`
- `[ ] Persistence & sharing`
- `[ ] Search history`

---

**File 3: `.agent/TASKS.md`**

3a. Mark Phase E header as done:
OLD: `## Phase E — Cutover, frontend, docs`
NEW: `## Phase E — Cutover, frontend, docs _(done)_`

3b. Mark all three tasks done (change `todo` → `done` for E1, E2, E3).

3c. Append to the Done log:
```
- **Phase A–E (Agentic Core)** — tool registry (`web_search`/`wikipedia_summary`/`image_search`/`emit-build-spec`), `BuildSpec` in `@zearch/shared`, `runArchitect()`, `runBuilder()` with validate/repair, `/api/live` proxy, `pipeline/index.ts` rewired to Architect→Builder, `classify.ts` retired, frontend Planning→Researching→Building→Ready stages, docs sweep.
```

---

**File 4: `.agent/STATE.md`**

4a. Update "Last Updated" date and add a session summary at the top (after existing summaries):
```
- **Session summary (2026-06-19, Phase E):** **Phase E — Cutover, frontend, docs: COMPLETE (E1–E3), not committed.**
  **E1** — `pipeline/index.ts` rewritten: `runGeneration()` now calls `runArchitect(prompt) → BuildSpec` then `runBuilder({ spec }) → html`; `generateAppHTML` re-exported for `/api/update`. `routes/generate.ts` updated to destructure `{ html, archetype, title }` directly (dropping `classification`). `pipeline/classify.ts` marked retired with a comment block.
  **E2** — `apps/frontend/src/types.ts`: `Stage` updated to `'idle' | 'planning' | 'researching' | 'building' | 'ready'`. `BuildingCard.tsx`: PHASES extended to 4 items (Planning/Researching/Building/Ready), grids updated to `grid-cols-4`. `useGeneration.ts`: `setStage('thinking')` → `setStage('planning')` with a 1.5s setTimeout to `'researching'` in `run()`; `applyUpdate()` uses `'planning'` only (Builder-only path skips 'researching').
  **E3** — Docs sweep: `CLAUDE.md`, `README.md`, `.agent/TASKS.md`, `.agent/STATE.md`, `PLAN.md`, `.agent/PLAN.md` updated to reflect the shipped Agentic Core pipeline. Groq TPM gotcha retired; Locus copy gotcha retired; pipeline description updated; LLM provider updated to OpenAI as default.
  **Verification:** `npm run typecheck` green across all workspaces. Branch `feature/agentic-core-phase-e`, **awaiting the user's commit**. **Next: Phase 5 — Persistence & sharing.**
```

4b. Replace the "Current Phase" block:
NEW:
```
## Current Phase

- **Milestone:** **Agentic Core re-architecture — Phase E (Cutover, frontend, docs) ✅ COMPLETE. All phases A–E shipped.**
- **Overall progress:** Phase 0 ✅ · Phase R ✅ · Phase 1 ✅ · Phase 2 ✅ (wiring superseded) · Phase A ✅ · Phase B ✅ · Phase C ✅ · Phase D ✅ · **Phase E ✅**
- **Status:** The live pipeline is **Architect → Builder**. `pipeline/index.ts` (`runGeneration`) calls `runArchitect(query) → BuildSpec`, then `runBuilder(spec) → html`. `classify.ts` and the confidence cutover are retired. `/api/update` uses `generateAppHTML` (Builder-only flat path). `/api/live` proxy is live. Frontend shows Planning → Researching → Building → Ready. **Next: Phase 5 — Persistence & sharing.**
```

4c. Append to the Completed section:
```
- **Phase A — Tooling foundation** — tool registry under `apps/orchestrator/src/tools/`; `web_search` (Tavily), `wikipedia_summary`, `image_search`, `emit-build-spec`; `BuildSpec`/`BuildSpecFact`/`BuildSpecImage`/`LiveEndpoint`/`ArchetypeSlug` added to `@zearch/shared`.
- **Phase B — Architect** — `pipeline/architect.ts`: `runArchitect(query) → BuildSpec` OpenAI function-calling loop (MAX_ITERATIONS=8, 90s, degrades to `ungroundedSpec`); `chatCompletionWithTools()` in `llm/client.ts`; `ARCHITECT_SYSTEM_PROMPT` in `prompts/architect.ts`.
- **Phase C — Builder** — `pipeline/builder.ts`: `runBuilder({ spec }) → html`; `buildUserMessage(spec)` with grounded facts/images; validate/repair loop (MAX_ATTEMPTS=3); never throws.
- **Phase D — Live data** — `routes/live.ts`: `/api/live` CORS-bypass proxy with SSRF allowlist, 15s timeout, lazy-eviction cache, `X-Cache` header; `config.ts` gains three new env vars; Architect prompt expanded with live-endpoint guidance; Builder generates a `liveBlock` with proxy fetch + snapshot fallback.
- **Phase E — Cutover, frontend, docs** — `pipeline/index.ts` rewired to Architect→Builder; `classify.ts` retired; frontend stage labels → Planning/Researching/Building/Ready; docs sweep.
```

4d. Replace the "In Progress" section:
```
## In Progress

- No active in-progress branches. All Phase A–E work is complete.
- **Owner:** XZNON (solo project).
- **Open PRs:** none.
```

4e. Replace the "Next" section:
```
## Next

Phase E is complete. The Agentic Core (Phases A–E) is fully shipped.

**Phase 5 — Persistence & sharing:**
1. **P5-1** — Opt-in persistent/shareable link ("keep this page", extend TTL).
2. **P5-2** — Client-side search history (localStorage recents strip).
3. **P5-3** — Rebuild `apps` Map + teardown timers from disk on orchestrator restart.
```

4f. Replace the "Blockers" section:
```
## Blockers

- **No blocking issues.** All Agentic Core phases are complete.
- **`.env` gotcha (still applies):** key lines must be `KEY="val"` with **no spaces around `=`** — Node's `--env-file` parser silently ignores `KEY = "val"`.
- **Env dependency:** end-to-end generation needs `OPENAI_API_KEY` and `TAVILY_API_KEY` in repo-root `.env`. Without `OPENAI_API_KEY`, Architect/Builder calls fail. Without `TAVILY_API_KEY`, `web_search` silently fails and the Architect degrades to an ungrounded spec.
```

4g. In "Important Notes", replace the Groq TPM cap bullet:
OLD: "**Groq TPM cap.** Free tier caps tokens-per-minute..."
NEW: "**Groq TPM cap no longer applies** (D15): OpenAI is the active provider. Groq remains a `LLM_PROVIDER=groq` option but is not the recommended path."

4h. In "Quick Resume Guide", replace step 3–4:
OLD step 3: "root `.env` with `GROQ_API_KEY` and `GROQ_MAX_TOKENS=6500`..."
NEW step 3: "root `.env` with `OPENAI_API_KEY` and `TAVILY_API_KEY`, then `npm install` → `npm run dev`. Verify with `npm run typecheck`."
OLD step 4: "Continue with: Phase 2 — archetype routing..."
NEW step 4: "Continue with: **Phase 5 — Persistence & sharing** (P5-1 through P5-3). The Agentic Core (Phases A–E) is fully shipped."

---

**File 5: `PLAN.md`**

5a. In the Phase roadmap/table: mark Phase E as done (change ⬜ todo → ✅ done for Phase E row).

5b. Find the "Immediate next step" section (says "Begin Phase A, no phase implemented yet"):
Replace with:
```
## 8. Current status

**Phases A–E (Agentic Core) are complete.** The shipped pipeline is:

- Tool registry under `apps/orchestrator/src/tools/` (A1–A4) + `BuildSpec` in `@zearch/shared` (A5).
- `pipeline/architect.ts` — `runArchitect(query) → BuildSpec` OpenAI function-calling loop (B1–B2).
- `pipeline/builder.ts` — `runBuilder(spec) → html` with validate/repair loop (C1–C2).
- `/api/live` proxy in `routes/live.ts` with SSRF allowlist and in-memory cache (D1–D2).
- `pipeline/index.ts` rewired to Architect→Builder; `classify.ts` retired (E1).
- Frontend stage labels: Planning → Researching → Building → Ready (E2).

**Next:** Phase 5 — Persistence & sharing (P5-1 through P5-3).
```

5c. In the env table (Section 4), update the Groq-centric table to show OpenAI as primary:
OLD table header row: "| `GROQ_BASE` | ..." and rows showing Groq vars
NEW table:
```
| Knob     | Env var           | Default (OpenAI provider)                                        |
| -------- | ----------------- | ---------------------------------------------------------------- |
| Base URL | `OPENAI_BASE_URL` | `https://api.openai.com/v1`                                      |
| Model    | `OPENAI_MODEL`    | `gpt-4o-mini`                                                    |
| Key      | `OPENAI_API_KEY`  | _(required; server warns and `/api/generate` fails without it)_  |
```
And the prose after: "**OpenAI for all calls (D15)** — both the Architect tool loop and the Builder generation. Groq is still a valid `LLM_PROVIDER=groq` option but is no longer the default or recommended path."

---

**File 6: `.agent/PLAN.md`**

6a. In the Phase roadmap table, change Phases A–E from `⬜ todo` → `✅ done`.

6b. Replace the "Immediate next steps" block (says "Begin Phase A, nothing implemented yet"):
```
### Current status & next steps

**Phases A–E are complete.** The Agentic Core is fully shipped. The live pipeline is Architect → Builder; `classify.ts` is retired; frontend shows Planning → Researching → Building → Ready.

**Next:** Phase 5 — Persistence & sharing (P5-1 through P5-3). See `.agent/TASKS.md`.
```

6c. Update the `pipeline/` description in §2 architecture:
OLD: "`generate.ts` = Stage C; `index.ts` is the seam where Stages A/B compose in later."
NEW: "`architect.ts` = `runArchitect(query) → BuildSpec` (tool-calling loop). `builder.ts` = `runBuilder(spec) → html` (validate/repair). `generate.ts` = `generateAppHTML()` (flat path, used by `/api/update`). `index.ts` = `runGeneration()` wired to Architect→Builder. `classify.ts` = retired."
Also add after that bullet: "`tools/` — pluggable tool registry. Tools: `web_search` (Tavily), `wikipedia_summary`, `image_search`, `emit-build-spec` (terminal)."

6d. Update the "LLM brain" section:
OLD: "Groq today (`openai/gpt-oss-120b`); swap to OpenAI/Anthropic by changing env, no pipeline changes. Plan (P2-4): a cheap/fast model for Stage A classify, a strong model for Stage C generate."
NEW: "**OpenAI is the active provider** for all calls (Architect + Builder). `OPENAI_API_KEY` + `OPENAI_MODEL` (default `gpt-4o-mini`). Groq remains a swappable option via `LLM_PROVIDER=groq` but is no longer the default. The cheap/strong model tier split (P2-4) was implemented and then superseded by the Agentic Core's single-provider approach."

---

**ACCEPTANCE for E3:**
- `npm run typecheck` green (docs changes don't affect types, but run it to confirm nothing else broke).
- All six files accurately describe the shipped agentic pipeline.
- No living references to `classify.ts` as an active code path.
- No references to Groq as the default provider.
- Phase A–E marked ✅ done in roadmap tables.
- README Getting Started env section shows `OPENAI_API_KEY` and `TAVILY_API_KEY`.

────────────────────────────────────────────────────────
DEFINITION OF DONE (per task)
────────────────────────────────────────────────────────
- npm run typecheck green (show output).
- Task-specific acceptance check passes (show evidence).
- .agent/TASKS.md updated: that task marked done.
- List every file changed (path + one-line reason).
- Do NOT commit. Pause for my review.

────────────────────────────────────────────────────────
PHASE COMPLETE
────────────────────────────────────────────────────────
When every task is done: update .agent/STATE.md (phase ✅, what's next), summarize the whole
phase's changes, and stop. Do NOT commit.

────────────────────────────────────────────────────────
⚠ RUNNING LOW ON CONTEXT — HANDOFF PROTOCOL (do this BEFORE you run out)
────────────────────────────────────────────────────────
If at any point your remaining context is getting tight (roughly <20% left, or you sense a
summarization/compaction is near) and the phase is NOT finished, STOP starting new work and
hand off cleanly instead:

  1. Finish only the current in-flight edit to a compiling state; run npm run typecheck.
     If it can't be made green quickly, revert the half-done edit so the tree is clean.
  2. Update .agent/STATE.md: which phase tasks are DONE, which is IN-PROGRESS (and exactly
     how far), which are still TODO. Note the branch name and typecheck status.
  3. Update .agent/handoff.md (Goal, Current State, Files Being Edited, What We Tried That
     Failed, Next Step) so it reflects this phase's progress.
  4. Print a CONTINUATION PROMPT (in a fenced code block) that I can paste verbatim into a
     brand-new session to resume. It MUST:
       - say "Resuming Phase E; tasks {done} are done, continue from {next_task_id}"
       - point at .agent/implementations/implementation_PE.md as the full plan
       - repeat the SESSION START reads + npm run typecheck gate + GUARDRAILS above
       - repeat this same HANDOFF PROTOCOL so the next session can hand off again
  5. Stop. Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; don't run past them silently
────────────────────────────────────────────────────────
A) After session-start reads + typecheck green → phase plan summary, wait for "go".
B) After each task's implementation → show diff / key changes, wait for my review.
C) After each task's typecheck passes → show output + file list before marking it done.
D) Before starting each next task → confirm the previous one is done and reviewed.
```
