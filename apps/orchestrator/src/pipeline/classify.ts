// RETIRED in Phase E. classifyQuery is no longer called by the pipeline.
// pipeline/index.ts now routes through runArchitect → runBuilder.
// This file is kept for reference. Safe to delete once Phase E is confirmed stable.

// Stage A of the generation pipeline — classify a raw query into one of the seven archetypes.
// Calls the cheap model tier (P2-4) with the prebuilt CLASSIFY_SYSTEM_PROMPT, parses the strict
// JSON it returns, and normalizes/validates it into a ClassifyResult.
//
// CONTRACT: classifyQuery NEVER throws. On any failure (HTTP error, empty/garbled completion,
// non-JSON, or an unknown archetype) it returns fallbackResult(query) — the 'concept' archetype
// with confidence 0. This is the archetype-level fallback; the orchestrator's confidence floor
// (P2-3) is the second, full safety net that cuts over to the flat prompt.

import { chatCompletion } from '../llm/client.js';
import {
  CLASSIFY_SYSTEM_PROMPT, buildClassifyUserMessage, ARCHETYPES,
  type ClassifyResult,
} from '../prompts/archetypes/index.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('classify');

export async function classifyQuery(
  query: string, opts?: { provider?: string },
): Promise<ClassifyResult> {
  let raw: string;
  try {
    raw = await chatCompletion({
      provider: opts?.provider,
      tier: 'cheap',
      messages: [
        { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
        { role: 'user', content: buildClassifyUserMessage(query) },
      ],
    });
  } catch (e) {
    log('LLM call failed, falling back to concept:', (e as Error).message);
    return fallbackResult(query);
  }

  const parsed = parseClassifyJSON(raw);
  if (!parsed || !isValidResult(parsed)) {
    log('unparseable/invalid classification, falling back to concept:', raw.slice(0, 200));
    return fallbackResult(query);
  }
  return normalize(parsed, query);
}

// Parse the classifier's completion into a loose object. Strips an accidental ```json fence,
// then (second chance) slices the outermost { … } before JSON.parse. Returns null on any throw.
function parseClassifyJSON(raw: string): Record<string, unknown> | null {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*\n([\s\S]*?)\n```/i);
  if (fence) s = fence[1].trim();

  const tryParse = (text: string): Record<string, unknown> | null => {
    try {
      const obj = JSON.parse(text);
      return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(s);
  if (direct) return direct;

  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) return tryParse(s.slice(start, end + 1));
  return null;
}

// The ONLY hard-fail trigger is an unknown archetype — everything else is coerced in normalize().
function isValidResult(obj: Record<string, unknown>): boolean {
  return typeof obj.archetype === 'string' && obj.archetype in ARCHETYPES;
}

// Defensively coerce a validated object into a ClassifyResult. archetype is already known-good;
// the rest is filled/clamped so a good classification is never discarded over a missing field.
function normalize(obj: Record<string, unknown>, query: string): ClassifyResult {
  const subjects = Array.isArray(obj.subjects)
    ? obj.subjects.filter((s): s is string => typeof s === 'string' && s.length > 0)
    : [];
  const confidenceRaw = Number(obj.confidence);
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0;
  return {
    archetype: obj.archetype as ClassifyResult['archetype'],
    title: typeof obj.title === 'string' && obj.title.length > 0 ? obj.title : query,
    subjects: subjects.length > 0 ? subjects : [query],
    brief: typeof obj.brief === 'string' ? obj.brief : '',
    confidence,
  };
}

// Safe default when classification fails. confidence 0 so P2-3's floor also treats it as low.
function fallbackResult(query: string): ClassifyResult {
  return { archetype: 'concept', title: query, subjects: [query], brief: '', confidence: 0 };
}
