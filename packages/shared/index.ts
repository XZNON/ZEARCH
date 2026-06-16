// @zearch/shared — the single source of truth for the orchestrator ⇄ frontend API contract.
// Imported with `import type` on both sides, so these types are erased at build time and add
// no runtime dependency — only the type-checker enforces that both ends agree on the wire shape.

/** Core identity of a deployed app. The `projectId`/`serviceId`/`deploymentId` fields are legacy
 *  aliases from the old Locus design — they now all hold the same native app id. */
export interface DeployResult {
  id: string;
  projectId: string;
  serviceId: string;
  deploymentId: string;
  serviceUrl: string;
  status: 'healthy';
}

/** Teardown schedule returned alongside a deploy. */
export interface ScheduleResult {
  tearDownAt: string;
}

/** Full body returned by `POST /api/deploy` (deploy result + teardown schedule). */
export type DeployResponse = DeployResult & ScheduleResult;

/** Body returned by `GET /api/status/:deploymentId`. */
export interface DeploymentStatus {
  status: 'healthy' | 'unknown';
  durationMs?: number;
  version?: number;
}

/** Body returned by `POST /api/generate`. */
export interface GenerateResponse {
  html: string;
  sizeBytes: number;
}

/** Body returned by `POST /api/update`. */
export interface UpdateResponse {
  html: string;
}

/** Shape any endpoint uses to report an error. */
export interface ApiError {
  error: string;
}

// ── Build Spec (Agentic Core) ─────────────────────────────────────────────────
// The Architect↔Builder handoff. The Architect (Phase B) researches a query via the tool loop and
// emits a BuildSpec; the Builder (Phase C) turns it into index.html under the render contract. Pure
// types, like everything here — the orchestrator constructs the value, the frontend may read a few
// fields for the build feed. packages/shared MUST NOT import orchestrator code (one-way dependency).

/** The seven page archetypes. MUST stay in sync with `ARCHETYPES` in
 *  apps/orchestrator/src/prompts/archetypes/index.ts. */
export type ArchetypeSlug =
  | 'person'
  | 'event'
  | 'place'
  | 'concept'
  | 'comparison'
  | 'data'
  | 'tool';

/** A grounded fact with its provenance. `source` is a URL where the fact was found. */
export interface BuildSpecFact {
  text: string;
  source?: string;
}

/** A grounded image the Builder may embed. */
export interface BuildSpecImage {
  url: string;
  alt?: string;
  credit?: string;
  license?: string;
}

/** A live data source the generated page fetches client-side THROUGH the orchestrator
 *  `/api/live` proxy (Phase D), never directly. */
export interface LiveEndpoint {
  url: string;
  method?: 'GET' | 'POST';
  description: string;
  /** Free-text hint describing the response shape, so the Builder can write the fetch/render code. */
  shape?: string;
}

/** The Architect's complete build plan for one page — everything the Builder needs to render. */
export interface BuildSpec {
  archetype: ArchetypeSlug;
  title: string;
  /** Free-text art direction: layout, sections, tone. */
  designDirection: string;
  /** Which components/visuals to use (timeline, charts, table, map…). */
  presentation: string;
  /** Grounded facts WITH sources. May be empty on the degraded (ungrounded) path. */
  facts: BuildSpecFact[];
  /** Grounded image URLs. May be empty. */
  images: BuildSpecImage[];
  /** Present only for live-data queries (Phase D). */
  liveEndpoint?: LiveEndpoint;
  /** Build-time fallback data for the live endpoint, used if the live fetch fails (Phase D). */
  snapshot?: unknown;
}
