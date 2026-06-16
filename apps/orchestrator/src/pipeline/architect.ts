// Stage 1 of the Agentic Core — the Architect. runArchitect(query) runs an OpenAI function-calling
// loop over the Phase-A tool registry: it researches the query (web_search / wikipedia_summary /
// image_search), then finishes by calling the terminal emit_build_spec tool, whose args become the
// BuildSpec the Builder (Phase C) renders.
//
// CONTRACT: runArchitect NEVER throws. On ANY failure (no key, LLM/HTTP error, timeout, no terminal
// call, unparseable args) it returns ungroundedSpec(query) so the Builder always has input. This
// mirrors the never-throws contract of pipeline/classify.ts. ADDITIVE: nothing here is wired into
// the live pipeline — cutover (runGeneration = Architect → Builder) is Phase E.

import type { BuildSpec, ArchetypeSlug, BuildSpecFact, BuildSpecImage } from '@zearch/shared';
import {
  chatCompletionWithTools, type LoopMessage, type ToolCall,
} from '../llm/client.js';
import { getTool, toOpenAIToolSchemas } from '../tools/index.js';
import { ARCHITECT_SYSTEM_PROMPT, buildArchitectUserMessage } from '../prompts/architect.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('architect');

const MAX_ITERATIONS = 8;       // hard cap on model turns — bounds cost/latency.
const WALL_CLOCK_MS = 90_000;   // overall deadline for the whole loop.
const EMIT_TOOL = 'emit_build_spec';

// The 7 valid archetype slugs as a Set, for validating the model's choice. Mirrors ArchetypeSlug.
const ARCHETYPE_SLUGS: ReadonlySet<string> = new Set<ArchetypeSlug>([
  'person', 'event', 'place', 'concept', 'comparison', 'data', 'tool',
]);

export async function runArchitect(
  query: string, opts?: { provider?: string },
): Promise<BuildSpec> {
  const deadline = Date.now() + WALL_CLOCK_MS;
  const tools = toOpenAIToolSchemas();
  const messages: LoopMessage[] = [
    { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
    { role: 'user', content: buildArchitectUserMessage(query) },
  ];

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (Date.now() > deadline) {
        log('wall-clock deadline hit, degrading to ungrounded spec');
        break;
      }

      const turn = await chatCompletionWithTools({
        messages, tools, provider: opts?.provider, tier: 'strong',
      });

      // No tool calls → the model is done talking but never emitted a spec. Degrade.
      if (turn.toolCalls.length === 0) {
        log('assistant turn had no tool calls, degrading to ungrounded spec');
        break;
      }

      // Terminal call → parse its args into the final spec and return (grounded path).
      const emitCall = turn.toolCalls.find((c) => c.function.name === EMIT_TOOL);
      if (emitCall) {
        return specFromEmitArgs(emitCall.function.arguments, query);
      }

      // Otherwise: append the assistant turn, then answer EVERY tool call (matching tool_call_id)
      // with a role:'tool' message — OpenAI 400s if any call goes unanswered before the next turn.
      messages.push({ role: 'assistant', content: turn.content, tool_calls: turn.toolCalls });
      for (const call of turn.toolCalls) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: await runToolCall(call),
        });
      }
    }
  } catch (e) {
    log('LLM call failed, degrading to ungrounded spec:', (e as Error).message);
  }

  return ungroundedSpec(query);
}

// Execute one tool call, never throwing. Unknown tool or unparseable args → a clear string the model
// can read on the next turn; otherwise the tool's own (never-throws) ToolResult.content.
async function runToolCall(call: ToolCall): Promise<string> {
  const { name, arguments: rawArgs } = call.function;
  const tool = getTool(name);
  if (!tool) return `Error: unknown tool "${name}".`;

  let args: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawArgs || '{}');
    args = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return `Error: could not parse arguments for "${name}" as JSON.`;
  }

  const result = await tool.execute(args);
  return result.content;
}

