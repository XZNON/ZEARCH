// Centralized, typed access to orchestrator environment configuration.
// Every other module imports from here instead of reading process.env directly.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT) || 8080;

// Must be the publicly reachable orchestrator origin so iframe serviceUrls resolve.
export const PUBLIC_BASE = process.env.PUBLIC_BASE || `http://localhost:${PORT}`;

// On-disk mirror of generated apps. Defaults to apps/orchestrator/apps (package root, not src/).
export const APPS_DIR = process.env.APPS_DIR || path.join(__dirname, '..', 'apps');

// Tavily web-search key (Phase A web_search tool). Optional: when unset the tool degrades to a
// clear ok:false failure rather than throwing. Loaded from the repo-root .env (gitignored).
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
