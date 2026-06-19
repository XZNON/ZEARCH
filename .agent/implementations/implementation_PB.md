# Session prompt — ZEARCH · PB (Architect — the tool-loop brain)

> One self-contained, copy-paste prompt covering the WHOLE phase.
> Phase: **PB** (Agentic Core — Architect) in `.agent/TASKS.md`. Tasks: B1, B2. Generated: 2026-06-16.

This is the second phase of the **Agentic Core re-architecture** (`PLAN.md` §3, decisions D12–D15).
Phase A landed the **inert tool layer** (`apps/orchestrator/src/tools/`: registry + `web_search` /
`wikipedia_summary` / `image_search`) and the **Build Spec** contract in `@zearch/shared`. Phase B
builds the **Architect**: `runArchitect(query) → BuildSpec` — a tool-using LLM that runs an OpenAI
function-calling loop over the Phase-A registry, gathers grounded facts + images, and emits a
structured `BuildSpec`. **Phase B is still additive** — the Architect is NOT wired into the live
pipeline (`pipeline/index.ts` keeps running the Phase-2 classify→compose path); cutover is Phase E.

The two tasks are tightly coupled by one design decision, already reconciled here: **the Architect
emits its BuildSpec by calling a terminal `emit_build_spec` tool** (a schema-validated, parse-free
handoff), not by returning free-form JSON. B1 builds the loop + that tool; B2 writes the system
prompt that drives the loop and instructs the model to finish by calling `emit_build_spec`.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working through ALL of phase PB:
Agentic Core — Architect (the tool-loop brain). The phase has these tasks, in this order:
  B1 — runArchitect(query) → BuildSpec: the OpenAI function-calling loop over the tool registry,
       with loop control (max iterations + timeout) and graceful degradation to an ungrounded spec.
  B2 — Architect system prompt: the design-reasoning brain that decides archetype/design/
       presentation, which tools to call, and instructs the model to emit the BuildSpec.

