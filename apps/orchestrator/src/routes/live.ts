// CORS-bypass proxy for live data fetches from generated pages. GET /live?url=<encoded>
// OPTIONS /live → 204 preflight. Caches responses with lazy eviction.

import { Router, type Request, type Response } from 'express';
import { LIVE_PROXY_ALLOW_HOSTS, LIVE_PROXY_CACHE_TTL_S, LIVE_PROXY_API_KEY } from '../config.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('live');

const allowedHosts = new Set<string>(
  LIVE_PROXY_ALLOW_HOSTS.split(',').map(s => s.trim()).filter(Boolean)
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

interface CacheEntry {
  body: string;
  contentType: string;
  expiresAt: number;
}

const proxyCache = new Map<string, CacheEntry>();

export const liveRouter = Router();

liveRouter.options('/live', (_req: Request, res: Response) => {
  res.set(CORS_HEADERS).status(204).end();
});

liveRouter.get('/live', async (req: Request, res: Response) => {
  const rawUrl = typeof req.query['url'] === 'string' ? req.query['url'] : '';
  if (!rawUrl) {
    return res.set(CORS_HEADERS).status(400).json({ error: 'url query parameter is required' });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.set(CORS_HEADERS).status(400).json({ error: 'url is not a valid URL' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.set(CORS_HEADERS).status(400).json({ error: 'url must use http or https' });
  }

  if (allowedHosts.size > 0 && !allowedHosts.has(parsed.hostname)) {
    return res.set(CORS_HEADERS).status(403).json({ error: `host ${parsed.hostname} is not in the proxy allowlist` });
  }

  const cached = proxyCache.get(rawUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return res
      .set({ ...CORS_HEADERS, 'Content-Type': cached.contentType, 'X-Cache': 'HIT' })
      .status(200)
      .send(cached.body);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const upstreamHeaders: Record<string, string> = {
      'Accept': (req.headers['accept'] as string) || '*/*',
    };
    if (req.headers['accept-language']) {
      upstreamHeaders['Accept-Language'] = req.headers['accept-language'] as string;
    }
    if (LIVE_PROXY_API_KEY) {
      upstreamHeaders['Authorization'] = `Bearer ${LIVE_PROXY_API_KEY}`;
    }

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(rawUrl, { headers: upstreamHeaders, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => '');
      return res
        .set(CORS_HEADERS)
        .status(upstream.status)
        .send(errBody || `Upstream returned ${upstream.status}`);
    }

    const body = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    const now = Date.now();
    for (const [key, entry] of proxyCache) {
      if (entry.expiresAt < now) proxyCache.delete(key);
    }
    proxyCache.set(rawUrl, { body, contentType, expiresAt: now + LIVE_PROXY_CACHE_TTL_S * 1000 });

    return res
      .set({ ...CORS_HEADERS, 'Content-Type': contentType, 'X-Cache': 'MISS' })
      .status(200)
      .send(body);

  } catch (e) {
    log('proxy error:', e);
    return res.set(CORS_HEADERS).status(500).json({ error: (e as Error).message });
  }
});
