// Prompt templates live here. Today the live pipeline uses the one shared base prompt below.
//
// Phase 2 (built, not yet wired): ./archetypes/ holds the full per-archetype prompt system —
// a Stage-A classifier (./archetypes/classify) plus three template families (reference,
// comparison, interactive) composed via composeSystemPrompt(). To switch the pipeline over,
// import { CLASSIFY_SYSTEM_PROMPT, composeSystemPrompt } from './archetypes/index.js' in
// pipeline/index.ts. Nothing imports ./archetypes yet, so the MVP is unaffected.

export { SYSTEM_PROMPT } from './shared.js';
