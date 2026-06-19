import type { DeployResponse } from '@zearch/shared';

export type Stage = 'idle' | 'planning' | 'researching' | 'building' | 'ready';

export interface AppResult extends DeployResponse {
  html: string;
  prompt: string;
  error?: string;
}
