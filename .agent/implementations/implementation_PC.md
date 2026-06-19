# Session prompt — ZEARCH · PC (Builder: BuildSpec → HTML)

> One self-contained, copy-paste prompt covering the WHOLE phase.
> Phase: **PC** (Agentic Core — Builder) in `.agent/TASKS.md`. Tasks: C1, C2. Generated: 2026-06-19.

Phase C builds the **Builder**: `runBuilder(spec: BuildSpec) → html`. The Architect (Phase B)
already exists and produces a grounded `BuildSpec`; the Builder turns that spec into a
self-contained `index.html` using the existing render contract (`hard-requirements.ts` + per-archetype
prompt templates) with a validate/repair loop. **Phase C is still additive** — nothing is wired
into the live pipeline yet; that cutover is Phase E.

C1 and C2 are tightly coupled and live in ONE new file (`pipeline/builder.ts`). C2 (the
validate/repair loop) is embedded inside `runBuilder` — not a separate module. C1 establishes the
function and message construction; C2 is the retry loop within it.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working through ALL of phase PC: Agentic Core —
Builder (BuildSpec → HTML). The phase has these tasks, to be done in this order:
  C1 — runBuilder(spec: BuildSpec) → html: compose render contract + BuildSpec into messages,
       single strong LLM call, extract HTML.
  C2 — Validate + repair loop: embed validateAppHTML + retry (MAX_ATTEMPTS=3) with corrective
       feedback inside runBuilder so broken pages never leave the function.

C1 and C2 live in the SAME file. Do them together as one unit of work.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=6 lines, STOP for "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, PLAN.md, .agent/TASKS.md, .agent/STATE.md
Run:  npm run typecheck   ← must be green before any code change
Tell me: the task list for this phase, which is first, and your plan for it.
Do NOT write code until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. The user commits everything personally.
- npm run typecheck must be green before you declare ANY task done.
- Create one feature branch for the phase before changes:
    git checkout -b feature/agentic-core-phase-c
- Do ONE task block (C1+C2 together) and finish + verify before declaring done.
- After finishing: mark C1 and C2 done in .agent/TASKS.md and pause for review.
- ADDITIVE ONLY: do NOT touch pipeline/index.ts, routes/generate.ts, or any live-pipeline file.
  The Builder is callable but not called by anything in production yet.
- The CDN block in apps/orchestrator/src/prompts/archetypes/hard-requirements.ts is
  load-bearing (byte-for-byte). composeSystemPrompt() already includes it — do not copy or
  restate it anywhere in builder.ts.

────────────────────────────────────────────────────────
PER-TASK PLAN
────────────────────────────────────────────────────────

### C1 + C2 — runBuilder(spec: BuildSpec) → html  (with embedded validate/repair loop)

**SCOPE — one new file to create:**
  apps/orchestrator/src/pipeline/builder.ts

No other files are changed. The builder.ts file contains two private helpers and one export.

---

**IMPORTS (all .js extensions — NodeNext)**

```ts
import type { BuildSpec } from '@zearch/shared';
import { chatCompletion } from '../llm/client.js';
import { composeSystemPrompt } from '../prompts/archetypes/index.js';
import { extractHTML } from '../lib/html.js';
import { validateAppHTML } from '../lib/validate.js';
import { createLogger } from '../lib/logger.js';
```

Note: `BuildSpec` is `import type` — it is a zero-runtime types-only import, same as in
`pipeline/architect.ts`. No `.js` extension on package imports, only on relative file imports.

---

**CONSTANTS**

```ts
const log = createLogger('builder');
const MAX_ATTEMPTS = 3;
```

Mirror generate.ts exactly. Do not deviate.

---

**PRIVATE HELPER 1: `buildUserMessage(spec: BuildSpec): string`**

Constructs the grounded-content user turn. Structure (render this as a template string):

