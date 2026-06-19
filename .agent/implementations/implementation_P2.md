# Session prompt — ZEARCH · P2 (Archetype routing)

> One self-contained, copy-paste prompt covering the WHOLE phase.
> Phase: **Phase 2 — Archetype routing** in `.agent/TASKS.md`. Tasks: **P2-4, P2-1, P2-3** (P2-2 already done). Generated: 2026-06-10.
> Planned in parallel by two `Plan` subagents (classifier+pipeline; model tiers), stitched here.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working through the remaining tasks of phase 2:
Archetype routing. P2-2 (the prebuilt prompt system under prompts/archetypes/) is already
DONE. The phase's remaining tasks, to be done in THIS order (note: not numeric order —
P2-4 lands first because the classifier in P2-1 needs its cheap model tier):

  P2-4 — Add cheap/strong model tiers (cheap model for classify, strong for generate)
  P2-1 — Finish the Stage A classifier (query → ClassifyResult via a cheap LLM call)
  P2-3 — Wire pipeline/index.ts: classify → composeSystemPrompt(archetype) → generate,
         keeping the flat SYSTEM_PROMPT as a cutover fallback

Work ONE task at a time, in the order above. Check in at the checkpoints. Follow every rule.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=6 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/TASKS.md, docs/idea.md, .agent/STATE.md
Also read the files named in each task's SCOPE below before touching them.
Run:  npm run typecheck   ← must be green before any code change
Tell me: the three tasks, that P2-4 is first, and your plan for P2-4.
Do NOT write code until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- npm run typecheck (from repo root) must be green before you declare ANY task done.
- Create one feature branch for the phase before changes:
    git checkout -b feature/phase-2-archetype-routing
- Do ONE task at a time, in the P2-4 → P2-1 → P2-3 order. Finish + verify a task before
  starting the next. After each task: mark it done in .agent/TASKS.md and pause for review.
- LOAD-BEARING, DO NOT TOUCH: the CDN block / render contract in
  apps/orchestrator/src/prompts/shared.ts and apps/orchestrator/src/prompts/archetypes/
  hard-requirements.ts. No edits to these files in this phase.
- ESM / NodeNext: all imports use .js extensions even for .ts files; use `import type` for
  type-only imports.
- No tests exist; typecheck is the only static gate. Verify behavior by reasoning + manual run.

────────────────────────────────────────────────────────
PER-TASK PLAN
────────────────────────────────────────────────────────

### P2-4 — Cheap/strong model tiers   (do FIRST)
Thread a `tier: 'cheap' | 'strong'` through the LLM layer. A "provider" stays one base URL +
one credential; only model / maxTokens / extraBody swap per tier. Default tier is 'strong'
everywhere, so generation is byte-for-byte unchanged and nothing regresses.

- SCOPE:
  - `apps/orchestrator/src/llm/providers.ts`
      • Add `export type ModelTier = 'cheap' | 'strong';`
      • Change `type ProviderFactory = (tier: ModelTier) => LLMProvider;`
      • In each factory, branch model + maxTokens (+ extraBody) on tier. The `LLMProvider`
        interface stays unchanged — the factory returns the already-resolved fields, so
        client.ts keeps reading llm.model / llm.maxTokens / llm.extraBody untouched.
        - groq strong (unchanged): model GROQ_MODEL||'openai/gpt-oss-120b',
          maxTokens posInt(GROQ_MAX_TOKENS,7000), extraBody { reasoning_effort:
          GROQ_REASONING_EFFORT||'low' }.
        - groq cheap: model GROQ_CLASSIFY_MODEL||'llama-3.1-8b-instant',
          maxTokens posInt(GROQ_CLASSIFY_MAX_TOKENS,512), extraBody { reasoning_effort:
          GROQ_CLASSIFY_REASONING_EFFORT||'low' }.
        - openai strong (unchanged): model OPENAI_MODEL||'gpt-4o-mini',
          maxTokens posInt(OPENAI_MAX_TOKENS,16000), extraBody {}.
        - openai cheap: model OPENAI_CLASSIFY_MODEL||'gpt-4o-mini',
          maxTokens posInt(OPENAI_CLASSIFY_MAX_TOKENS,512), extraBody {}.
      • `resolveProvider(name = process.env.LLM_PROVIDER||'groq', tier: ModelTier = 'strong')`
        — forward `tier` into `factory(tier)`. Default 'strong' keeps zero-arg callers working.
  - `apps/orchestrator/src/llm/client.ts`
      • `import { resolveProvider, type ModelTier } from './providers.js';`
      • `chatCompletion({ messages, provider, tier = 'strong' }: { messages: ChatMessage[];
        provider?: string; tier?: ModelTier })` → `resolveProvider(provider, tier)`.
        Request-body construction is unchanged (it already spreads model/maxTokens/extraBody).
  - `apps/orchestrator/src/pipeline/generate.ts` — no functional change (omitting tier =
    'strong'). Leave it implicit to keep the diff minimal.
