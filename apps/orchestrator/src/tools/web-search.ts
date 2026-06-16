// web_search Tool — the Architect's primary grounding tool. Delegates to the ACTIVE SearchProvider
// (Tavily today) through the SearchProvider seam, so it never knows which backend answered. Formats
// the hits into a compact, model-readable `content` string and self-registers into the tool registry.
//
// Never throws: any provider failure (missing key, HTTP error, timeout, no results) becomes a clear
// ok:false ToolResult the Architect loop can recover from.

import { registerTool } from './registry.js';
import type { Tool, ToolResult } from './types.js';
import type { SearchProvider, SearchHit } from './search/types.js';
import { tavilyProvider } from './search/tavily.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('tool:web_search');

// The active provider. Swap this (or make it env-driven) to change search backends — the Tool body
// below is provider-agnostic.
const provider: SearchProvider = tavilyProvider;

const MAX_SNIPPET = 500;

function formatHits(query: string, hits: SearchHit[]): string {
  const lines = hits.map((h, i) => {
    const snippet = h.content.length > MAX_SNIPPET ? `${h.content.slice(0, MAX_SNIPPET)}…` : h.content;
    return `${i + 1}. ${h.title}\n   ${h.url}\n   ${snippet}`;
  });
  return `Web search results for "${query}" (${hits.length}):\n${lines.join('\n\n')}`;
}

export const webSearchTool: Tool = {
  name: 'web_search',
  description:
    'Search the web for up-to-date information on a topic and get extracted content from the top ' +
    'results. Use this to gather facts, context, and sources before building a page.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' },
      max_results: {
        type: 'number',
        description: 'How many results to return (default 5).',
      },
    },
    required: ['query'],
  },
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (!query) return { ok: false, content: 'web_search requires a non-empty "query" string.' };

    const maxResults =
      typeof args.max_results === 'number' && args.max_results > 0
        ? Math.min(Math.floor(args.max_results), 10)
        : undefined;

    try {
      const hits = await provider.search(query, { maxResults });
      if (hits.length === 0) {
        return { ok: false, content: `No web results found for "${query}".` };
      }
      return { ok: true, content: formatHits(query, hits), data: hits };
    } catch (e) {
      const message = (e as Error).message || String(e);
      log('search failed:', message);
      return { ok: false, content: `Web search failed for "${query}": ${message}` };
    }
  },
};

registerTool(webSearchTool);
