import type { DeployResponse } from '@zearch/shared';

// Cosmetic build-stage machine (native hosting is instant, so most stages are decorative).
export type Stage = 'idle' | 'generating' | 'packaging' | 'pushing' | 'building' | 'deploying' | 'healthy';

// The deployed app the UI is showing: server deploy response + the generated HTML and the
// originating prompt (client-only), plus an optional error field endpoints may return.
export interface AppResult extends DeployResponse {
  html: string;
  prompt: string;
  error?: string;
}
