# Session prompt — ZEARCH · PD (Live Data: /api/live proxy + live-with-snapshot pattern)

> One self-contained, copy-paste prompt covering the WHOLE phase.
> Phase: **PD** (Agentic Core — Live Data) in `.agent/TASKS.md`. Tasks: D1, D2. Generated: 2026-06-19.

Phase D adds live data support to the pipeline:
- **D1** adds a `/api/live` CORS-bypass proxy route to the orchestrator so generated pages can fetch live APIs.
- **D2** updates the Architect prompt and Builder to emit and consume a `liveEndpoint` + build-time snapshot, so pages fetch live data at runtime and fall back to the snapshot gracefully.

**D2 is still additive** — the live pipeline cutover (routing `/api/generate` through Architect→Builder) happens in Phase E. D2 only changes the Architect prompt and Builder internals; generated pages won't exercise the live fetch until E1 wires everything together.

---

## Copy-paste this into your agent

```
You are my coding agent for ZEARCH. We are working through ALL of phase PD:
Live Data (/api/live proxy + live-with-snapshot pattern). The phase has these tasks, to be done in this order:
  D1 — /api/live proxy on the orchestrator (CORS bypass + cache)
  D2 — Live-with-snapshot pattern (Architect prompt + Builder buildUserMessage)

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
    git checkout -b feature/agentic-core-phase-d
- Do ONE task at a time, in dependency order. Finish + verify a task before starting the next.
- After finishing each task: mark it done in .agent/TASKS.md and pause for my review before
  starting the next task.
- The CDN block in apps/orchestrator/src/prompts/hard-requirements.ts (and shared.ts) is
  load-bearing — exact script URLs, their order (React 18 UMD, Recharts 2.15.4, Babel
  standalone, Tailwind CDN), and the window.Recharts destructure must be preserved
  byte-for-byte. Do NOT touch these files except where explicitly specified below.
- Use OpenAI for ALL LLM calls. Never switch to Groq.
- All imports in apps/orchestrator/src/ must use .js extensions (NodeNext resolution).
- Do NOT modify prompts/archetypes/hard-requirements.ts — the "no backend calls" rule
  stays there; D2 overrides it in the Builder's user message only.

────────────────────────────────────────────────────────
PER-TASK PLAN
────────────────────────────────────────────────────────

### D1 — /api/live proxy on the orchestrator

SCOPE:
  Files to CREATE:
    apps/orchestrator/src/routes/live.ts    ← new proxy route

  Files to EDIT:
    apps/orchestrator/src/config.ts         ← add 3 new env vars
    apps/orchestrator/src/server.ts         ← mount liveRouter

  Files that DO NOT change (reference only):
    packages/shared/index.ts                ← LiveEndpoint already defined; no changes needed
    apps/orchestrator/src/types.ts          ← no new shared types needed

--- config.ts changes ---
Append after the TAVILY_API_KEY block (following the existing comment-header pattern):

  // ── Live Proxy (Phase D) ──────────────────────────────────────────────────
  export const LIVE_PROXY_ALLOW_HOSTS = process.env.LIVE_PROXY_ALLOW_HOSTS ?? '';
  export const LIVE_PROXY_CACHE_TTL_S = Number(process.env.LIVE_PROXY_CACHE_TTL_S) || 60;
  export const LIVE_PROXY_API_KEY     = process.env.LIVE_PROXY_API_KEY ?? '';

  - LIVE_PROXY_ALLOW_HOSTS: comma-separated allowed upstream hostnames; empty = allow all.
  - LIVE_PROXY_CACHE_TTL_S: seconds to cache identical URL responses. Default 60.
  - LIVE_PROXY_API_KEY: optional bearer token injected as Authorization header on upstream requests.

--- routes/live.ts (new file) ---
Pattern: follow the exact structure of routes/generate.ts and routes/deploy.ts.
Imports: Router from 'express', the 3 new config vars, createLogger from '../lib/logger.js'.

Module-level constants (evaluated once at import time):
  - allowedHosts: Set<string> — parse LIVE_PROXY_ALLOW_HOSTS.split(',').map(s=>s.trim()).filter(Boolean)
  - CORS_HEADERS constant object:
      { 'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type' }

Module-level cache:
  - Interface CacheEntry { body: string; contentType: string; expiresAt: number }
  - const proxyCache = new Map<string, CacheEntry>()
  - (No background eviction timer — lazy eviction: prune stale entries on each write)

Route handlers:

  OPTIONS /live  → 204 with CORS_HEADERS (browser preflight)

  GET /live:
    1. Validate `url` query param (string, non-empty) → 400 if missing
    2. Parse new URL(rawUrl) in try/catch → 400 "url is not a valid URL" if throws
    3. Reject non-http(s) schemes → 400 "url must use http or https"  [SSRF guard]
    4. If allowedHosts.size > 0 and hostname not in set → 403 "host X is not in the proxy allowlist"
    5. Cache lookup: if proxyCache.get(rawUrl)?.expiresAt > Date.now() → return cached body
       with CORS_HEADERS + Content-Type + X-Cache: HIT header
    6. Upstream fetch with AbortController + 15 000 ms timeout (same pattern as tools/search/tavily.ts)
       - Forward Accept and Accept-Language from the client request
       - Do NOT forward Cookie, client Authorization, or Host
       - If LIVE_PROXY_API_KEY is set → add Authorization: Bearer <key> to upstream headers
    7. If upstream response is NOT ok (non-2xx): do NOT cache; return upstream status code with error body
    8. Read upstream body as text (covers JSON and plain text)
    9. Prune stale cache entries (expiresAt < Date.now()), then store new entry with
       expiresAt = Date.now() + LIVE_PROXY_CACHE_TTL_S * 1000
    10. Return 200 with CORS_HEADERS + upstream Content-Type + X-Cache: MISS + body

  Error handler: catch at route level, log with createLogger('live'), return 500 { error: message }

Export: export const liveRouter = Router(); (following the existing naming convention)

--- server.ts changes ---
Add one import:
  import { liveRouter } from './routes/live.js';

Add one app.use line (before appsRouter, which is mounted at '/' and must stay last):
  app.use('/api', liveRouter);

ACCEPTANCE — D1 is done when:
  1. npm run typecheck is green.
  2. Server starts (npm run dev:orch) without error.
  3. curl "http://localhost:8080/api/live?url=https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.1&current_weather=true" -i
     → HTTP 200, Access-Control-Allow-Origin: *, X-Cache: MISS, valid JSON body.
  4. Same curl a second time → X-Cache: HIT, near-instant response.
  5. curl -X OPTIONS "http://localhost:8080/api/live?url=..." -i → 204, CORS headers present.
  6. curl "http://localhost:8080/api/live?url=not-a-url" -i → 400.
  7. curl "http://localhost:8080/api/live?url=file:///etc/passwd" -i → 400.

NOTES:
  - The cors() middleware already on the Express app does NOT cover this route adequately for
    the CORS-bypass use case — we need explicit * on this route. Setting headers manually in
    the route handler overrides the global cors() for this route. This is intentional.
  - The global cors() middleware is set up in server.ts; placing liveRouter BEFORE appsRouter
    (which serves /app/:id) keeps the /api group together.
  - Generated pages are served from the same origin as the orchestrator (/app/:id routes),
    so they must use a RELATIVE /api/live?url=... path — not an absolute localhost URL.
    The Builder (D2) must be instructed accordingly.

────────────────────────────────────────────────────────

### D2 — Live-with-snapshot pattern (Architect prompt + Builder)

SCOPE:
  Files to EDIT:
    apps/orchestrator/src/prompts/architect.ts     ← expand liveEndpoint + snapshot guidance
    apps/orchestrator/src/pipeline/builder.ts      ← add liveBlock to buildUserMessage + extend correction

  Files that DO NOT change:
    apps/orchestrator/src/pipeline/architect.ts    ← normalization already handles liveEndpoint/snapshot
    packages/shared/index.ts                       ← types already correct; no new fields needed
    apps/orchestrator/src/prompts/archetypes/hard-requirements.ts  ← DO NOT MODIFY
    apps/orchestrator/src/tools/emit-build-spec.ts ← JSON schema already exposes liveEndpoint + snapshot

--- prompts/architect.ts changes ---
In ARCHITECT_SYSTEM_PROMPT, find the sparse two-line block for liveEndpoint and snapshot under
"THE BUILDSPEC — EVERY FIELD" and replace it with the following expanded block:

  - liveEndpoint (OPTIONAL) — OMIT for the vast majority of queries. Include ONLY when the
    page genuinely needs real-time data that would be meaningfully stale within hours:
    current weather, live stock/crypto prices, currency exchange rates, sports scores, flight
    status, air quality index, ISS location, etc. Static archetypes (person, event, place,
    concept) almost never warrant a liveEndpoint — use facts[] instead.
    Rule of thumb: if the page would still be useful and accurate tomorrow with only the
    snapshot, prefer facts[] over liveEndpoint.

    When emitting liveEndpoint:
      url — A real, publicly accessible JSON API URL, NO auth key required at the call site.
             Well-known free/keyless APIs:
               Open-Meteo (weather): https://api.open-meteo.com/v1/forecast?latitude=XX&longitude=YY&current_weather=true
               Open-Notify (ISS):    http://api.open-notify.org/iss-now.json
               CoinGecko (crypto):   https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd
               exchangerate.host:    https://api.exchangerate.host/latest?base=USD
             NEVER fabricate a URL. If you cannot recall a real, free, keyless API for this
             query, omit liveEndpoint entirely and use facts[] with current data from web_search.
      description — One sentence: what this endpoint returns and how the page uses it.
                    E.g. "Current temperature and wind speed for London; powers the live
                    weather panel at the top of the page."
      shape — Compact description of the JSON fields the page will actually use.
              E.g. { current_weather: { temperature: number, windspeed: number, weathercode: number } }
              Keep brief; only describe fields the page renders.

    You MUST still populate facts[] with context facts about the topic when liveEndpoint is
    present — the live widget is one section; facts provide the surrounding content.

  - snapshot (REQUIRED when liveEndpoint is present, OMIT otherwise) — A real JSON value
    matching the shape you described above. Use your web_search results or known sample
    values to produce a realistic snapshot. This becomes the page's initial state and is
    shown immediately; the live fetch replaces it when it resolves.
    If you cannot produce a realistic snapshot value, omit liveEndpoint entirely — a page
    with no snapshot fallback is worse than a static page.

Also add this entry to the ROUTING EXAMPLES section (or equivalent examples block):
  "Current weather in London" → archetype: data
    - web_search to find the Open-Meteo URL for London (lat 51.5, lon -0.1)
    - Emit liveEndpoint with that URL, shape: { current_weather: { temperature, windspeed, weathercode } }
    - Emit snapshot with representative London weather values
    - Emit 4-5 facts about London's climate, historical temperature ranges, weather patterns
    - Do NOT emit a liveEndpoint for "London" alone — that is a place archetype, use facts[]

--- pipeline/builder.ts changes ---
Two changes in buildUserMessage(spec: BuildSpec): string:

CHANGE 1 — Add a liveBlock (non-empty only when spec.liveEndpoint is defined).
Place the liveBlock at the END of the user message, after the images section and
immediately before the closing "Return only the complete HTML file" instruction.

Template for liveBlock (build this string when spec.liveEndpoint != null):

  LIVE DATA ENDPOINT (CRITICAL — read before writing any code):
  EXCEPTION to the "no backend calls" rule: this page MUST fetch one live data source.

  Endpoint: ${spec.liveEndpoint.url}
  Description: ${spec.liveEndpoint.description}
  Response shape: ${spec.liveEndpoint.shape ?? 'JSON object — inspect the snapshot for the structure'}

  IMPLEMENTATION RULES (non-negotiable):
  1. Fetch ONLY via the orchestrator proxy using a RELATIVE path:
       fetch('/api/live?url=' + encodeURIComponent('${spec.liveEndpoint.url}'))
     NEVER fetch the endpoint URL directly — it will be CORS-blocked.
  2. Use this exact React pattern inside function App():
       const [liveData, setLiveData] = useState(SNAPSHOT_INITIAL_VALUE);
       const [liveStatus, setLiveStatus] = useState('snapshot');
       useEffect(() => {
         setLiveStatus('loading');
         fetch('/api/live?url=' + encodeURIComponent('${spec.liveEndpoint.url}'))
           .then(r => r.ok ? r.json() : Promise.reject(r.status))
           .then(data => { setLiveData(data); setLiveStatus('live'); })
           .catch(() => setLiveStatus('error'));
       }, []);
     Where SNAPSHOT_INITIAL_VALUE is the build-time snapshot value (see below).
  3. Render from liveData in a SINGLE render path — snapshot and live data share the same
     shape, so no conditional branching needed.
  4. Show a small status badge: green "● Live" when liveStatus==='live',
     amber "● Snapshot" when liveStatus is 'snapshot' or 'error',
     grey "● Loading..." when liveStatus==='loading'.
  5. Do NOT duplicate render logic for live vs snapshot — one render path, reads liveData.

  BUILD-TIME SNAPSHOT (use this as the useState initial value — paste as the JS literal):
  ${JSON.stringify(spec.snapshot ?? null, null, 2)}

  (compact form for the useState call: ${JSON.stringify(spec.snapshot ?? null)})

Where spec.liveEndpoint is absent, liveBlock is an empty string '' — no change to the
existing message structure.

CHANGE 2 — Extend the correction message (the retry user turn on validate failure).
Find the string that begins with "The previous HTML failed validation" (or similar).
Append to it (before any closing instruction):
  "IMPORTANT: if the page included a live /api/live fetch in a useEffect — preserve it
   exactly. Do NOT remove the useEffect, revert to static data, or remove the
   liveData/liveStatus state while fixing the validation error."

This prevents the Builder from simplifying away the async live-fetch logic during retry.

ACCEPTANCE — D2 is done when:
  1. npm run typecheck is green.
  2. Manual smoke test: create a BuildSpec with a liveEndpoint (e.g. Open-Meteo London),
     call runBuilder(spec) directly (in a small test script or REPL), inspect the HTML.
     The output must satisfy:
       grep -q "fetch('/api/live?url=" <output>       ← proxy fetch present
       grep -q "encodeURIComponent"    <output>       ← URL is encoded
       grep -q "useState"              <output>       ← state used
       grep -q "useEffect"             <output>       ← fetch inside effect
       grep -q "liveStatus"            <output>       ← status badge state present
     And must NOT contain: fetch('http   or   fetch("http  (no direct external fetches)
  3. A BuildSpec WITHOUT liveEndpoint produces identical output to before D2 (no regression).

NOTES:
  - The existing HARD_REQUIREMENTS in prompts/archetypes/hard-requirements.ts says
    "No fetch/XHR/WebSocket to any backend." DO NOT remove or modify that rule — it
    applies to static pages. The liveBlock in the user message arrives AFTER the system
    prompt and explicitly overrides it for live pages only. This is intentional.
  - spec.snapshot is typed unknown — use JSON.stringify(spec.snapshot ?? null) when
    embedding in the user message. If the Architect emitted it as a JS object in the
    tool args, it arrives here already deserialized.
  - The generated page is served from the same origin (/app/:id on the orchestrator),
    so /api/live (relative path) correctly resolves to the orchestrator's proxy route.
  - D2 is additive. The live pipeline still goes through runGeneration() → generateAppHTML()
    until Phase E (E1) wires Architect→Builder. The new code in builder.ts is exercised
    only when runBuilder() is called directly (smoke test) or after E1 lands.
  - Do NOT add live-fetch validation to validateAppHTML() — the validator stays generic.
    The grep-based acceptance check is the D2 verification mechanism.

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
When every task is done: update .agent/STATE.md (phase ✅, what's next), summarize the
whole phase's changes, and stop. Do NOT commit.

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
       - say "Resuming phase PD; tasks {done} are done, continue from {next_task_id}"
       - point at .agent/implementations/implementation_PD.md as the full plan
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
```
