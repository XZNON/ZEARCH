# Session prompt — ZEARCH · PA (Tooling foundation)

> One self-contained, copy-paste prompt covering the WHOLE phase.
> Phase: **PA** (Agentic Core — Tooling foundation) in `.agent/TASKS.md`. Tasks: A1, A2, A3, A4, A5. Generated: 2026-06-11.

This is the first phase of the **Agentic Core re-architecture** (`PLAN.md` §3, decisions D12–D15):
the pipeline becomes **Architect → Builder**, where a tool-using LLM (the Architect) plans + grounds
the page via a tool loop and emits a **Build Spec**, and the Builder turns that into `index.html`.
Phase A builds the **inert foundation** both later phases stand on: the pluggable tool registry, the
three launch tools (Tavily, Wikipedia, image search), and the Build Spec contract. **Phase A wires
nothing into the live pipeline** — it is purely additive and the running MVP is unaffected.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working through ALL of phase PA:
Agentic Core — Tooling foundation. The phase has these tasks, to be done in this order:
  A1 — Tool registry + `Tool` interface (self-registration + OpenAI function-call schema export)
  A2 — Tavily tool (web search + content extraction) behind a swappable SearchProvider seam
  A3 — wikipedia_summary tool (Wikipedia REST summary + key facts)
  A4 — image_search tool (Wikimedia/Commons image URLs, license-safe)
  A5 — Build Spec contract in @zearch/shared (the Architect↔Builder handoff)

Work ONE task at a time, in order. Check in at the checkpoints. Follow every rule below.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=6 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/PLAN.md, .agent/TASKS.md, docs/idea.md, .agent/STATE.md
Also skim (you will mirror their patterns):
  apps/orchestrator/src/llm/providers.ts   (the keyed-registry + resolveProvider pattern to mirror)
  apps/orchestrator/src/llm/client.ts      (chatCompletion — TEXT-ONLY today; tool-calling is Phase B, not here)
  apps/orchestrator/src/pipeline/classify.ts (the "never throws, defensive parse" contract to copy)
  apps/orchestrator/src/config.ts          (the ONE place env is read — add TAVILY_API_KEY here)
  packages/shared/index.ts                 (the API-contract types; A5 adds BuildSpec here)
  apps/orchestrator/src/prompts/archetypes/index.ts (the `Archetype` union + ARCHETYPES — A5 reuses the 7 slugs)
Run:  npm run typecheck   ← must be green before any code change
Tell me: the task list for this phase, which is first, and your plan for it.
Do NOT write code until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- npm run typecheck must be green before you declare ANY task done.
- Create one feature branch for the phase before changes:
    git checkout -b feature/agentic-core-phase-a
- Do ONE task at a time, in dependency order. Finish + verify a task before starting the next.
- After finishing each task: mark it done in .agent/TASKS.md and pause for my review before
  starting the next task.
