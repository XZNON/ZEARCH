// Tavily implementation of the SearchProvider seam. POSTs to Tavily's /search endpoint (search +
// content extraction in one call) and maps its results to SearchHit[]. Reads the key from config,
// not process.env directly.
//
// This module lets errors propagate (missing key, HTTP failure) — the web_search Tool wrapping it
// owns the never-throws contract and converts thrown errors into an ok:false ToolResult.

import { TAVILY_API_KEY } from '../../config.js';
import type { SearchHit, SearchProvider } from './types.js';

const TAVILY_URL = 'https://api.tavily.com/search';
const TIMEOUT_MS = 15_000;

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string | null;
}
interface TavilyResponse {
  results?: TavilyResult[];
}

export const tavilyProvider: SearchProvider = {
  name: 'tavily',
  async search(query: string, opts?: { maxResults?: number }): Promise<SearchHit[]> {
    if (!TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY not set (add it to the repo-root .env)');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(TAVILY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          max_results: opts?.maxResults ?? 5,
          search_depth: 'advanced',
          include_answer: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Tavily API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as TavilyResponse;
    return (data.results ?? []).map((r) => ({
      title: r.title ?? r.url ?? '(untitled)',
      url: r.url ?? '',
      content: (r.raw_content || r.content || '').trim(),
    }));
  },
};