```
Build a page for: "<spec.title>"

ARCHETYPE: <spec.archetype>

DESIGN DIRECTION:
<spec.designDirection>

PRESENTATION PLAN:
<spec.presentation>

GROUNDED FACTS (<N> facts — embed ALL of them verbatim; cite sources inline where provided):
<numbered list: "1. <fact.text> [Source: <fact.source>]" — omit "[Source: ...]" if fact.source is undefined>

(If spec.facts is empty, emit instead: "No grounded facts provided — use your best established knowledge.")

<If spec.images.length > 0, append:>
IMAGES — these are pre-researched real URLs; you MAY use them as <img> src directly:
<numbered list: "1. URL: <img.url> | Alt: <img.alt ?? ''> | Credit: <img.credit ?? ''>">

Return only the HTML file.
```

Key rules for this helper:
- Facts numbered, one per line, source inlined in square brackets. "Embed ALL of them verbatim"
  is essential — without it the model will paraphrase or sample.
- Empty facts path must be an explicit note, not silence. Silence misleads the model into thinking
  facts were accidentally omitted.
- Images section OMITTED ENTIRELY when spec.images is empty. Never emit "IMAGES (0 images)"
  with no entries — models hallucinate placeholder <img> tags when they see an empty list header.
- Images section MUST include the override phrase "pre-researched real URLs; you MAY use them as
  <img> src directly" — HARD_REQUIREMENTS (already in the system prompt via composeSystemPrompt)
  says "Image references, if any, must be inline SVG or data-URIs — never hotlinked external images."
  Without this explicit override the model will ignore the grounded images entirely.
- spec.liveEndpoint and spec.snapshot: silently ignored in C1. Do not reference them in the
  user message. They are Phase D concerns.

---

**EXPORTED FUNCTION: `runBuilder({ spec, provider? }): Promise<string>`**

Full signature:
```ts
export async function runBuilder(
  { spec, provider }: { spec: BuildSpec; provider?: string },
): Promise<string>
```

Implementation — mirror pipeline/generate.ts's generateAppHTML() exactly:

```ts
const system = composeSystemPrompt(spec.archetype);
const baseUser = buildUserMessage(spec);

let lastHtml = '';
let correction = '';

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const text = await chatCompletion({
    provider,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: baseUser + correction },
    ],
  });
  const html = extractHTML(text);

  const result = validateAppHTML(html);
  if (result.ok) {
    if (attempt > 1) log(`recovered on attempt ${attempt}/${MAX_ATTEMPTS}`);
    return html;
  }

  lastHtml = html;
  log(`attempt ${attempt}/${MAX_ATTEMPTS} invalid: ${result.reason}`);
  correction =
    `\n\nYOUR PREVIOUS OUTPUT WAS REJECTED because ${result.reason}. ` +
    'Return a COMPLETE, corrected HTML file. ' +
    'IMPORTANT: you must preserve ALL of the grounded facts, images, and design direction from the BuildSpec above — ' +
    'do NOT strip or simplify the content while fixing the error. ' +
    'Structural rules: all JSX inside a top-level `function App() { ... }`, ' +
    'no bare top-level `return`, and mount with ' +
    '`ReactDOM.createRoot(document.getElementById("root")).render(<App />);` as the last line of the babel script.';
}

log(`all ${MAX_ATTEMPTS} attempts failed validation — shipping last attempt`);
return lastHtml;
```

The correction message differs from generate.ts's in ONE meaningful way: it adds
"preserve ALL of the grounded facts, images, and design direction from the BuildSpec above —
do NOT strip or simplify the content while fixing the error." This prevents the model from
emitting a stripped-down but syntactically valid page on retry.

CONTRACT: runBuilder NEVER throws. A chatCompletion failure propagates up (the route handler
catches it). All-attempts validation failure returns lastHtml (same as generateAppHTML).

---

**TYPE ALIGNMENT GOTCHA**

`composeSystemPrompt` accepts `Archetype` (from `prompts/archetypes/index.ts`).
`spec.archetype` is typed as `ArchetypeSlug` (from `@zearch/shared`).
Both are structurally identical string literal unions of the same 7 values. TypeScript accepts
this without a cast. If the typechecker complains, add `as Archetype` — but it should not.

