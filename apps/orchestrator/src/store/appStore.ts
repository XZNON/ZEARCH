// Native app store — generated apps are single self-contained HTML files, so "deploying" just
// means keeping the HTML in memory and mirroring it to disk, then serving it at /app/:id.
// The on-disk mirror survives a restart; the in-memory Map and teardown timers are NOT rebuilt
// from disk on restart (see ./lifecycle and Phase 5).

import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { DeployResult, DeploymentStatus } from '@zearch/shared';
import type { AppEntry } from '../types.js';
import { APPS_DIR, PUBLIC_BASE } from '../config.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('store');
const apps = new Map<string, AppEntry>();

function makeId(): string {
  return randomBytes(4).toString('hex'); // 8 hex chars, e.g. "ab12cd34"
}

export async function deployGeneratedApp(
  { html, appName, prompt }: { html: string; appName?: string; prompt?: string },
): Promise<DeployResult> {
  const id = makeId();
  apps.set(id, { html, prompt, appName, createdAt: Date.now() });

  // Best-effort disk persistence so apps survive a restart.
  try {
    await mkdir(APPS_DIR, { recursive: true });
    await writeFile(path.join(APPS_DIR, `${id}.html`), html, 'utf8');
  } catch (e) {
    log('disk persist failed (non-fatal):', (e as Error).message);
  }

  log('Deployed app', id);
  const serviceUrl = `${PUBLIC_BASE}/app/${id}`;
  // Keep the field names the frontend already consumes; they all map to one native id.
  return { id, projectId: id, serviceId: id, deploymentId: id, serviceUrl, status: 'healthy' };
}

export function getApp(id: string): AppEntry | null {
  return apps.get(id) || null;
}

// Native deploys are instant, so a freshly deployed app is immediately healthy.
export async function getDeploymentStatus(
  { deploymentId }: { deploymentId?: string },
): Promise<DeploymentStatus> {
  if (!deploymentId) return { status: 'unknown' };
  if (apps.has(deploymentId)) return { status: 'healthy', durationMs: 0, version: 1 };
  return { status: 'unknown' };
}

// Remove an app from memory + disk. Teardown-timer cleanup is handled by ./lifecycle.teardown.
export async function removeApp(id: string): Promise<void> {
  apps.delete(id);
  try {
    await rm(path.join(APPS_DIR, `${id}.html`), { force: true });
  } catch (e) {
    log('disk cleanup failed (non-fatal):', (e as Error).message);
  }
}
