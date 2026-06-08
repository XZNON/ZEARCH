// App lifecycle — apps auto-destroy after an idle delay. Timers live in process memory and are
// not rebuilt on restart (a restart drops pending teardowns; see Phase 5).

import type { ScheduleResult } from '@zearch/shared';
import { removeApp } from './appStore.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('lifecycle');
const idleTimers = new Map<string, NodeJS.Timeout>();

export async function teardown({ projectId }: { projectId: string }): Promise<void> {
  log('Tearing down app', projectId);
  await removeApp(projectId);
  const t = idleTimers.get(projectId);
  if (t) {
    clearTimeout(t);
    idleTimers.delete(projectId);
  }
}

export function scheduleTeardown(
  { projectId, delayMs = 30 * 60_000 }: { projectId: string; delayMs?: number },
): ScheduleResult {
  const existing = idleTimers.get(projectId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => { void teardown({ projectId }); }, delayMs);
  timer.unref?.();
  idleTimers.set(projectId, timer);
  return { tearDownAt: new Date(Date.now() + delayMs).toISOString() };
}