---

**ACCEPTANCE: C1 + C2**

1. `npm run typecheck` green (zero errors, zero new warnings).
2. Manual smoke test — create a one-off scratch script (not committed):

```ts
// scratch-builder.ts (delete after test)
import { runBuilder } from './apps/orchestrator/src/pipeline/builder.js';
import { validateAppHTML } from './apps/orchestrator/src/lib/validate.js';

const spec = {
  archetype: 'person' as const,
  title: 'Ada Lovelace',
  designDirection: 'Clean editorial biography: hero, key dates timeline, contributions section.',
  presentation: 'Hero banner, vertical timeline, two-column fact cards, footer note.',
  facts: [
    { text: 'Born 10 December 1815 in London, England.', source: 'https://en.wikipedia.org/wiki/Ada_Lovelace' },
    { text: 'Wrote the first algorithm intended to be processed by a machine.', source: 'https://en.wikipedia.org/wiki/Ada_Lovelace' },
    { text: 'Collaborated with Charles Babbage on the Analytical Engine.', source: 'https://en.wikipedia.org/wiki/Ada_Lovelace' },
  ],
  images: [],
};

const html = await runBuilder({ spec });
const validation = validateAppHTML(html);
console.log('valid:', validation.ok, validation.reason ?? '');
console.log('contains title:', html.includes('Ada Lovelace'));
console.log('html length:', html.length);
```

Run with: `npx tsx scratch-builder.ts` from the repo root (needs `OPENAI_API_KEY` set in `.env`).
Expected: `valid: true`, `contains title: true`, html length >2000.

3. Ungrounded path smoke test — same script but with `facts: []`. Should still produce valid HTML
   containing "Ada Lovelace" (the title and design direction still guide generation).

────────────────────────────────────────────────────────
DEFINITION OF DONE
────────────────────────────────────────────────────────
- npm run typecheck green (show output).
- Manual smoke test passed (show: valid:true + title found + html length).
- .agent/TASKS.md updated: C1 and C2 both marked done.
- List every file changed (path + one-line reason).
- Do NOT commit. Pause for review.

────────────────────────────────────────────────────────
PHASE COMPLETE
────────────────────────────────────────────────────────
When C1 and C2 are done: update .agent/STATE.md (Phase C ✅, what's next = Phase D or E),
summarize the whole phase's changes, and stop. Do NOT commit.

────────────────────────────────────────────────────────
⚠ RUNNING LOW ON CONTEXT — HANDOFF PROTOCOL
────────────────────────────────────────────────────────
If your remaining context is getting tight (<20% left) and the phase is NOT finished, STOP and
hand off cleanly:

  1. Finish only the current in-flight edit to a compiling state; run npm run typecheck.
     If it can't be made green quickly, revert the half-done edit so the tree is clean.
  2. Update .agent/STATE.md: which tasks are DONE, which is IN-PROGRESS (and exactly how far),
     which are still TODO. Note the branch name and typecheck status.
  3. Update .agent/handoff.md (Goal, Current State, Files Being Edited, What We Tried That
     Failed, Next Step) so it reflects this phase's progress.
  4. Print a CONTINUATION PROMPT (in a fenced code block) that can be pasted verbatim into a
     new session. It MUST:
       - say "Resuming phase PC; tasks {done} are done, continue from {next_task_id}"
       - point at .agent/implementations/implementation_PC.md as the full plan
       - repeat the SESSION START reads + npm run typecheck gate + GUARDRAILS above
       - repeat this same HANDOFF PROTOCOL
  5. Stop. Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each
────────────────────────────────────────────────────────
A) After session-start reads + typecheck green → phase plan summary, wait for "go".
B) After builder.ts is written → show the full file contents before running typecheck.
C) After typecheck passes → show output + smoke test results before marking tasks done.
D) Before declaring phase complete → confirm C1 and C2 are both checked off in TASKS.md.
```