// Defensively parse + clamp the emit_build_spec arguments (a model-authored JSON STRING that can be
// malformed) into a valid BuildSpec. Reuses classify.ts's fence-strip + outermost-{…}-slice trick.
// Anything missing/garbled is filled from the query or sane defaults — never throws.
function specFromEmitArgs(rawArgs: string, query: string): BuildSpec {
  const obj = parseEmitJSON(rawArgs);
  if (!obj) {
    log('emit_build_spec args unparseable, degrading to ungrounded spec');
    return ungroundedSpec(query);
  }

  const archetype: ArchetypeSlug =
    typeof obj.archetype === 'string' && ARCHETYPE_SLUGS.has(obj.archetype)
      ? (obj.archetype as ArchetypeSlug)
      : 'concept';

  const spec: BuildSpec = {
    archetype,
    title: nonEmptyString(obj.title) ?? query,
    designDirection: nonEmptyString(obj.designDirection) ?? '',
    presentation: nonEmptyString(obj.presentation) ?? '',
    facts: normalizeFacts(obj.facts),
    images: normalizeImages(obj.images),
  };

  const live = normalizeLiveEndpoint(obj.liveEndpoint);
  if (live) {
    spec.liveEndpoint = live;
    if ('snapshot' in obj) spec.snapshot = obj.snapshot;
  }
  return spec;
}

function parseEmitJSON(raw: string): Record<string, unknown> | null {
  let s = (raw || '').trim();
  const fence = s.match(/```(?:json)?\s*\n([\s\S]*?)\n```/i);
  if (fence) s = fence[1].trim();

  const tryParse = (text: string): Record<string, unknown> | null => {
    try {
      const o = JSON.parse(text);
      return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
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

function nonEmptyString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v : undefined;
}

function normalizeFacts(v: unknown): BuildSpecFact[] {
  if (!Array.isArray(v)) return [];
  const facts: BuildSpecFact[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const text = nonEmptyString(rec.text);
    if (!text) continue;
    const fact: BuildSpecFact = { text };
    const source = nonEmptyString(rec.source);
    if (source) fact.source = source;
    facts.push(fact);
  }
  return facts;
}

function normalizeImages(v: unknown): BuildSpecImage[] {
  if (!Array.isArray(v)) return [];
  const images: BuildSpecImage[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const url = nonEmptyString(rec.url);
    if (!url) continue;
    const img: BuildSpecImage = { url };
    const alt = nonEmptyString(rec.alt);
    const credit = nonEmptyString(rec.credit);
    const license = nonEmptyString(rec.license);
    if (alt) img.alt = alt;
    if (credit) img.credit = credit;
    if (license) img.license = license;
    images.push(img);
  }
  return images;
}

function normalizeLiveEndpoint(v: unknown): BuildSpec['liveEndpoint'] | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const rec = v as Record<string, unknown>;
  const url = nonEmptyString(rec.url);
  const description = nonEmptyString(rec.description);
  if (!url || !description) return undefined;
  const endpoint: NonNullable<BuildSpec['liveEndpoint']> = { url, description };
  if (rec.method === 'GET' || rec.method === 'POST') endpoint.method = rec.method;
  const shape = nonEmptyString(rec.shape);
  if (shape) endpoint.shape = shape;
  return endpoint;
}

// The degraded fallback: a minimal, ungrounded spec so the Builder always has input. 'concept' is
// the safe, most general archetype (mirrors classify.ts's fallback). facts/images empty — Phase E
// can derive "grounded" from spec.facts.length > 0.
function ungroundedSpec(query: string): BuildSpec {
  return {
    archetype: 'concept',
    title: query,
    designDirection:
      'A clean, editorial explainer page: a clear hero with the title, a concise introduction, ' +
      'and a few well-structured sections covering the essentials of the topic.',
    presentation: 'Hero, intro paragraph, and sectioned fact cards. No charts unless data warrants.',
    facts: [],
    images: [],
  };
}