- ACCEPTANCE:
  - typecheck green; `ModelTier` exported/imported as a type; .js extensions preserved.
  - `chatCompletion({messages, provider})` with no tier builds the SAME request body as today
    (strong model + budget) → generation unchanged.
  - `chatCompletion({messages, tier:'cheap'})` resolves the cheap model with
    max_completion_tokens ≈ 512.
  - Env override works: GROQ_CLASSIFY_MODEL / *_MAX_TOKENS (and OpenAI equivalents) change the
    cheap tier only; GROQ_MODEL / GROQ_MAX_TOKENS change the strong tier only (no crossover).
  - `resolveProvider()` (zero-arg, used at boot in index.ts) still returns the strong provider.
- NOTES:
  - config.ts does NOT change — provider env is read inside providers.ts (config.ts only holds
    PORT/PUBLIC_BASE/APPS_DIR). Use the existing `posInt` helper for the new numeric envs.
  - Cheap tier deliberately reuses the active provider's base URL + key (Groq: same key, swap
    gpt-oss-120b → llama-3.1-8b-instant). Don't put cheap fields on the LLMProvider interface —
    resolve per tier inside the factory so client.ts stays tier-ignorant.
  - Forward-compatible with cross-provider classify later: a caller can pass a different
    `provider` alongside `tier:'cheap'` with no rework. Do NOT build that now.
  - Optional, low value: extend index.ts boot log to show strong + cheap models; guard so a
    cheap-tier resolve error can't break boot. Skip unless trivial.
  - New env vars to also add to the repo-root `.env` (so they're documented/overridable):
    GROQ_CLASSIFY_MODEL, GROQ_CLASSIFY_MAX_TOKENS, GROQ_CLASSIFY_REASONING_EFFORT,
    OPENAI_CLASSIFY_MODEL, OPENAI_CLASSIFY_MAX_TOKENS. (Defaults above already work without
    them; adding them is for discoverability. `.env` is gitignored — KEY="value" form.)

### P2-1 — Finish the Stage A classifier   (do SECOND)
Add the LLM-call wiring for the prebuilt classifier prompt. Create Stage A as a sibling of
generate.ts. classifyQuery must NEVER throw — it always returns a valid ClassifyResult, falling
back to the 'concept' archetype on any failure (this is the archetype-level fallback).

- SCOPE:
  - NEW `apps/orchestrator/src/pipeline/classify.ts`:
      ```ts
      import { chatCompletion } from '../llm/client.js';
      import {
        CLASSIFY_SYSTEM_PROMPT, buildClassifyUserMessage, ARCHETYPES,
        type ClassifyResult,
      } from '../prompts/archetypes/index.js';
      import { createLogger } from '../lib/logger.js';

      export async function classifyQuery(
        query: string, opts?: { provider?: string },
      ): Promise<ClassifyResult>
      ```
      • Calls `chatCompletion({ provider: opts?.provider, tier: 'cheap',
        messages: [{role:'system',content:CLASSIFY_SYSTEM_PROMPT},
        {role:'user',content:buildClassifyUserMessage(query)}] })` inside a try.
      • Module-private helpers (do NOT export):
        - `parseClassifyJSON(raw): ClassifyResult | null` — trim; strip accidental ```` ```json ````
          / ```` ``` ```` fences (regex like lib/html.ts's `/```(?:json)?\s*\n([\s\S]*?)\n```/i`);
          second chance: slice outermost `{ … }` via indexOf('{')/lastIndexOf('}'); JSON.parse in
          try/catch; return null on any throw.
        - `isValidResult(obj): obj is ClassifyResult` — object; `archetype` is a string AND
          `archetype in ARCHETYPES` (the ONLY hard-fail trigger); coerce the rest defensively
          (default subjects to [query], clamp confidence to 0..1, title/brief to strings).
        - `fallbackResult(query): ClassifyResult` → `{ archetype:'concept', title:query,
          subjects:[query], brief:'', confidence:0 }` (confidence 0 so P2-3's floor also treats
          it as low-confidence).
      • Flow: HTTP error / empty completion → log + fallbackResult. parse null or invalid →
        log + fallbackResult. else return the normalized validated result.
- ACCEPTANCE:
  - typecheck green; classifyQuery returns Promise<ClassifyResult>; .js imports; `import type`
    for ClassifyResult.
  - Manual: classifyQuery('React vs Vue') → 'comparison'; ('Napoleon Bonaparte') → 'person';
    ('compound interest calculator') → 'tool'; ('how black holes work') → 'concept'.
  - Fault injection: non-JSON completion, `archetype:'banana'`, and a thrown HTTP error each
    yield `{archetype:'concept',confidence:0,…}` with NO exception escaping.
- NOTES:
  - prompts/ stays LLM-free (pure strings + types); the HTTP call belongs in pipeline/ next to
    generate.ts. That's why classify.ts is new rather than editing prompts/archetypes/classify.ts.
  - Don't over-reject in isValidResult — only an unknown archetype forces fallback; coerce
    everything else so good classifications aren't thrown away over a missing field.
  - tier:'cheap' (from P2-4) is what keeps the classify token budget tiny — this is why P2-4
    is sequenced first.
  - Leave classifyQuery pure data (no HTML concerns); Stage B grounding will later consume
    subjects/brief.

### P2-3 — Wire the pipeline (classify → compose → generate)   (do THIRD)
Turn pipeline/index.ts from a pure re-export into the A→C orchestrator. Add a system-prompt
override to generate.ts. Point /api/generate at the orchestrator. Keep /api/update on the flat
path. Two layered fallbacks: classifier-internal (→ 'concept') and a confidence floor in the
orchestrator (→ flat SYSTEM_PROMPT cutover).

- SCOPE:
  - `apps/orchestrator/src/pipeline/generate.ts` — add an optional systemPrompt override
    (backward compatible; default = flat SYSTEM_PROMPT):
      ```ts
      export async function generateAppHTML(
        { prompt, provider, systemPrompt }:
        { prompt: string; provider?: string; systemPrompt?: string },
      ): Promise<string> {
        const system = systemPrompt ?? SYSTEM_PROMPT;
        // messages use `system` instead of SYSTEM_PROMPT directly
      }
      ```
    Existing callers pass no systemPrompt → they get SYSTEM_PROMPT (the cutover path is the
    default). User-message build + extractHTML untouched.
  - `apps/orchestrator/src/pipeline/index.ts` — become the orchestrator; KEEP re-exporting
    generateAppHTML (so /api/update and others keep importing it unchanged):
      ```ts
      import { generateAppHTML } from './generate.js';
      import { classifyQuery } from './classify.js';
      import { composeSystemPrompt } from '../prompts/archetypes/index.js';
      import type { ClassifyResult } from '../prompts/archetypes/index.js';

      export { generateAppHTML } from './generate.js';

      const CONFIDENCE_FLOOR = 0.4; // below → distrust archetype, cut over to flat prompt

      export interface GenerateResult {
        html: string;
        classification: ClassifyResult | null; // null when flat-prompt fallback was used
      }

      export async function runGeneration(
        { prompt, provider }: { prompt: string; provider?: string },
      ): Promise<GenerateResult> {
        const c = await classifyQuery(prompt, { provider }); // never throws
        if (c.confidence >= CONFIDENCE_FLOOR) {
          const systemPrompt = composeSystemPrompt(c.archetype);
          // ← Stage B (grounding) will later slot in here, consuming c.subjects / c.brief.
          const html = await generateAppHTML({ prompt, provider, systemPrompt });
          return { html, classification: c };
        }
        const html = await generateAppHTML({ prompt, provider }); // → flat SYSTEM_PROMPT
        return { html, classification: null };
      }
      ```
  - `apps/orchestrator/src/routes/generate.ts` — `POST /api/generate` switches from
    `generateAppHTML({ prompt })` to `runGeneration({ prompt })`, reads `result.html`, keeps
    `sizeBytes`. Optionally add `archetype`/`title` from `result.classification` to the JSON
    response (UI can show the detected archetype). `POST /api/update` is UNCHANGED — it still
    calls the re-exported `generateAppHTML({ prompt: merged })`, which resolves to SYSTEM_PROMPT.
- WHICH FALLBACK WHEN (be explicit in comments):
  - classifier internal failure (HTTP/bad JSON/unknown archetype) → handled in classifyQuery →
    'concept', confidence 0 (archetype-level).
  - low confidence or that confidence-0 fallback → orchestrator CONFIDENCE_FLOOR gate → flat
    SYSTEM_PROMPT cutover, classification:null (the full safety net).
  - high-confidence valid → composeSystemPrompt(archetype). NOTE a genuine high-confidence
    'concept' still uses composeSystemPrompt('concept'); the flat cutover triggers ONLY on
    low-confidence/failure, not merely because archetype === 'concept'.
- ACCEPTANCE:
  - typecheck green; routes/generate.ts compiles against runGeneration; /api/update still
    compiles against the re-exported generateAppHTML.
  - 'React vs Vue' → high-confidence comparison → generated with the comparison system prompt
    (log the chosen archetype to confirm).
  - Classifier forced to fail → runGeneration returns valid HTML from SYSTEM_PROMPT,
    classification:null, request still 200 (no 500).
  - shared.ts + hard-requirements.ts byte-for-byte unchanged.
- NOTES:
  - Recommendation: /api/update does NOT re-classify — it edits existing HTML, so re-routing a
    diff instruction ("make the chart blue") would mis-route and risk swapping the contract
    mid-conversation. Keep it on the flat prompt.
  - CONFIDENCE_FLOOR is the single tuning knob; a named const is fine (env-source later if wanted).
  - runGeneration is the only orchestration point (matches the documented A→B→C seam);
    generate.ts stays a dumb Stage-C generator parameterized by one system prompt.

────────────────────────────────────────────────────────
DEFINITION OF DONE (per task)
────────────────────────────────────────────────────────
- npm run typecheck green (show output).
- Task-specific acceptance check passes (show evidence / reasoning; run a manual query where
  the task warrants it).
- .agent/TASKS.md updated: that task marked done (and P2-1 moved from in-progress → done).
- List every file changed (path + one-line reason).
- Do NOT commit. Pause for my review.

────────────────────────────────────────────────────────
PHASE COMPLETE
────────────────────────────────────────────────────────
When P2-4, P2-1, P2-3 are all done: update .agent/STATE.md (Phase 2 ✅; note the live pipeline
now classifies + composes per-archetype prompts with a flat-prompt cutover; next is Phase 3 —
Grounding, which slots into the marked seam in runGeneration). Summarize the whole phase's
changes. Do NOT commit.

────────────────────────────────────────────────────────
⚠ RUNNING LOW ON CONTEXT — HANDOFF PROTOCOL (do this BEFORE you run out)
────────────────────────────────────────────────────────
If your remaining context is getting tight (~<20% left, or a compaction feels near) and the
phase is NOT finished, STOP starting new work and hand off cleanly:
  1. Finish only the current in-flight edit to a compiling state; run npm run typecheck. If it
     can't be made green quickly, revert the half-done edit so the tree is clean.
  2. Update .agent/STATE.md: which of P2-4/P2-1/P2-3 are DONE, which is IN-PROGRESS (and exactly
     how far), which are TODO; note branch feature/phase-2-archetype-routing and typecheck status.
  3. Update .agent/handoff.md (Goal, Current State, Files Being Edited, What We Tried That
     Failed, Next Step) to reflect this phase's progress.
  4. Print a CONTINUATION PROMPT (in a fenced code block) I can paste verbatim into a brand-new
     session to resume. It MUST:
       - say "Resuming phase P2; tasks {done} are done, continue from {next task}"
       - point at .agent/implementations/implementation_P2.md as the full plan
       - repeat the SESSION START reads + `npm run typecheck` gate + GUARDRAILS above
       - repeat THIS handoff protocol so the next session can hand off again
  5. Stop. Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; don't run past them silently
────────────────────────────────────────────────────────
A) After session-start reads + typecheck green → phase plan summary, wait for "go".
B) After each task's implementation → show diff / key changes, wait for my review.
C) After each task's typecheck passes → show output + file list before marking it done.
D) Before starting each next task → confirm the previous one is done and reviewed.
```