Work ONE task at a time, in order. Check in at the checkpoints. Follow every rule below.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=6 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/PLAN.md, .agent/TASKS.md, docs/idea.md, .agent/STATE.md
Also skim (you will build directly on these):
  packages/shared/index.ts                  (the BuildSpec contract runArchitect returns — read EVERY field)
  apps/orchestrator/src/tools/{types,registry,index}.ts  (the registry surface: listTools/getTool/
                                             toOpenAIToolSchemas; Tool.execute() never throws)
  apps/orchestrator/src/tools/web-search.ts (a sample tool's params/result shape; A3/A4 = wikipedia.ts, images.ts)
  apps/orchestrator/src/llm/client.ts       (chatCompletion is TEXT-ONLY today — B1 ADDS a tool-calling sibling)
  apps/orchestrator/src/llm/providers.ts    (resolveProvider(name,tier); 'strong' tier; OpenAI is the provider)
  apps/orchestrator/src/pipeline/classify.ts (THE pattern to mirror: never-throws + defensive JSON parse)
  apps/orchestrator/src/prompts/archetypes/classify.ts (CLASSIFY_SYSTEM_PROMPT routing rules + few-shots — B2 reuses)
  apps/orchestrator/src/prompts/archetypes/index.ts    (ARCHETYPES — the 7 slugs == ArchetypeSlug; the Builder seam)
Run:  npm run typecheck   ← must be green before any code change
Tell me: the task list for this phase, which is first, and your plan for it.
Do NOT write code until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- npm run typecheck must be green before you declare ANY task done.
- Create one feature branch for the phase before changes:
    git checkout -b feature/agentic-core-phase-b
- Do ONE task at a time, in dependency order. Finish + verify a task before starting the next.
- After finishing each task: mark it done in .agent/TASKS.md and pause for my review before
  starting the next task.
- PHASE B IS ADDITIVE. Do NOT wire the Architect into the live pipeline or routes: leave
  pipeline/index.ts, pipeline/generate.ts, pipeline/classify.ts, and routes/* untouched. Cutover
  (runGeneration = Architect → Builder, retiring classify.ts) is Phase E, not now.
- Do NOT change the existing chatCompletion() in llm/client.ts. It throws on empty content (correct
  for text generation, WRONG for tool turns where content is null). Add a SIBLING function instead.
- Do NOT touch the load-bearing CDN/render block in prompts/archetypes/hard-requirements.ts or the
  Builder prompt prompts/shared.ts — Phase B emits a spec, never HTML.
- LLM provider is OpenAI for ALL real calls (D15), tier:'strong' for the Architect. .env keys use
  KEY="val" form with NO spaces around `=` (Node's --env-file parser drops `KEY = "val"`). Running
  end-to-end needs OPENAI_API_KEY and TAVILY_API_KEY in the repo-root .env (gitignored). Never commit
  keys; never put a key in client-shipped page JS.
- runArchitect() must NEVER throw — on any failure (LLM error, timeout, unparseable spec, no keys)
  it returns a minimal UNGROUNDED BuildSpec so the Builder (Phase C) always has input. Mirror the
  never-throws contract of pipeline/classify.ts.
- The 7 archetype slugs are a cross-package contract: ArchetypeSlug (@zearch/shared) == ARCHETYPES
  keys (prompts/archetypes/index.ts) == person|event|place|concept|comparison|data|tool, byte-for-byte.
  A single typo breaks the Builder's composeSystemPrompt(slug) lookup downstream.

────────────────────────────────────────────────────────
SHARED DESIGN DECISION (settled — both tasks build on this)
────────────────────────────────────────────────────────
The Architect emits its BuildSpec by calling a TERMINAL `emit_build_spec` tool whose JSON-Schema
parameters mirror BuildSpec — NOT by returning free-form JSON. Why: the loop ends deterministically
the moment the model calls it (no ambiguity between "more research" vs "final answer"), it forces
the exact fields, and it reuses the tool-calling machinery the loop already runs. B1 registers this
tool and detects the call by name to end the loop; B2's prompt instructs the model to finish by
calling it exactly once. (We still parse its `arguments` defensively — `arguments` is a model-authored
JSON STRING that can be malformed; reuse classify.ts's fence-strip + outermost-{…}-slice trick.)

────────────────────────────────────────────────────────
PER-TASK PLAN (one block per task in the phase)
────────────────────────────────────────────────────────

### B1 — runArchitect(query) → BuildSpec  (the loop machinery)
- SCOPE — three surfaces (all additive):
  1. EDIT `apps/orchestrator/src/llm/client.ts` — add a SIBLING `chatCompletionWithTools()`
     alongside the untouched `chatCompletion()`. It POSTs the same body PLUS `tools` (the
     OpenAIToolSchema[] the caller passes) and `tool_choice: 'auto'`, and returns the assistant
     turn WITHOUT throwing on empty/null content (a tool-call turn legitimately has content:null).
     New exported shapes:
       export interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
       export type LoopMessage =
         | { role: 'system' | 'user'; content: string }
         | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
         | { role: 'tool'; content: string; tool_call_id: string };
       export interface AssistantTurn { content: string | null; toolCalls: ToolCall[]; finishReason?: string }
       export async function chatCompletionWithTools(
         { messages, tools, toolChoice='auto', provider, tier='strong' }:
         { messages: LoopMessage[]; tools: OpenAIToolSchema[]; toolChoice?: 'auto'|'none';
           provider?: string; tier?: ModelTier },
       ): Promise<AssistantTurn>
     Still throws on missing key / non-2xx HTTP (caught by runArchitect → degraded path). Import
     `OpenAIToolSchema` via `import type { OpenAIToolSchema } from '../tools/index.js'`.
  2. CREATE `apps/orchestrator/src/tools/emit-build-spec.ts` — the terminal emit tool, self-registering.
     `name:'emit_build_spec'`, description "Call this once, after research, with the complete BuildSpec
     to finish.", `parameters` = a JSON-Schema mirroring BuildSpec (archetype as an enum of the 7
     slugs; title/designDirection/presentation strings; facts array of {text, source?}; images array
     of {url, alt?, credit?, license?}; optional liveEndpoint/snapshot). Its `execute()` is an inert
     never-throws no-op returning `{ ok:true, content:'spec received' }` (the loop detects the call by
     NAME and returns before executing it; execute only exists to honor the Tool contract). Add
     `import './emit-build-spec.js';` to `apps/orchestrator/src/tools/index.ts`.
  3. CREATE `apps/orchestrator/src/pipeline/architect.ts` — `runArchitect(query, opts?) → Promise<BuildSpec>`:
       import type { BuildSpec, ArchetypeSlug } from '@zearch/shared';
       import { chatCompletionWithTools, type LoopMessage, type ToolCall } from '../llm/client.js';
       import { getTool, toOpenAIToolSchemas } from '../tools/index.js';
       import { ARCHITECT_SYSTEM_PROMPT, buildArchitectUserMessage } from '../prompts/architect.js'; // ← B2 seam
     Loop (bounded): seed messages [system=ARCHITECT_SYSTEM_PROMPT, user=buildArchitectUserMessage(query)];
     up to MAX_ITERATIONS=8 turns, each guarded by a WALL_CLOCK_MS=90_000 deadline. Per turn call
     chatCompletionWithTools({messages, tools: toOpenAIToolSchemas(), tier:'strong'}); then:
       • if a tool_call named 'emit_build_spec' is present → parse+normalize its args → return that
         BuildSpec (grounded path);
       • else if NO tool_calls → break (degrade);
       • else append the assistant turn, then answer EVERY tool_call with a role:'tool' message
         carrying the matching tool_call_id (content = result of getTool(name).execute(JSON.parse(args))).
     Helpers: `runToolCall(call)` (never-throws: unknown tool / bad-JSON args → a clear string, else
     `(await tool.execute(args)).content`); `specFromEmitArgs(raw, query)` (defensive parse + clamp into
     a valid BuildSpec, archetype validated against the 7-slug Set, missing fields filled from query/'');
     `ungroundedSpec(query)` (the fallback: archetype:'concept', title:query, sensible designDirection/
     presentation, facts:[], images:[]). Wrap the whole loop in try/catch; on any break/throw return
     `ungroundedSpec(query)`. Signature stays lean: `runArchitect(query: string, opts?: { provider?: string }): Promise<BuildSpec>`
     (matches classifyQuery; Phase E can derive "grounded" from `spec.facts.length > 0`).
- ACCEPTANCE:
  - `npm run typecheck` green (needs prompts/architect.ts to exist — see ORDERING note below).
  - Grounded path (real keys, LLM_PROVIDER=openai in repo-root .env): throwaway
    `npx tsx -e "import('./apps/orchestrator/src/pipeline/architect.js').then(m=>m.runArchitect('Napoleon Bonaparte')).then(s=>console.log(JSON.stringify(s,null,2)))"`
    → a BuildSpec with archetype:'person', non-empty title, populated facts[] with source URLs,
    ideally images[]; process exits without throwing.
  - Degraded path (OPENAI_API_KEY unset): same command logs `[architect] LLM call failed…` and
    returns the ungrounded BuildSpec (archetype:'concept', facts:[], images:[]), exit 0, no throw.
  - No regression: chatCompletion(), pipeline/index.ts, routes/* unchanged; /api/generate still works.
- NOTES:
  - Tool-call `arguments` is a JSON STRING → JSON.parse guarded everywhere; bad JSON degrades, never throws.
  - EVERY tool_call in an assistant turn MUST be answered with a role:'tool' message (matching
    tool_call_id) before the next model turn, or OpenAI 400s. Append the assistant message first,
    then one tool message per call, in order.
  - Tradeoff acknowledged: registering emit_build_spec means it shows up in toOpenAIToolSchemas()
    for any future registry consumer. Acceptable (inert) and keeps "adding a tool is one file"
    (A1's principle). Alternative — a local schema const concatenated onto toOpenAIToolSchemas()
    inside architect.ts — avoids that but duplicates the schema pattern. Go with the registry route.
  - B2 SEAM: the only B2-owned surface B1 imports is `ARCHITECT_SYSTEM_PROMPT` +
    `buildArchitectUserMessage(query)` from `prompts/architect.js`.

### B2 — Architect system prompt  (the design-reasoning brain)
- SCOPE — CREATE `apps/orchestrator/src/prompts/architect.ts` (TOP-LEVEL prompts/, not archetypes/ —
  the Architect sits ABOVE the archetype taxonomy; archetypes/ is the Builder's render layer). Exports:
    import type { ArchetypeSlug } from '@zearch/shared';
    import { ARCHETYPES } from './archetypes/index.js';        // derive the slug enumeration from its keys (drift-safe)
    export const ARCHITECT_SYSTEM_PROMPT: string;
    export function buildArchitectUserMessage(query: string): string;  // mirrors buildClassifyUserMessage
  The prompt's sections (draft prose lives in the per-task subagent notes; key load-bearing parts):
    (a) Role/identity — "You are the Architect of ZEARCH… you do NOT write HTML; you decide the page's
        shape, research it with tools, and emit a BuildSpec a downstream Builder renders."
    (b) Decision process — classify into exactly one of the 7 archetypes, then decide designDirection
        (layout/sections/tone) + presentation (concrete visuals: timeline, map, table, chart, calculator
        inputs). Echo idea.md's Napoleon exemplar as the quality bar.
    (c) Research discipline (mirror QUALITY_BAR) — ground facts in tool results WITH source URLs; never
        invent stats/quotes/citations; mark approximations. When/why to call each tool: web_search
        (general/up-to-date facts + sources, primary), wikipedia_summary (known title — pass the title,
        not a sentence), image_search (license-safe Wikimedia images — only images from this tool go in
        the spec). Tools returning ok:false are a normal signal, not a crash — retry differently or degrade.
    (d) Loop guidance — a few TARGETED tool calls (typically 2–5), read each result, don't loop forever
        or re-search; once you have enough, STOP and emit the spec as the FINAL step.
    (e) BuildSpec output contract — explain EVERY field (archetype ∈ the 7 slugs; title concise, no
        punctuation; designDirection; presentation; facts:{text,source}; images:{url,alt,credit,license};
        liveEndpoint OMITTED unless genuinely live data — Phase D; snapshot only with a liveEndpoint).
        Cross-check the field list against packages/shared/index.ts BuildSpec.
    (f) Archetype routing rules — reuse classify.ts's ordered rules + the 7 one-line descriptions
        VERBATIM, plus 3–4 few-shot routing examples (Napoleon→person, React vs Vue→comparison,
        compound interest calculator→tool, World population trends→data) that also show research intent.
    (g) Emission directive — instruct: "When research is done, call emit_build_spec exactly once with
        the complete BuildSpec; that call ends your work; produce no prose." (Settled per SHARED DESIGN
        DECISION above. Keep it as a named const so swapping to a final-JSON variant later is one line.)
- ACCEPTANCE:
  - `npm run typecheck` green; the module imports (`ArchetypeSlug` via import type; `ARCHETYPES`
    value import resolves with `.js`).
  - ARCHITECT_SYSTEM_PROMPT is a non-empty string; buildArchitectUserMessage("Napoleon Bonaparte")
    embeds the query.
  - The 7 slugs in the prompt are byte-identical to ARCHETYPES keys (guaranteed if derived from
    Object.keys(ARCHETYPES)).
  - Qualitative read confirms the prompt instructs: archetype choice (7), design+presentation, when
    to call each tool, bounded research-then-emit, and a BuildSpec covering EVERY field; and contains
    NO CDN/HTML/#root/window.Recharts text (that's the Builder's boundary).
  - Real proof is the Napoleon run via B1's runArchitect — pair B2's sign-off with that run.
- NOTES:
  - Derive the slug enumeration line from Object.keys(ARCHETYPES); lift the human routing descriptions
    verbatim from CLASSIFY_SYSTEM_PROMPT so routing language never drifts from the (retiring-but-canonical)
    classifier.
  - This prompt is the MAIN lever for spec quality (PLAN.md §7 risk #4 "Architect misroute / spec
    quality") — the Builder's repair loop catches broken RENDERS, not bad DESIGN decisions. Make the
    routing few-shots and the "facts WITH sources, never fabricate" language the strongest prose in the file.
  - Tell the model to OMIT liveEndpoint/snapshot for the common static query (Phase-D feature only).
  - Do NOT re-export from prompts/index.ts or wire the pipeline — that's Phase E.

────────────────────────────────────────────────────────
TASK ORDERING NOTE (B1 ⇄ B2 seam)
────────────────────────────────────────────────────────
B2 deps B1 in TASKS.md, but B1's runArchitect imports ARCHITECT_SYSTEM_PROMPT + buildArchitectUserMessage
from prompts/architect.js — so B1 cannot typecheck without that file. Resolve it cleanly:
  • In B1, FIRST create a MINIMAL placeholder prompts/architect.ts (a short stub ARCHITECT_SYSTEM_PROMPT
    string that says "research the query then call emit_build_spec" + `buildArchitectUserMessage = q =>
    \`Query: "${q}"\``). This lets B1 compile and run the Napoleon smoke test.
  • In B2, REPLACE that stub with the full design-reasoning prompt. The file path/exports stay identical,
    so B1's import is unchanged.
Treat B1's placeholder as scaffolding, not the deliverable — B2 owns the real prompt.

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
When B1 + B2 are both done: update .agent/STATE.md (Phase B ✅, Phase C is next — the Builder:
runBuilder(spec) → html composing the render contract + BuildSpec, plus the validate/repair loop),
summarize the whole phase's changes, and stop. Do NOT commit.

────────────────────────────────────────────────────────
⚠ RUNNING LOW ON CONTEXT — HANDOFF PROTOCOL (do this BEFORE you run out)
────────────────────────────────────────────────────────
If your remaining context is getting tight (roughly <20% left, or a compaction feels near) and the
phase is NOT finished, STOP starting new work and hand off cleanly:

  1. Finish only the current in-flight edit to a compiling state; run npm run typecheck. If it
     can't be made green quickly, revert the half-done edit so the tree is clean.
  2. Update .agent/STATE.md: which of B1/B2 are DONE, which is IN-PROGRESS (and exactly how far),
     which is still TODO. Note the branch (feature/agentic-core-phase-b) and typecheck status.
  3. Update .agent/handoff.md (Goal, Current State, Files Being Edited, What We Tried That Failed,
     Next Step) for this phase's progress.
  4. Print a CONTINUATION PROMPT (fenced) I can paste verbatim into a fresh session. It MUST:
       - say "Resuming phase PB; tasks {done} are done, continue from {next_task_id}"
       - point at .agent/implementations/implementation_PB.md as the full plan
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
