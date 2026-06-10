// The generation pipeline (query → interactive page). Stages compose here:
//   A classify  →  B ground  →  C generate
// Today A (classify) and C (generate) are wired; B (ground) slots into the marked seam below.
//
// runGeneration is the single orchestration point. generateAppHTML stays a dumb Stage-C
// generator parameterized by one system prompt, and is re-exported so /api/update and any other
// caller keep using the flat-prompt path unchanged.

import { generateAppHTML } from './generate.js';
import { classifyQuery } from './classify.js';
import { composeSystemPrompt } from '../prompts/archetypes/index.js';
import type { ClassifyResult } from '../prompts/archetypes/index.js';
import { createLogger } from '../lib/logger.js';

export { generateAppHTML } from './generate.js';

const log = createLogger('pipeline');

// Below this self-rated classifier confidence we distrust the archetype and cut over to the flat
// SYSTEM_PROMPT. Single tuning knob (env-source later if wanted).
const CONFIDENCE_FLOOR = 0.4;

export interface GenerateResult {
  html: string;
  classification: ClassifyResult | null; // null when the flat-prompt fallback was used
}

export async function runGeneration(
  { prompt, provider }: { prompt: string; provider?: string },
): Promise<GenerateResult> {
  // Stage A — classify. classifyQuery never throws; on any failure it returns the 'concept'
  // archetype with confidence 0 (archetype-level fallback), which the floor below then catches.
  const c = await classifyQuery(prompt, { provider });

  if (c.confidence >= CONFIDENCE_FLOOR) {
    // High-confidence valid archetype → generate with its composed per-archetype system prompt.
    // (A genuine high-confidence 'concept' still routes here — the flat cutover is for
    // low-confidence/failure only, not merely because archetype === 'concept'.)
    const systemPrompt = composeSystemPrompt(c.archetype);
    // ← Stage B (grounding) will later slot in here, consuming c.subjects / c.brief.
    log(`archetype=${c.archetype} confidence=${c.confidence} → composed prompt`);
    const html = await generateAppHTML({ prompt, provider, systemPrompt });
    return { html, classification: c };
  }

  // Low confidence (or the confidence-0 classifier fallback) → full safety net: flat SYSTEM_PROMPT.
  log(`confidence ${c.confidence} < ${CONFIDENCE_FLOOR} → flat SYSTEM_PROMPT cutover`);
  const html = await generateAppHTML({ prompt, provider });
  return { html, classification: null };
}
