// The generation pipeline (query → interactive page).
// Phase E cutover: runArchitect(query) → BuildSpec → runBuilder(spec) → html.
// The old classify→compose→generate path is retired.

import { runArchitect } from './architect.js';
import { runBuilder } from './builder.js';
import type { BuildSpec, ArchetypeSlug } from '@zearch/shared';
import { createLogger } from '../lib/logger.js';

export { generateAppHTML } from './generate.js'; // kept: /api/update still calls it

const log = createLogger('pipeline');

export interface GenerateResult {
  html: string;
  archetype: ArchetypeSlug;
  title: string;
  grounded: boolean; // true when spec.facts.length > 0
}

export async function runGeneration(
  { prompt, provider }: { prompt: string; provider?: string },
): Promise<GenerateResult> {
  const spec: BuildSpec = await runArchitect(prompt, { provider });
  log(`archetype=${spec.archetype} grounded=${spec.facts.length > 0} title="${spec.title}"`);
  const html = await runBuilder({ spec, provider });
  return {
    html,
    archetype: spec.archetype,
    title: spec.title,
    grounded: spec.facts.length > 0,
  };
}
