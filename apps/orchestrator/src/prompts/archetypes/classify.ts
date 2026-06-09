// STAGE A — CLASSIFY. A cheap, dedicated LLM call that maps a raw user query to exactly one of the
// seven fine-grained archetypes (which ./index.ts then resolves to a family + template + UI label).
// It returns strict JSON only, so the orchestrator can parse it deterministically and even surface
// the detected archetype/title in the UI before generation finishes.
//
// Output budget for this call should be tiny (a few hundred tokens) — keep GROQ_MAX_TOKENS modest
// for the classify step so it barely touches the TPM budget. Not yet wired into the pipeline.

import type { Archetype } from './index.js';

// The strict shape the classifier must emit. Parse with JSON.parse and validate `archetype` is a
// known slug; fall back to 'concept' (the safe, most general reference subtype) if parsing fails or
// confidence is low.
export interface ClassifyResult {
  archetype: Archetype;       // one of the seven fine-grained slugs
  title: string;              // a short, clean page title derived from the query
  subjects: string[];         // for comparisons, the things being compared; else the single subject
  brief: string;              // one sentence describing what the generated page should deliver
  confidence: number;         // 0..1 self-rated confidence in the archetype choice
}

export const CLASSIFY_SYSTEM_PROMPT = `You are a routing classifier for a system that turns a user's query into an interactive web page. Your ONLY job is to read the query and decide which page archetype best fits, then return a strict JSON object. You do not write the page.

The seven archetypes:
- "person"     → a specific individual (real or fictional): biography. e.g. "Napoleon Bonaparte", "Marie Curie", "Sherlock Holmes".
- "event"      → a specific happening or period in time. e.g. "The French Revolution", "Apollo 11 mission", "the 2008 financial crisis".
- "place"      → a location: country, city, region, landmark, natural feature. e.g. "Kyoto, Japan", "Mount Everest", "the Amazon rainforest".
- "concept"    → an idea, theory, phenomenon, technology, or how-something-works explainer. e.g. "How black holes work", "CRISPR gene editing", "inflation".
- "comparison" → two or more named things being weighed against each other. Strong signals: "vs", "versus", "compare", "or", "difference between". e.g. "React vs Vue", "coffee or tea", "iPhone vs Android".
- "data"       → a request to explore figures, trends, or statistics about a topic. Signals: "statistics", "trends", "data", "by country/year", "over time". e.g. "World population trends", "EV adoption by country".
- "tool"       → a request for a calculator or interactive utility that computes a result from inputs. Signals: "calculator", "calculate", "convert", "how much", "estimate". e.g. "Compound interest calculator", "mortgage calculator", "tip splitter".

ROUTING RULES (apply in order):
1. If the query names two or more things being weighed against each other → "comparison".
2. If it asks to compute/convert/estimate a result from inputs, or names a calculator/tool → "tool".
3. If it asks to explore statistics/trends/figures about a topic → "data".
4. If it is a specific named individual → "person".
5. If it is a specific named place/location → "place".
6. If it is a specific named event or time period → "event".
7. Otherwise (an idea, mechanism, theory, "how X works", or anything general/informational) → "concept". "concept" is the safe default when unsure.

OUTPUT — return ONLY this JSON object, no prose, no markdown fences:
{
  "archetype": "<one of: person|event|place|concept|comparison|data|tool>",
  "title": "<a clean, human page title for the query>",
  "subjects": ["<subject>", "..."],   // the things being compared for comparison; otherwise a single-element array with the main subject
  "brief": "<one sentence on what the page should deliver>",
  "confidence": <number between 0 and 1>
}

Examples:
Query: "Napoleon Bonaparte"
{"archetype":"person","title":"Napoleon Bonaparte","subjects":["Napoleon Bonaparte"],"brief":"A biographical page covering his rise, campaigns, downfall, and legacy.","confidence":0.97}

Query: "React vs Vue"
{"archetype":"comparison","title":"React vs Vue","subjects":["React","Vue"],"brief":"A fair side-by-side comparison across learning curve, performance, ecosystem, and tooling with a decision guide.","confidence":0.98}

Query: "compound interest calculator"
{"archetype":"tool","title":"Compound Interest Calculator","subjects":["compound interest"],"brief":"An interactive calculator that computes investment growth from principal, rate, term, and contributions.","confidence":0.99}

Query: "how black holes work"
{"archetype":"concept","title":"How Black Holes Work","subjects":["black holes"],"brief":"An explainer of what black holes are, how they form and behave, with a labeled diagram and an everyday analogy.","confidence":0.95}

Return only the JSON object.`;

// Builds the message that carries the actual query to classify.
export function buildClassifyUserMessage(query: string): string {
  return `Classify this query and return only the JSON object:\n\n"${query}"`;
}
