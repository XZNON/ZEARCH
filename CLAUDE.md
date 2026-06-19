# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ZEARCH ("LiveAnswer") turns a natural-language prompt into a **live, hosted interactive web app**. The user types a prompt → an LLM generates a single self-contained `index.html` → it is stored and served by the orchestrator at a unique URL → the app auto-tears-down after 30 min idle.

The project was originally built on **Locus** for both LLM and deployment; that dependency has been removed. LLM calls now go to **Groq**, and app hosting is done **natively by the orchestrator** (no containers, no git push) — because generated apps are single self-contained HTML files, "deploying" just means storing the HTML and serving it.

## Architecture

**npm workspaces monorepo** (plain workspaces, no Turborepo). Root `package.json` declares `workspaces: ["apps/*", "packages/*"]`, so a single root `npm install` installs everything into one hoisted `node_modules`. Both apps are **TypeScript** (ESM). Folder structure mirrors the generation pipeline ("screaming architecture"), not generic MVC.

- **`apps/orchestrator/`** (`@zearch/orchestrator`) — Express API (ESM, `"type": "module"`), the backend brain. Default port **8080**. Run via `tsx` (no compile-to-`dist`); `tsc --noEmit` is the type-checker. All source under `src/`:
  - `index.ts` — entry: logs the active LLM provider, then `createApp().listen()`.
  - `server.ts` — builds the Express app (middleware + route mounting + `/health`). No boot logic.
  - `config.ts` — the one place env is read for app config: `PORT`, `PUBLIC_BASE`, `APPS_DIR`.
  - `routes/` — thin HTTP layer: `generate.ts` (`/api/generate`, `/api/update`), `deploy.ts` (`/api/deploy`, `/api/status/:id`, `/api/teardown`), `apps.ts` (`GET /app/:id`).
  - `pipeline/` — **the core**. `architect.ts` = `runArchitect(query) → BuildSpec` (OpenAI function-calling loop over the tool registry; bounded at MAX_ITERATIONS=8 / 90s; degrades to an ungrounded spec on failure). `builder.ts` = `runBuilder(spec) → html` (composes render contract from `prompts/archetypes/` + Build Spec; validate/repair loop, MAX_ATTEMPTS=3). `generate.ts` = legacy `generateAppHTML()` (flat single-prompt path, still used by `/api/update`). `index.ts` = `runGeneration()` — wired to Architect→Builder (Phase E). `classify.ts` = retired (Phase E).
  - `tools/` — **the Architect's tool registry** (`apps/orchestrator/src/tools/`). Each tool is `{ name, description, parameters (JSON schema), execute() }` and self-registers. Tools: `web_search` (Tavily, behind a `SearchProvider` seam; `TAVILY_API_KEY`), `wikipedia_summary` (Wikipedia REST, keyless), `image_search` (Wikimedia/Commons, license-safe), `emit-build-spec` (terminal — causes the loop to emit a BuildSpec and exit).
  - `llm/` — `providers.ts` (provider abstraction: each provider is just `baseURL`/`apiKey`/`model`/`maxTokens`/`extraBody`; `resolveProvider()` picks by `LLM_PROVIDER`, default `groq`; built-ins `groq` + `openai`) and `client.ts` (`chatCompletion()` for text-only calls; `chatCompletionWithTools()` for the Architect's function-calling loop — takes `LoopMessage[]` + OpenAI tool schemas, never throws on null content).
  - `prompts/` — `shared.ts` holds the load-bearing `SYSTEM_PROMPT`; `index.ts` re-exports. Per-archetype templates will be added here (Phase 2).
  - `store/` — `appStore.ts` (in-memory `apps` Map + disk mirror at `APPS_DIR`; `deployGeneratedApp`/`getApp`/`getDeploymentStatus`/`removeApp`) and `lifecycle.ts` (`idleTimers` + `scheduleTeardown`/`teardown`).
  - `lib/` — `html.ts` (`extractHTML`), `logger.ts` (`createLogger(scope)`).
  - `types.ts` — orchestrator-internal types only (`AppEntry`). The wire contract lives in `@zearch/shared`. Imports use `.js` extensions (NodeNext) even though files are `.ts`.
- **`packages/shared/`** (`@zearch/shared`) — the single API contract (`DeployResult`, `DeployResponse`, `DeploymentStatus`, `GenerateResponse`, …, `BuildSpec` (`{ intent, archetype, designDirection, presentation, facts[] (+sources), images[], liveEndpoint?, snapshot? }`), `BuildSpecFact`, `BuildSpecImage`, `LiveEndpoint`, and `ArchetypeSlug`). Pure types, imported with `import type` on both sides, so it adds **zero runtime dependency** — only the type-checker enforces that orchestrator and frontend agree on the wire shape.
- **`apps/frontend/`** (`@zearch/frontend`) — Vite + React 18 + Tailwind SPA. Dev port **5173**; preview/prod **8080**. `VITE_ORCH_URL` points at the orchestrator (default `http://localhost:8080`). `src/` is split: `App.tsx` (thin wiring), `hooks/useGeneration.ts` (the generate→deploy→poll→update→teardown state machine), `api/client.ts` (`postJSON`/`getStatus`), `components/*` (Header, Hero, PromptBox, Examples, BuildingCard, AppViewer, ErrorCard, Footer), `types.ts`.

### Request flow (frontend → orchestrator)
`POST /api/generate` (prompt → html) → `POST /api/deploy` (html → id/projectId/serviceId/serviceUrl/deploymentId + tearDownAt) → frontend polls `GET /api/status/:deploymentId` every 5s (native deploys report `healthy` on the first poll). `POST /api/update` re-generates from previous HTML + an update prompt (then deploy again). `POST /api/teardown` deletes the app (memory + disk) immediately. The deploy response keeps the old Locus field names (`projectId`/`serviceId`/`deploymentId`) — they now all map to the single native app id, so the frontend contract is unchanged.

The frontend stage machine shows **Planning → Researching → Building → Ready**, matching the Architect (Planning/Researching) and Builder (Building) pipeline stages. `POST /api/update` re-generates from previous HTML + an update prompt using `generateAppHTML` (Builder-only flat path — no new Architect loop). `GET /api/live` is a CORS-bypass proxy for live-data pages (Phase D): forwards client-side fetches to a real API, injects keys server-side, and serves a lazy-eviction in-memory cache.

## Commands

From the **repo root** (one install for all workspaces):
```
npm install                  # installs every workspace into one hoisted node_modules
npm run dev                  # concurrently runs orchestrator (:8080) + frontend (:5173)
npm run dev:orch             # orchestrator only
npm run dev:web              # frontend only
npm start                    # orchestrator (tsx, production-ish)
npm run build                # build every workspace that has a build script (the frontend)
npm run typecheck            # tsc --noEmit across all workspaces
```

Per-workspace (when you want just one): `npm run <script> --workspace @zearch/orchestrator` (or `@zearch/frontend`, `@zearch/shared`). The orchestrator runs via `tsx` with `node --watch`; the frontend via Vite (`build` = `tsc --noEmit && vite build`, `preview` serves on :8080).

There are no tests. Type-checking is the only static check.

## Required environment (orchestrator)

The server boots regardless, logs the active provider, and warns if its key is missing; `/api/generate` and `/api/update` then fail.

LLM provider selection:
- `LLM_PROVIDER` — `openai` (the active provider for all Architect + Builder calls) or `groq` (legacy fallback).
- OpenAI provider (current): `OPENAI_API_KEY` (required for the Architect tool loop and Builder generation), `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_MAX_TOKENS` (default `16000`), `OPENAI_BASE_URL` (default OpenAI; override for any OpenAI-compatible endpoint).
- Groq provider (legacy option): `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`), `GROQ_MAX_TOKENS` (default `7000`), `GROQ_BASE_URL`/`GROQ_BASE`, `GROQ_REASONING_EFFORT` (default `low`).
- `TAVILY_API_KEY` — required for the Architect's `web_search` tool. Without it, `web_search` fails silently and the Architect degrades to an ungrounded spec using only `wikipedia_summary` and `image_search`.
- Live proxy (Phase D): `LIVE_PROXY_ALLOW_HOSTS` (SSRF allowlist), `LIVE_PROXY_CACHE_TTL_S` (cache TTL), `LIVE_PROXY_API_KEY` (optional server-side key injection).

