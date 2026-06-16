// emit_build_spec — the Architect's TERMINAL tool. The Architect finishes its work by calling this
// once with the complete BuildSpec; runArchitect detects the call BY NAME and returns the parsed
// spec, ending the loop deterministically (no "more research vs final answer" ambiguity). Its
// parameters JSON-Schema mirrors the BuildSpec contract in @zearch/shared, so OpenAI forces the
// model to author the exact fields.
//
// execute() is an inert never-throws no-op: the loop returns BEFORE calling it (it only exists to
// honor the Tool contract / show up in toOpenAIToolSchemas()). The args are parsed+normalized by
// pipeline/architect.ts's specFromEmitArgs, not here.

import { registerTool } from './registry.js';
import type { Tool, ToolResult } from './types.js';

// The 7 archetype slugs — must stay in sync with ArchetypeSlug (@zearch/shared) / ARCHETYPES.
const ARCHETYPE_ENUM = ['person', 'event', 'place', 'concept', 'comparison', 'data', 'tool'];

export const emitBuildSpecTool: Tool = {
  name: 'emit_build_spec',
  description:
    'Call this exactly once, AFTER you have finished researching, with the complete BuildSpec for ' +
    'the page. This ends your work — produce no prose after calling it.',
  parameters: {
    type: 'object',
    properties: {
      archetype: {
        type: 'string',
        enum: ARCHETYPE_ENUM,
        description: 'The single page archetype that best fits the query.',
      },
      title: { type: 'string', description: 'A concise page title (no trailing punctuation).' },
      designDirection: {
        type: 'string',
        description: 'Art direction: layout, sections, and tone for the page.',
      },
      presentation: {
        type: 'string',
        description: 'Concrete components/visuals to use (timeline, map, table, chart, calculator inputs…).',
      },
      facts: {
        type: 'array',
        description: 'Grounded facts WITH sources. Never fabricate; ground each in a tool result.',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The fact.' },
            source: { type: 'string', description: 'A URL where the fact was found.' },
          },
          required: ['text'],
        },
      },
      images: {
        type: 'array',
        description: 'License-safe images from image_search only. May be empty.',
        items: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The image URL.' },
            alt: { type: 'string', description: 'Alt text.' },
            credit: { type: 'string', description: 'Attribution.' },
            license: { type: 'string', description: 'License name.' },
          },
          required: ['url'],
        },
      },
      liveEndpoint: {
        type: 'object',
        description: 'OMIT unless the page genuinely needs live data (Phase D).',
        properties: {
          url: { type: 'string' },
          method: { type: 'string', enum: ['GET', 'POST'] },
          description: { type: 'string' },
          shape: { type: 'string' },
        },
        required: ['url', 'description'],
      },
      snapshot: {
        description: 'Build-time fallback data for the live endpoint. Only with a liveEndpoint.',
      },
    },
    required: ['archetype', 'title', 'designDirection', 'presentation', 'facts', 'images'],
  },
  async execute(_args: Record<string, unknown>): Promise<ToolResult> {
    // Inert: the loop returns on detecting this call by name and never reaches execute().
    return { ok: true, content: 'spec received' };
  },
};

registerTool(emitBuildSpecTool);