- PHASE A IS ADDITIVE AND INERT. Do NOT modify the live pipeline, prompts, or routes:
  leave pipeline/index.ts, pipeline/generate.ts, pipeline/classify.ts, routes/*, and ALL of
  prompts/ (especially the load-bearing CDN/`window.Recharts` block in
  prompts/archetypes/hard-requirements.ts and prompts/shared.ts) untouched. Wiring the Architect
  in is Phase B/E, not now.
- LLM provider is OpenAI for all real calls (D15). The Tavily/Wikipedia/image tools are plain HTTP
  (no LLM). .env keys use KEY="val" form with NO spaces around `=` (Node's --env-file parser drops
  `KEY = "val"`). .env is gitignored — never commit keys, never put a key in client-shipped code.
- Every tool's execute() must NEVER throw — on any failure (missing key, HTTP error, bad JSON, no
  result) it returns a structured failure the Architect loop can recover from. Mirror the
  never-throws contract of pipeline/classify.ts.

────────────────────────────────────────────────────────
PER-TASK PLAN (one block per task in the phase)
────────────────────────────────────────────────────────

### A1 — Tool registry + `Tool` interface
- SCOPE: new directory `apps/orchestrator/src/tools/`:
  - `types.ts` — the contracts:
      export interface ToolResult { ok: boolean; content: string; data?: unknown }
        // `content` = the text fed back to the model on the next loop turn (human/LLM-readable
        // summary of what the tool found). `data` = optional structured payload for later use.
      export interface Tool {
        name: string;          // function name the model calls (snake_case, e.g. "web_search")
        description: string;    // when/why the Architect should call it
        parameters: Record<string, unknown>;  // JSON Schema for the args (OpenAI tool `parameters`)
        execute(args: Record<string, unknown>): Promise<ToolResult>;
      }
  - `registry.ts` — a `Map<string, Tool>` plus:
      registerTool(tool: Tool): void            // throws on duplicate name (dev-time safety)
      getTool(name: string): Tool | undefined
      listTools(): Tool[]
      toOpenAIToolSchemas(): Array<{ type: 'function'; function: { name; description; parameters } }>
        // exactly the shape OpenAI's chat-completions `tools` param wants — Phase B feeds this in.
  - `index.ts` — imports each tool module (A2–A4) so they self-register as a side effect, then
    re-exports the registry surface. (At A1 it imports nothing yet; A2–A4 add the imports.)
- ACCEPTANCE: `npm run typecheck` green. Prove the registry works with a throwaway check (delete
  after): register a stub tool, then
    `npx tsx -e "import {registerTool,listTools,toOpenAIToolSchemas} from './apps/orchestrator/src/tools/registry.ts'; ..."`
  showing listTools() returns it and toOpenAIToolSchemas() emits the `{type:'function',...}` shape.
  Then remove the stub.
- NOTES: mirror the keyed-registry pattern in `llm/providers.ts` (a plain object/Map keyed by name,
  resolved by name). No schema/validation library — `parameters` is a hand-written JSON-Schema
  object literal. Keep `execute` defensive (try/catch inside, return `{ok:false,...}`), never throw.

### A2 — Tavily tool (search + extract) behind a SearchProvider seam
- SCOPE:
  - `apps/orchestrator/src/tools/search/types.ts` —
      export interface SearchHit { title: string; url: string; content: string }
      export interface SearchProvider { name: string; search(query: string, opts?: { maxResults?: number }): Promise<SearchHit[]> }
  - `apps/orchestrator/src/tools/search/tavily.ts` — `tavilyProvider: SearchProvider`: POSTs to
    `https://api.tavily.com/search` with body `{ api_key, query, max_results, search_depth:'advanced', include_answer:false }`; maps `results[]` → `SearchHit[]` (use `content`, and `raw_content` when present). Reads the key from config (see below), not process.env directly.
  - `apps/orchestrator/src/tools/web-search.ts` — the `Tool` (`name: 'web_search'`,
    params `{ query: string (required), max_results?: number }`) that calls the ACTIVE provider
    (tavilyProvider for now) and formats the hits into a compact `content` string (numbered
    title + url + snippet). Self-registers via tools/index.ts.
  - `apps/orchestrator/src/config.ts` — add `export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;`
  - Add `TAVILY_API_KEY="..."` to the repo-root `.env` (gitignored — tell me to paste my key; do
    NOT invent one, do NOT commit).
- ACCEPTANCE: `npm run typecheck` green. With my real key in `.env`, a throwaway
  `npx tsx -e` calling `webSearchTool.execute({ query: 'Napoleon Bonaparte' })` returns
  `ok:true` with non-empty `content` containing real result titles/URLs. With the key UNSET it
  returns `ok:false` with a clear message and does NOT throw.
- NOTES: the SearchProvider seam (D13) is the swap point for DDG/Brave/SerpAPI later — the `web_search`
  Tool must not know it's Tavily. Tavily response shape: `{ results: [{ title, url, content, raw_content? }], answer? }`. Set a 10–15s fetch timeout.

### A3 — wikipedia_summary tool
- SCOPE: `apps/orchestrator/src/tools/wikipedia.ts` — `Tool` (`name: 'wikipedia_summary'`,
  params `{ title: string (required) }`). execute() GETs
  `https://en.wikipedia.org/api/rest_v1/page/summary/{encodeURIComponent(title)}` with a descriptive
  `User-Agent` header (Wikimedia etiquette, e.g. `ZEARCH/0.1 (https://github.com/XZNON/ZEARCH)`),
  and returns a compact `content` from `{ extract, description, content_urls.desktop.page }`, with
  `data` = `{ extract, description, thumbnail, originalimage }`. 404 (no page) → `ok:false` with a
  clear "no Wikipedia page for X" message, not a throw. Self-register via tools/index.ts.
- ACCEPTANCE: typecheck green. Throwaway `tsx`: `execute({title:'Napoleon'})` → ok:true with a real
  extract; `execute({title:'qwerty_no_such_page_zzz'})` → ok:false, no throw.
- NOTES: keyless, CORS-open, but we call it server-side regardless. The REST summary endpoint also
  hands back `thumbnail`/`originalimage` URLs — fine to surface in `data`, but A4 owns image search.

### A4 — image_search tool (Wikimedia/Commons)
- SCOPE: `apps/orchestrator/src/tools/images.ts` — `Tool` (`name: 'image_search'`,
  params `{ query: string (required), limit?: number }`). execute() queries Wikimedia Commons via
  the MediaWiki API:
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={query}&gsrnamespace=6&gsrlimit={limit}&prop=imageinfo&iiprop=url|extmetadata`
  (descriptive User-Agent header), mapping pages → `data: Array<{ url, title, license? }>` and a
  compact `content` list. Empty results → `ok:false` ("no images found for X"), no throw.
  Self-register via tools/index.ts.
- ACCEPTANCE: typecheck green. Throwaway `tsx`: `execute({query:'Napoleon Bonaparte'})` returns
  `ok:true` with ≥1 image URL; spot-check one URL resolves to an actual image (HTTP 200, image/*).
- NOTES: Commons (namespace 6) is license-safe — pull the license string from
  `imageinfo[].extmetadata.LicenseShortName` when present. Keep it simple here (a flat list);
  galleries/lightbox come later. URL-encode the query.

### A5 — Build Spec contract in @zearch/shared
- SCOPE: add to `packages/shared/index.ts` (pure types — this package is `import type`-only, zero
  runtime; the orchestrator constructs values, the frontend may read a few fields for the build feed):
    export type ArchetypeSlug =
      'person' | 'event' | 'place' | 'concept' | 'comparison' | 'data' | 'tool';
    export interface BuildSpecFact { text: string; source?: string }
    export interface BuildSpecImage { url: string; alt?: string; credit?: string; license?: string }
    export interface LiveEndpoint {
      // The page fetches this client-side THROUGH the orchestrator /api/live proxy (Phase D).
      url: string; method?: 'GET' | 'POST'; description: string; shape?: string;
    }
    export interface BuildSpec {
      archetype: ArchetypeSlug;
      title: string;
      designDirection: string;     // free-text art direction: layout, sections, tone
      presentation: string;        // which components/visuals to use (timeline, charts, table, map…)
      facts: BuildSpecFact[];      // grounded facts WITH sources (may be empty on degraded path)
      images: BuildSpecImage[];    // grounded image URLs (may be empty)
      liveEndpoint?: LiveEndpoint; // present only for live-data queries (Phase D)
      snapshot?: unknown;          // build-time fallback data for the live endpoint (Phase D)
    }
- ACCEPTANCE: `npm run typecheck` green across ALL workspaces (the shared package + both apps).
  Confirm BuildSpec is importable from the orchestrator: a throwaway
  `import type { BuildSpec } from '@zearch/shared'` in an orchestrator file type-checks.
- NOTES: dependency is one-way — `packages/shared` must NOT import orchestrator code. The 7 slugs
  in `ArchetypeSlug` MUST match `ARCHETYPES` in
  `apps/orchestrator/src/prompts/archetypes/index.ts` (person/event/place/concept/comparison/data/
  tool). Reconciling the orchestrator's local `Archetype` union to re-use this shared `ArchetypeSlug`
  is a nice-to-have — note it for Phase B, do NOT refactor the prompts in Phase A.

────────────────────────────────────────────────────────
DEFINITION OF DONE (per task)
────────────────────────────────────────────────────────
- npm run typecheck green (show output).
- Task-specific acceptance check passes (show evidence — the tsx one-off output / typecheck).
- .agent/TASKS.md updated: that task marked done.
- List every file changed (path + one-line reason).
- Do NOT commit. Pause for my review.

────────────────────────────────────────────────────────
PHASE COMPLETE
────────────────────────────────────────────────────────
When A1–A5 are all done: update .agent/STATE.md (Phase A ✅, Phase B is next — the Architect loop
that consumes this registry + emits a BuildSpec), summarize the whole phase's changes, and stop.
Do NOT commit.

────────────────────────────────────────────────────────
⚠ RUNNING LOW ON CONTEXT — HANDOFF PROTOCOL (do this BEFORE you run out)
────────────────────────────────────────────────────────
If your remaining context is getting tight (roughly <20% left, or a compaction feels near) and the
phase is NOT finished, STOP starting new work and hand off cleanly:

  1. Finish only the current in-flight edit to a compiling state; run npm run typecheck. If it
     can't be made green quickly, revert the half-done edit so the tree is clean.
  2. Update .agent/STATE.md: which of A1–A5 are DONE, which is IN-PROGRESS (and exactly how far),
     which are still TODO. Note the branch (feature/agentic-core-phase-a) and typecheck status.
  3. Update .agent/handoff.md (Goal, Current State, Files Being Edited, What We Tried That Failed,
     Next Step) for this phase's progress.
  4. Print a CONTINUATION PROMPT (fenced) I can paste verbatim into a fresh session. It MUST:
       - say "Resuming phase PA; tasks {done} are done, continue from {next_task_id}"
       - point at .agent/implementations/implementation_PA.md as the full plan
       - repeat the SESSION START reads + `npm run typecheck` gate + GUARDRAILS above
       - repeat this same HANDOFF PROTOCOL so the next session can hand off again
  5. Stop. Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; don't run past them silently
────────────────────────────────────────────────────────
A) After session-start reads + typecheck green → phase plan summary, wait for "go".
B) After each task's implementation → show diff / key changes, wait for my review.
C) After each task's typecheck + acceptance passes → show output + file list before marking it done.
D) Before starting each next task → confirm the previous one is done and reviewed.
```
