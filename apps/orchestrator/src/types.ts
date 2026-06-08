// Orchestrator-internal types. The cross-process API contract lives in @zearch/shared.

export interface AppEntry {
  html: string;
  prompt?: string;
  appName?: string;
  createdAt: number;
}
