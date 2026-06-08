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
