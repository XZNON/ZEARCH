// wikipedia_summary Tool — fetches the Wikipedia REST summary for a page title (lead extract,
// short description, canonical URL, and thumbnail/original image URLs). Keyless and CORS-open, but
// we call it server-side regardless. Self-registers into the tool registry.
//
// Never throws: a 404 (no such page), HTTP error, timeout, or bad JSON becomes a clear ok:false
// ToolResult the Architect loop can recover from. Image search proper is A4 — the thumbnail/
// originalimage URLs here are surfaced in `data` as a convenience, not a substitute.

import { registerTool } from './registry.js';
import type { Tool, ToolResult } from './types.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('tool:wikipedia_summary');

const SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
// Wikimedia API etiquette: identify the client with a descriptive User-Agent.
const USER_AGENT = 'ZEARCH/0.1 (https://github.com/XZNON/ZEARCH)';
const TIMEOUT_MS = 15_000;

interface WikiImage {
  source?: string;
  width?: number;
  height?: number;
}
interface WikiSummary {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: WikiImage;
  originalimage?: WikiImage;
  content_urls?: { desktop?: { page?: string } };
}

export const wikipediaSummaryTool: Tool = {
  name: 'wikipedia_summary',
  description:
    "Get the Wikipedia summary for a topic: a concise lead extract, short description, canonical " +
    'page URL, and lead image. Use this for encyclopedic background on a person, place, event, or ' +
    'concept. Pass the article title (e.g. "Napoleon", not a full sentence).',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The Wikipedia article title to look up.' },
    },
    required: ['title'],
  },
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    if (!title) return { ok: false, content: 'wikipedia_summary requires a non-empty "title" string.' };

    const url = SUMMARY_BASE + encodeURIComponent(title);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });

      if (res.status === 404) {
        return { ok: false, content: `No Wikipedia page found for "${title}".` };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          ok: false,
          content: `Wikipedia request failed for "${title}": ${res.status} ${body.slice(0, 150)}`,
        };
      }

      const data = (await res.json()) as WikiSummary;
      const extract = (data.extract ?? '').trim();
      if (!extract) {
        return { ok: false, content: `Wikipedia returned no summary for "${title}".` };
      }

      const page = data.content_urls?.desktop?.page ?? '';
      const desc = data.description ? `${data.description}\n` : '';
      const content = `${data.title ?? title}\n${desc}${extract}${page ? `\nSource: ${page}` : ''}`;

      return {
        ok: true,
        content,
        data: {
          title: data.title ?? title,
          description: data.description ?? '',
          extract,
          page,
          thumbnail: data.thumbnail?.source ?? null,
          originalimage: data.originalimage?.source ?? null,
        },
      };
    } catch (e) {
      const message = (e as Error).message || String(e);
      log('lookup failed:', message);
      return { ok: false, content: `Wikipedia lookup failed for "${title}": ${message}` };
    } finally {
      clearTimeout(timer);
    }
  },
};

registerTool(wikipediaSummaryTool);