Other:
- `PUBLIC_BASE` (default `http://localhost:<PORT>`; must be the publicly reachable orchestrator origin so iframe `serviceUrl`s resolve), `APPS_DIR` (default `apps/orchestrator/apps`), `PORT`.

The orchestrator's npm scripts load env via Node's native `--env-file-if-exists`, checking the **repo-root `.env` first (`../../.env` from `apps/orchestrator/`), then `apps/orchestrator/.env`** (local overrides root). `.env` is gitignored. Use `KEY="value"` form — Node's parser does not reliably handle spaces around `=`.

Frontend: `VITE_ORCH_URL` to point at a non-local orchestrator.

## Gotchas

- **Groq TPM cap no longer applies** (D15): OpenAI is the active provider. Groq remains a `LLM_PROVIDER=groq` option but is not the recommended path.
- `prompts/shared.ts`'s `SYSTEM_PROMPT` is load-bearing: it pins exact CDN script URLs/order (React 18 UMD, Recharts 2.15.4, Babel standalone, Tailwind CDN) and the Recharts/`window.Recharts` destructure. Generated apps are babel-in-browser. Edit it carefully — changes directly affect whether generated apps render.
- `serviceUrl` is an absolute URL built from `PUBLIC_BASE`. The frontend iframes it directly, so a wrong `PUBLIC_BASE` (e.g. defaulting to localhost in prod) breaks app display even though deploy "succeeds."
- App store and teardown timers live in process memory; the HTML is also mirrored to `APPS_DIR` on disk, but the `apps` Map and scheduled teardowns are **not** rebuilt from disk on restart — a restart drops live status and pending teardowns.
