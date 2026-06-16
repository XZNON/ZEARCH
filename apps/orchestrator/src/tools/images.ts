// image_search Tool — finds license-safe images via the Wikimedia Commons MediaWiki API. Commons
// (file namespace 6) is curated and license-tagged, so the URLs are safe to embed in generated
// pages. Keyless; called server-side. Self-registers into the tool registry.
//
// Never throws: no results, HTTP error, timeout, or bad JSON becomes a clear ok:false ToolResult.
// This is a flat list of {url, title, license}; galleries/lightbox come later (the Builder owns
// presentation). A4 only supplies the URLs.

import { registerTool } from './registry.js';
import type { Tool, ToolResult } from './types.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('tool:image_search');

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'ZEARCH/0.1 (https://github.com/XZNON/ZEARCH)';
const TIMEOUT_MS = 15_000;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

interface ImageInfo {
  url?: string;
  extmetadata?: { LicenseShortName?: { value?: string } };
}
interface CommonsPage {
  title?: string;
  imageinfo?: ImageInfo[];
}
interface CommonsResponse {
  query?: { pages?: Record<string, CommonsPage> };
}

export interface ImageHit {
  url: string;
  title: string;
  license: string | null;
}

export const imageSearchTool: Tool = {
  name: 'image_search',
  description:
    'Find license-safe images for a topic from Wikimedia Commons. Returns direct image URLs with ' +
    'license info, suitable for embedding in a page. Use this to illustrate a person, place, or thing.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'What to find images of (e.g. "Napoleon Bonaparte").' },
      limit: { type: 'number', description: `Max images to return (default ${DEFAULT_LIMIT}).` },
    },
    required: ['query'],
  },
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (!query) return { ok: false, content: 'image_search requires a non-empty "query" string.' };

    const limit =
      typeof args.limit === 'number' && args.limit > 0
        ? Math.min(Math.floor(args.limit), MAX_LIMIT)
        : DEFAULT_LIMIT;

    const url =
      `${COMMONS_API}?action=query&format=json&generator=search` +
      `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${limit}` +
      `&prop=imageinfo&iiprop=url%7Cextmetadata`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          ok: false,
          content: `Commons request failed for "${query}": ${res.status} ${body.slice(0, 150)}`,
        };
      }

      const data = (await res.json()) as CommonsResponse;
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];
      const hits: ImageHit[] = [];
      for (const p of pages) {
        const info = p.imageinfo?.[0];
        if (!info?.url) continue;
        hits.push({
          url: info.url,
          title: p.title ?? '(untitled)',
          license: info.extmetadata?.LicenseShortName?.value ?? null,
        });
      }

      if (hits.length === 0) {
        return { ok: false, content: `No images found for "${query}".` };
      }

      const lines = hits.map(
        (h, i) => `${i + 1}. ${h.title}${h.license ? ` [${h.license}]` : ''}\n   ${h.url}`,
      );
      return {
        ok: true,
        content: `Images for "${query}" (${hits.length}):\n${lines.join('\n')}`,
        data: hits,
      };
    } catch (e) {
      const message = (e as Error).message || String(e);
      log('search failed:', message);
      return { ok: false, content: `Image search failed for "${query}": ${message}` };
    } finally {
      clearTimeout(timer);
    }
  },
};

registerTool(imageSearchTool);
