// Routes for the native app store: POST /api/deploy, GET /api/status/:deploymentId,
// POST /api/teardown.

import { Router, type Request, type Response } from 'express';
import { deployGeneratedApp, getDeploymentStatus } from '../store/appStore.js';
import { scheduleTeardown, teardown } from '../store/lifecycle.js';

export const deployRouter = Router();

deployRouter.post('/deploy', async (req: Request, res: Response) => {
  const { html, prompt, appName } = (req.body || {}) as { html?: string; prompt?: string; appName?: string };
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'html required' });
  try {
    const result = await deployGeneratedApp({
      html, prompt, appName: appName || prompt?.slice(0, 24) || 'app',
    });
    const schedule = scheduleTeardown({ projectId: result.projectId, delayMs: 30 * 60_000 });
    res.json({ ...result, ...schedule });
  } catch (e) {
    console.error('[/deploy] error:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

deployRouter.get('/status/:deploymentId', async (req: Request, res: Response) => {
  try {
    const d = await getDeploymentStatus({ deploymentId: req.params.deploymentId });
    res.json({ status: d.status, durationMs: d.durationMs, version: d.version });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

deployRouter.post('/teardown', async (req: Request, res: Response) => {
  const { projectId } = (req.body || {}) as { projectId?: string };
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  try {
    await teardown({ projectId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
