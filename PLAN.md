# ZEARCH — Build Plan (v1)

> Repo: **https://github.com/XZNON/ZEARCH** · Source of truth: `docs/idea.md`
> Work board: `.agent/TASKS.md` · Agent guide: `CLAUDE.md`
>
> **v1 reframes the product.** The v0 code was a _financial-calculator generator_; the actual
> product is **informational interactive search** — type a query, get a live, accurate,
> interactive web page that explains and lets you explore the topic (the "Napoleon" case).
> Calculators are demoted to one _archetype_ among many. This plan is **solo** (single
> developer): no module-ownership or git-worktree machinery — just a phased build order and a
> lightweight task board.

---

## 1. Product (from `docs/idea.md`)

A **new kind of search**. Instead of returning text, ZEARCH turns a natural-language query
into a **single self-contained interactive web page** that teaches and visualizes the topic:

```
query → Architect (tool-loop: plan + research + ground) → Build Spec → Builder (generate + repair) → store → serve live → refine
```

Promise: **understanding you can touch** — "Search gives answers. ZEARCH gives tools and
pages." Flagship proof: the **Napoleon test** — typing "Napoleon Bonaparte" yields a page with
a hero/portrait, life timeline, campaign map, battle cards, gallery, and legacy section, all
interactive, in ~15s. Pages are **ephemeral** by default (30-min idle teardown).

