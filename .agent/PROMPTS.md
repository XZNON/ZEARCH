# ZEARCH — Session bootstrap prompt

Paste the block below into a new agent session. The agent will read the project,
identify the **current phase** from `.agent/TASKS.md`, and write a single self-contained
`.agent/implementations/implementation_{phase_id}.md` that plans **every todo task in that
phase** (in dependency order) as one copy-paste working-session prompt.

That working-session prompt has a built-in **context handoff**: if the session runs low on
context before the phase is finished, the agent stops cleanly, updates `STATE.md` +
`.agent/handoff.md`, and prints a ready-to-paste **continuation prompt** so a fresh session
resumes exactly where it left off.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH — an informational interactive search engine that turns
natural-language queries into live, self-contained interactive web pages.
I am the sole developer. Before writing ANY code, follow the steps below exactly.

────────────────────────────────────────────────────────
SESSION START (read first, summarize back in <=8 lines, then STOP for my "go")
────────────────────────────────────────────────────────
Read these files in order:
  CLAUDE.md, PLAN.md, docs/idea.md, .agent/TASKS.md, .agent/STATE.md

Summarize:
  (a) The current phase (id + title) and EVERY todo/in-progress task in it (id + title), in
      dependency order
  (b) For each task: what it changes and which files it touches
  (c) The load-bearing constraint in apps/orchestrator/src/prompts/shared.ts
  (d) The typecheck command and whether it currently passes

Run: npm run typecheck
Confirm it is green. Do NOT write any code until I say "go".

────────────────────────────────────────────────────────
YOUR ONLY JOB THIS SESSION
────────────────────────────────────────────────────────
After I say "go", generate ONE file called:
  .agent/implementations/implementation_{phase_id}.md
(replace {phase_id} with the actual phase id, e.g. implementation_P2.md)

The file must be a single self-contained copy-paste prompt — following the structure below —
that plans the ENTIRE current phase: all of its todo tasks, sequenced by dependency, as one
working session that can also hand off to a fresh session if it runs out of context.
Do NOT implement any task. Only produce the implementation file.

PLAN THE PHASE IN PARALLEL WITH SUBAGENTS:
Do not research every task yourself, serially. Fan out instead:
  - Spawn ONE subagent per task in the phase, in parallel (use the Plan subagent; use Explore
    if a task mainly needs code discovery). Give each subagent ONLY its task: the task id +
    title, the files it likely touches, and the acceptance criteria from .agent/TASKS.md.
  - Each subagent returns a scoped plan for its single task: exact files to edit, what changes
    in each, the concrete acceptance check, and any gotchas/snippets it found.
  - Subagents start COLD (they don't inherit this session's context), so spell out the file
    paths and constraints they need — including that the CDN block in
    apps/orchestrator/src/prompts/shared.ts is load-bearing where relevant.
  - Subagents are READ-ONLY for this job: they return plans, they do NOT edit code or files.
  - Then YOU stitch their returned plans into the single implementation_{phase_id}.md below,
    reconciling cross-task dependencies and ordering. You own the final file; the subagents
    only draft their own task's block.
Because all tasks belong to the not-yet-started current phase, this parallel planning has no
drift risk — nothing is being implemented while they plan.

────────────────────────────────────────────────────────
REQUIRED STRUCTURE of .agent/implementations/implementation_{phase_id}.md
────────────────────────────────────────────────────────

# Session prompt — ZEARCH · {phase_id} ({phase_title})

> One self-contained, copy-paste prompt covering the WHOLE phase.
> Phase: **{phase_id}** in `.agent/TASKS.md`. Tasks: {list ids}. Generated: {today's date}.

---

## Copy-paste this into your agent

\`\`\`
You are my coding agent for ZEARCH. We are working through ALL of phase {phase_id}:
{phase_title}. The phase has these tasks, to be done in this order:
  {task_id} — {task_title}
  {task_id} — {task_title}
  ... (every todo task in the phase, dependency-ordered)

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
    git checkout -b feature/{phase_branch_name}
- Do ONE task at a time, in dependency order. Finish + verify a task before starting the next.
- After finishing each task: mark it done in .agent/TASKS.md and pause for my review before
  starting the next task.
- {any phase-wide constraint — e.g. CDN block in shared.ts is load-bearing, byte-for-byte}

────────────────────────────────────────────────────────
PER-TASK PLAN (one block per task in the phase)
────────────────────────────────────────────────────────
### {task_id} — {task_title}
- SCOPE: exact files to edit + what changes in each.
- ACCEPTANCE: the concrete check that proves it works (typecheck + task-specific).
- NOTES: relevant existing code snippets / gotchas.

(repeat for every task in the phase, in order)

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
       - say "Resuming phase {phase_id}; tasks {done} are done, continue from {next_task_id}"
       - point at .agent/implementations/implementation_{phase_id}.md as the full plan
       - repeat the SESSION START reads + `npm run typecheck` gate + GUARDRAILS above
       - repeat this same HANDOFF PROTOCOL so the next session can hand off again
  5. Stop. Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; don't run past them silently
────────────────────────────────────────────────────────
A) After session-start reads + typecheck green → phase plan summary, wait for "go".
B) After each task's implementation → show diff / key changes, wait for my review.
C) After each task's typecheck passes → show output + file list before marking it done.
D) Before starting each next task → confirm the previous one is done and reviewed.
\`\`\`
```
