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
