// Archetype prompt system — public surface. The generation pipeline's future Stage A→C wiring talks
// to this module and nothing else:
//   1. Stage A calls the LLM with CLASSIFY_SYSTEM_PROMPT (see ./classify) → a ClassifyResult.
//   2. Resolve the result's `archetype` to a full system prompt via composeSystemPrompt().
//   3. Stage C generates the page with that system prompt.
//
// Three families back seven user-facing archetypes (the registry below mirrors the frontend's
// ArchetypeShowcase 1:1, so the UI labels/examples and the backend routing never drift):
//   reference   → person, event, place, concept
//   comparison  → comparison
//   interactive → tool, data
//
// STATUS: not yet imported by the live pipeline. The MVP still runs prompts/shared.ts's
// SYSTEM_PROMPT. Wiring this in is the Phase 2 task; nothing here changes runtime behavior today.

import { HARD_REQUIREMENTS, SHARED_DESIGN_FOUNDATION, QUALITY_BAR } from './hard-requirements.js';
import { buildReference, REFERENCE_ROLE, type ReferenceArchetype } from './reference.js';
import { buildComparison, COMPARISON_ROLE } from './comparison.js';
import { buildInteractive, INTERACTIVE_ROLE, type InteractiveArchetype } from './interactive.js';

export type ArchetypeFamily = 'reference' | 'comparison' | 'interactive';

// The seven fine-grained archetypes the classifier emits.
export type Archetype = ReferenceArchetype | 'comparison' | InteractiveArchetype;

export interface ArchetypeMeta {
  slug: Archetype;
  family: ArchetypeFamily;
  label: string;   // user-facing name — mirrors the frontend ArchetypeShowcase
  icon: string;    // mirrors the frontend ArchetypeShowcase
  example: string; // the canonical example prompt for this archetype
}

// Single source of truth for the taxonomy. Keep in sync with
// apps/frontend/src/components/ArchetypeShowcase.tsx (same labels, icons, examples).
export const ARCHETYPES: Record<Archetype, ArchetypeMeta> = {
  person:     { slug: 'person',     family: 'reference',   label: 'Person / Biography', icon: '👤', example: 'Napoleon Bonaparte' },
  event:      { slug: 'event',      family: 'reference',   label: 'Event / History',    icon: '📜', example: 'The French Revolution' },
  place:      { slug: 'place',      family: 'reference',   label: 'Place / Geography',  icon: '🗺️', example: 'Kyoto, Japan' },
  concept:    { slug: 'concept',    family: 'reference',   label: 'Concept / Science',  icon: '🔬', example: 'How black holes work' },
  comparison: { slug: 'comparison', family: 'comparison',  label: 'Comparison',         icon: '⚖️', example: 'React vs Vue' },
  data:       { slug: 'data',       family: 'interactive', label: 'Data / Stats',       icon: '📊', example: 'World population trends' },
  tool:       { slug: 'tool',       family: 'interactive', label: 'Tool / Calculator',  icon: '🧮', example: 'Compound interest calculator' },
};

// Per-family role line that opens the composed prompt.
const ROLE: Record<ArchetypeFamily, string> = {
  reference: REFERENCE_ROLE,
  comparison: COMPARISON_ROLE,
  interactive: INTERACTIVE_ROLE,
};

// Returns the family-specific middle section of the prompt for a given archetype.
function familyBody(slug: Archetype): string {
  switch (ARCHETYPES[slug].family) {
    case 'reference':
      return buildReference(slug as ReferenceArchetype);
    case 'comparison':
      return buildComparison();
    case 'interactive':
      return buildInteractive(slug as InteractiveArchetype);
  }
}

// Assemble the complete system prompt for an archetype, in the order the model should read it:
// role → render contract → design foundation → family-specific content/logic → quality bar.
export function composeSystemPrompt(slug: Archetype): string {
  const meta = ARCHETYPES[slug];
  return [
    ROLE[meta.family],
    HARD_REQUIREMENTS,
    SHARED_DESIGN_FOUNDATION,
    familyBody(slug),
    QUALITY_BAR,
  ].join('\n\n');
}

// Re-export the building blocks and the classify stage so the pipeline imports everything from here.
export { HARD_REQUIREMENTS, SHARED_DESIGN_FOUNDATION, QUALITY_BAR } from './hard-requirements.js';
export { type ReferenceArchetype } from './reference.js';
export { type InteractiveArchetype } from './interactive.js';
export {
  CLASSIFY_SYSTEM_PROMPT,
  buildClassifyUserMessage,
  type ClassifyResult,
} from './classify.js';