**Page archetypes** (each picks the page's shape): person · event/history · place/geography ·
concept/science · comparison · data/stats · tool/calculator. See `docs/idea.md` for the table.

---

## 2. Confirmed decisions

| #   | Decision                                                                                                                                                                                                                                | Note                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| D1  | **Pivot to informational interactive search**; calculators become one archetype                                                                                                                                                         | §1, `docs/idea.md`                        |
| D2  | **Output stays a single self-contained `index.html`** (React 18 + Tailwind + Recharts via CDN, Babel-in-browser)                                                                                                                        | no per-app build step; instant deploy     |
| D3  | **Native hosting in the orchestrator** — store HTML, serve at `/app/:id`; no Locus/containers/git-push                                                                                                                                  | already shipped                           |
| D4  | **LLM is provider-agnostic via the OpenAI-compatible API** (Groq today, `GROQ_MODEL` swappable; Claude/OpenAI later by base-URL swap)                                                                                                   | `generator.ts`                            |
| D5  | **Ground generations in real data** — fetch Wikipedia/Wikimedia summary + images and inject as context before generating                                                                                                                | reduces hallucination, gives real imagery |
| D6  | **Archetype routing** — detect intent, route to a specialized prompt template instead of one mega-prompt                                                                                                                                | §3                                        |
| D7  | **Solo project** — `.agent/TASKS.md` is a simple backlog; no ownership/worktrees/claim-protocol                                                                                                                                         | per scope decision                        |
| D8  | **Ephemeral by default** (30-min idle teardown); opt-in persistent/shareable links are a later phase                                                                                                                                    | `deployer.ts`                             |
| D9  | **npm workspaces monorepo** — `apps/*` + `packages/*` glob layout, `@zearch/*` scoped names; plain workspaces only, **Turborepo deferred** until ~6+ packages. _Supersedes the current "no root `package.json`" stance in `CLAUDE.md`._ | §5, Phase R                               |
| D10 | **One shared API contract** in `packages/shared`, imported by both apps — kills front/back type drift (the legacy `projectId`/`serviceId`/`deploymentId` aliasing)                                                                      | §5, Phase R                               |
| D11 | **Structure mirrors the pipeline** — orchestrator laid out as `pipeline/` + `prompts/` + `llm/` + `store/` (not generic MVC); the frontend monolith splits into `components/` + `hooks/` + `api/`                                       | §3, §5, Phase R                           |
| D12 | **Agentic build pipeline (re-architecture).** Replace the static `classify → ground → generate` with **Architect → Builder**: a tool-using LLM (the _Architect_) plans the page, researches it via a tool loop, and emits a structured **Build Spec**; the _Builder_ turns that spec into `index.html`. _Supersedes D5/D6's static framing; the archetype templates survive as the Builder's render contract._ | §3 |
| D13 | **Pluggable tool registry**; **Tavily** for web search + content extraction. Launch tools: Tavily (search+extract), `wikipedia_summary`, `image_search` (Wikimedia/Commons). Each tool is `{ name, description, parameters, execute }` and self-registers — adding tools later is one file. | §3 |
| D14 | **Live data via the generated page itself.** For live-data queries the Builder emits a page that fetches a public API **client-side through an orchestrator `/api/live` proxy** (CORS bypass + server-side key injection), with a build-time **snapshot baked in as fallback** if the live fetch fails. | §3 |
| D15 | **OpenAI is the LLM provider for all calls** (Architect tool loop + Builder generation). The free-Groq **TPM constraint no longer applies**; multi-turn tool loops are acceptable. _Supersedes D4's Groq-default/TPM framing._ | §4 |

---

## 3. Generation pipeline (the core of the product)

The whole product is the path from a query string to a correct, beautiful, interactive page.
The pipeline is an **agentic build** in two stages (D12): the Architect figures out *what to
build and gathers everything it needs*; the Builder *builds it*. Keeping the tool loop entirely
inside the Architect quarantines the agentic complexity and lets the Builder stay a focused,
deterministic HTML generator.

**Stage 1 — Architect (the tool loop).** Input: the raw query. A reasoning LLM with a **tool
registry** (D13) runs a multi-turn function-calling loop: it decides what kind of app this should
be, the design/presentation that fits, and what information is needed — then calls tools to
gather it (Tavily search+extract, `wikipedia_summary`, `image_search`). Output is **not HTML** —
it is a structured **Build Spec**: `{ intent/archetype, designDirection, presentation,
facts[] (+sources), images[], liveEndpoint?, snapshot? }`. The loop is bounded (max iterations,
timeout) and **degrades gracefully** to an ungrounded spec if tools fail. This stage absorbs the
old Stage-A classify.

**Stage 2 — Builder (Build Spec → HTML).** Compose the **render contract** (the load-bearing
`hard-requirements.ts` block: exact CDN URLs/order, `window.Recharts` destructure, `#root` mount)
with the Build Spec, and make one strong generation call. A **validate + repair loop** checks the
result (`#root`, required CDNs, parseable) and auto-retries so broken pages never reach the
iframe. Output: raw HTML via `extractHTML`.

**Live data (D14).** For live-data queries the Architect emits a `liveEndpoint` spec **and** a
build-time `snapshot`; the Builder writes a page that fetches the live API client-side **through
the orchestrator `/api/live` proxy** (CORS bypass + key injection) and falls back to the baked
snapshot if that fetch fails.

**Serve & refine.** Store (memory + disk), serve at `/app/:id`, iframe it. Follow-up prompts
regenerate from previous HTML + an update instruction (Builder-only, no new tool loop).

> The legacy single `SYSTEM_PROMPT` + the Phase 2 classify→compose path are **superseded** by this
> agentic core. The archetype templates / `hard-requirements.ts` are **kept** as the Builder's
> render contract; `pipeline/classify.ts` and the confidence cutover are retired at cutover (E1).

---

## 4. LLM "brain" (D4)

`generator.ts` talks to an **OpenAI-compatible `/chat/completions`** endpoint, so the provider
is config, not code:

| Knob     | Env var           | Default (OpenAI provider)                                        |
| -------- | ----------------- | ---------------------------------------------------------------- |
| Base URL | `OPENAI_BASE_URL` | `https://api.openai.com/v1`                                      |
| Model    | `OPENAI_MODEL`    | `gpt-4o-mini`                                                    |
| Key      | `OPENAI_API_KEY`  | _(required; server warns and `/api/generate` fails without it)_  |

**OpenAI for all calls (D15)** — both the Architect tool loop and the Builder generation. Groq is still a valid `LLM_PROVIDER=groq` option but is no longer the default or recommended path.

---

## 5. Repo layout (target — after Phase R)

npm workspaces monorepo. **`apps/*`** = things you run/deploy; **`packages/*`** = things you
import. The root `package.json` uses glob workspaces, so new packages auto-register with no
config edit. Folder structure mirrors the §3 pipeline ("screaming architecture"), not generic
MVC.

```
ZEARCH/
├── package.json                  # root: { private, workspaces: ["apps/*", "packages/*"] } — no Turborepo yet
├── apps/
│   ├── orchestrator/             # @zearch/orchestrator — Express API (ESM, TS via tsx) — port 8080
│   │   ├── src/
│   │   │   ├── index.ts          #   boot
│   │   │   ├── server.ts         #   express app + middleware wiring only
│   │   │   ├── config.ts         #   ALL env in one typed place (GROQ_*, PORT, PUBLIC_BASE, APPS_DIR)
│   │   │   ├── routes/           #   thin HTTP layer (generate · deploy · apps)
│   │   │   ├── pipeline/         #   ★ THE CORE — classify · ground · generate · index (A→B→C)
│   │   │   ├── llm/client.ts     #   provider-agnostic OpenAI-compatible brain (Groq today)
│   │   │   ├── prompts/          #   shared.ts (load-bearing CDN/Recharts block) + per-archetype templates
│   │   │   ├── store/            #   appStore.ts (memory + disk mirror) · lifecycle.ts (teardown timers)
│   │   │   ├── lib/              #   html.ts (extract/validate) · logger.ts
│   │   │   └── types.ts          #   app-internal types (API contract lives in @zearch/shared)
│   │   └── apps/<id>.html        #   on-disk mirror of generated pages (data; gitignored)
│   └── frontend/                 # @zearch/frontend — Vite + React 18 + Tailwind SPA — dev :5173, prod :8080
│       └── src/
│           ├── App.tsx           #   thin: wires hook → components
│           ├── hooks/useGeneration.ts  #   run/poll/update/teardown state machine
│           ├── api/client.ts     #   postJSON + endpoints
│           ├── components/       #   Header · Hero · PromptBox · Examples · BuildingCard · AppViewer · …
│           └── types.ts
├── packages/
│   └── shared/                   # @zearch/shared — the ONE API contract (DeployResult, GenerateResponse, …)
├── docs/idea.md                  # source of truth (the vision)
├── .agent/TASKS.md               # solo work board
├── assets/                       # README screenshots
├── PLAN.md  README.md  CLAUDE.md
```

**Discipline:** extract to `packages/` only when a _second_ consumer appears. `shared` qualifies
now (both apps need the contract); `llm`/`grounding`/`prompts` stay inside the orchestrator until
a second app (e.g. a future `apps/cli`) needs them.

---

## 6. Phased build order

- **Phase 0 — Planning (THIS COMMIT).** `docs/idea.md`, `PLAN.md`, `.agent/TASKS.md`. No code. ✅
- **Phase R — Restructure & Monorepo (DO FIRST, before any feature work).** Convert to an npm
  workspaces monorepo and lay the code out per §5 — _no behavior changes, structure only._ Add the
  root `package.json` (glob workspaces); move `orchestrator/` → `apps/orchestrator/` and
  `frontend/` → `apps/frontend/` (fixing the `../.env` → `../../.env` path); extract the API
  contract into `packages/shared` and import it from both apps; reorganize the orchestrator into
  `config`/`routes`/`pipeline`/`llm`/`prompts`/`store`/`lib` (current single prompt moves to
  `prompts/shared.ts`, no archetype split yet); split the frontend `App.tsx` into
  `components`/`hooks`/`api`. Finish by updating `CLAUDE.md`/`README` paths and verifying a clean
  `npm install` + `npm run dev` + the generate→deploy→iframe smoke test still works. _This is the
  cheapest moment to do it — before Phase 2 multiplies the prompt/pipeline code._
- **Phase 1 — Reframe to informational search.** Rewrite `generator.ts`'s `SYSTEM_PROMPT` from
  financial-calculator to **generic informational page** (timelines, galleries, tabs, fact
  cards, sections). Strip all stale **Locus** copy from `frontend/src/App.tsx` (stage labels,
  footer, header "powered by Locus"), swap the financial `EXAMPLES` for topical ones
  (history/science/geography), and fix the stale README "Getting Started". _Most visible payoff._
- **Phase 2 — Archetype routing.** ✅ _done._ Built the classifier + per-archetype prompt
  templates (3 families → 7 archetypes) and wired a classify→compose→generate path. **The
  classify/cutover wiring is superseded by the agentic core below; the templates survive as the
  Builder's render contract.**

> **Re-architecture — the Agentic Core (replaces the old static Phases 3–4).** Pivot the pipeline
> to **Architect → Builder** (D12–D15). Clean rewrite, OpenAI throughout, Tavily for search.

- **Phase A — Tooling foundation.** Pluggable tool registry + `Tool` interface; the Tavily
  (search+extract), `wikipedia_summary`, and `image_search` tools; and the **Build Spec** contract
  in `@zearch/shared`.
- **Phase B — Architect.** The tool-calling loop (`runArchitect(query) → BuildSpec`) with loop
  control + graceful degradation, and its design-reasoning system prompt.
- **Phase C — Builder.** `runBuilder(spec) → html` composing the render contract + spec, plus the
  validate + repair loop so broken pages never reach the iframe (absorbs the old Phase 4).
- **Phase D — Live data.** The `/api/live` proxy (CORS bypass + key injection) and the
  live-with-snapshot-fallback pattern in the Builder.
- **Phase E — Cutover, frontend, docs.** ✅ _done._ Rewire `pipeline/index.ts` to Architect→Builder and
  retire `classify.ts`; a real Planning→Researching→Building frontend feed; docs sweep.
- **Phase 5 — Persistence & sharing.** Opt-in persistent/shareable links (extend TTL, "keep
  this page"), client-side **search history** (localStorage recents). Rebuild the in-memory
  `apps` Map + teardown timers from disk on restart.
- **Phase 6 — Hardening.** Generation caching for repeat queries, rate limiting, structured
  errors surfaced in the UI, cost/latency instrumentation across the Architect + Builder calls
  (agentic cost/latency matters more now).

---

## 7. Risks / open items

1. **Hallucination** — the Architect's tool loop (Phase B) is the mitigation: real facts +
   sources before the Builder writes anything. Risk shifts to *tool quality* (#7) and the Architect
   trusting a bad source.
2. **Browser-Babel render fragility** — the exact CDN URLs/order and `window.Recharts`
   destructure are load-bearing; a bad edit silently breaks every generated page. They live in
   **one** place (`hard-requirements.ts`); the Builder's validate+repair loop (C2) is the net.
3. **Image sourcing/licensing** — Wikimedia/Commons is safe; any Unsplash/other source needs a
   key and attribution rules.
4. **Ephemeral state on restart** — `apps` Map + teardown timers live in process memory and are
   _not_ rebuilt from disk on restart (Phase 5 fixes; documented in `CLAUDE.md`).
5. **`PUBLIC_BASE` correctness** — `serviceUrl` is absolute; a wrong `PUBLIC_BASE` in prod breaks
   the iframe even though deploy "succeeds."
6. **Secrets** — `OPENAI_API_KEY` + `TAVILY_API_KEY` via `.env` only, never committed (`.env` is
   gitignored — keep it that way). Live-API keys live server-side behind `/api/live`, never in
   generated page JS.
7. **Tool reliability & cost** — the Architect depends on Tavily (rate limits, downtime, result
   quality); the `SearchProvider` seam (D13) makes it swappable, and the loop degrades to an
   ungrounded spec on tool failure. Agentic loops also mean **higher latency + per-query cost**
   (planning call + N tool round-trips + generation) — caching (Phase 6) and a bounded loop keep
   it in check.
8. **Live-data plumbing** — client-side live fetch only works via the `/api/live` proxy (CORS +
   key hiding); the build-time snapshot is the fallback when live fails. APIs without a usable
   public endpoint degrade to snapshot-only.

---

## 8. Current status

**Phases A–E (Agentic Core) are complete.** The shipped pipeline is:

- Tool registry under `apps/orchestrator/src/tools/` (A1–A4) + `BuildSpec` in `@zearch/shared` (A5).
- `pipeline/architect.ts` — `runArchitect(query) → BuildSpec` OpenAI function-calling loop (B1–B2).
- `pipeline/builder.ts` — `runBuilder(spec) → html` with validate/repair loop (C1–C2).
- `/api/live` proxy in `routes/live.ts` with SSRF allowlist and in-memory cache (D1–D2).
- `pipeline/index.ts` rewired to Architect→Builder; `classify.ts` retired (E1).
- Frontend stage labels: Planning → Researching → Building → Ready (E2).

**Next:** Phase 5 — Persistence & sharing (P5-1 through P5-3).
