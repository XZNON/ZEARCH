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
  - `pipeline/` — **the core**. `generate.ts` = `generateAppHTML()` (Stage C: build messages from the shared prompt, call the LLM, `extractHTML`). `index.ts` is the seam where Stage A (classify) and B (ground) will compose later.
  - `llm/` — `providers.ts` (provider abstraction: each provider is just `baseURL`/`apiKey`/`model`/`maxTokens`/`extraBody`; `resolveProvider()` picks by `LLM_PROVIDER`, default `groq`; built-ins `groq` + `openai`) and `client.ts` (`chatCompletion()`, the only module that talks HTTP to an LLM).
  - `prompts/` — `shared.ts` holds the load-bearing `SYSTEM_PROMPT`; `index.ts` re-exports. Per-archetype templates will be added here (Phase 2).
  - `store/` — `appStore.ts` (in-memory `apps` Map + disk mirror at `APPS_DIR`; `deployGeneratedApp`/`getApp`/`getDeploymentStatus`/`removeApp`) and `lifecycle.ts` (`idleTimers` + `scheduleTeardown`/`teardown`).
  - `lib/` — `html.ts` (`extractHTML`), `logger.ts` (`createLogger(scope)`).
  - `types.ts` — orchestrator-internal types only (`AppEntry`). The wire contract lives in `@zearch/shared`. Imports use `.js` extensions (NodeNext) even though files are `.ts`.
- **`packages/shared/`** (`@zearch/shared`) — the single API contract (`DeployResult`, `DeployResponse`, `DeploymentStatus`, `GenerateResponse`, …). Pure types, imported with `import type` on both sides, so it adds **zero runtime dependency** — only the type-checker enforces that orchestrator and frontend agree on the wire shape.
- **`apps/frontend/`** (`@zearch/frontend`) — Vite + React 18 + Tailwind SPA. Dev port **5173**; preview/prod **8080**. `VITE_ORCH_URL` points at the orchestrator (default `http://localhost:8080`). `src/` is split: `App.tsx` (thin wiring), `hooks/useGeneration.ts` (the generate→deploy→poll→update→teardown state machine), `api/client.ts` (`postJSON`/`getStatus`), `components/*` (Header, Hero, PromptBox, Examples, BuildingCard, AppViewer, ErrorCard, Footer), `types.ts`.

### Request flow (frontend → orchestrator)
`POST /api/generate` (prompt → html) → `POST /api/deploy` (html → id/projectId/serviceId/serviceUrl/deploymentId + tearDownAt) → frontend polls `GET /api/status/:deploymentId` every 5s (native deploys report `healthy` on the first poll). `POST /api/update` re-generates from previous HTML + an update prompt (then deploy again). `POST /api/teardown` deletes the app (memory + disk) immediately. The deploy response keeps the old Locus field names (`projectId`/`serviceId`/`deploymentId`) — they now all map to the single native app id, so the frontend contract is unchanged.

The frontend stage machine (`generating → packaging → pushing → building → deploying → healthy`) is now mostly cosmetic, since native hosting is instant.

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
- `LLM_PROVIDER` — `groq` (default) or `openai`.
- Groq provider: `GROQ_API_KEY` (required), `GROQ_MODEL` (default `openai/gpt-oss-120b`), `GROQ_MAX_TOKENS` (default `7000`), `GROQ_BASE_URL`/`GROQ_BASE` (default Groq), `GROQ_REASONING_EFFORT` (default `low`).
- OpenAI provider: `OPENAI_API_KEY` (required), `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_MAX_TOKENS` (default `16000`), `OPENAI_BASE_URL` (default OpenAI; override to drive any OpenAI-compatible endpoint).

Other:
- `PUBLIC_BASE` (default `http://localhost:<PORT>`; must be the publicly reachable orchestrator origin so iframe `serviceUrl`s resolve), `APPS_DIR` (default `apps/orchestrator/apps`), `PORT`.

The orchestrator's npm scripts load env via Node's native `--env-file-if-exists`, checking the **repo-root `.env` first (`../../.env` from `apps/orchestrator/`), then `apps/orchestrator/.env`** (local overrides root). `.env` is gitignored. Use `KEY="value"` form — Node's parser does not reliably handle spaces around `=`.

Frontend: `VITE_ORCH_URL` to point at a non-local orchestrator.

## Gotchas

- The README's "Getting Started" (`cd backend`, `node index.js`, Locus keys) is **stale** — the backend is `apps/orchestrator/` (run from the repo root via `npm run dev`), the keys are Groq, and there is no `backend/` dir. (Phase 1 task P1-5 rewrites it.)
- Free Groq tiers cap **tokens-per-minute** (e.g. 8000 TPM). `max_completion_tokens` counts toward that budget, so the default `GROQ_MAX_TOKENS` is a modest 7000 — a 16000 request returns HTTP 413. Raise it via env on a higher tier. `/api/update` is especially exposed: it sends the entire previous HTML back as input, which can blow the TPM budget on its own.
- `prompts/shared.ts`'s `SYSTEM_PROMPT` is load-bearing: it pins exact CDN script URLs/order (React 18 UMD, Recharts 2.15.4, Babel standalone, Tailwind CDN) and the Recharts/`window.Recharts` destructure. Generated apps are babel-in-browser. Edit it carefully — changes directly affect whether generated apps render. (Still financial-calculator flavored from v0; Phase 1 task P1-1 rewrites it for informational pages.)
- The frontend still contains **stale Locus/Claude UI copy** (Header "powered by Locus Build" in `components/Header.tsx`, `components/Footer.tsx`, and `statusNote` strings like "Locus is building the container" in `hooks/useGeneration.ts`). These are cosmetic and were intentionally left unchanged during the Phase R restructure — Phase 1 task P1-3 rewrites them.
- `serviceUrl` is an absolute URL built from `PUBLIC_BASE`. The frontend iframes it directly, so a wrong `PUBLIC_BASE` (e.g. defaulting to localhost in prod) breaks app display even though deploy "succeeds."
- App store and teardown timers live in process memory; the HTML is also mirrored to `APPS_DIR` on disk, but the `apps` Map and scheduled teardowns are **not** rebuilt from disk on restart — a restart drops live status and pending teardowns.
