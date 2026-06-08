import type { DeployResponse } from '@zearch/shared';

export type Stage = 'idle' | 'thinking' | 'building' | 'ready';

export interface AppResult extends DeployResponse {
  html: string;
  prompt: string;
  error?: string;
}
