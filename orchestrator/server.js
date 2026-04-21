import express from 'express';
import cors from 'cors';
import { generateAppHTML } from './generator.js';
import { deployGeneratedApp, getDeploymentStatus, teardown, scheduleTeardown } from './deployer.js';

const PORT = process.env.PORT || 8080;
const LOCUS_API_KEY = process.env.LOCUS_API_KEY;
const LOCUS_BUILD_TOKEN = process.env.LOCUS_BUILD_TOKEN;
const LOCUS_WORKSPACE_ID = process.env.LOCUS_WORKSPACE_ID || 'ws_93c177e2';

if (!LOCUS_API_KEY) console.warn('[zearch] LOCUS_API_KEY not set — /generate will fail');
if (!LOCUS_BUILD_TOKEN) console.warn('[zearch] LOCUS_BUILD_TOKEN not set — /deploy will fail');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt required' });
  try {
    const html = await generateAppHTML({ prompt, apiKey: LOCUS_API_KEY });
    res.json({ html, sizeBytes: Buffer.byteLength(html, 'utf8') });
  } catch (e) {
    console.error('[/generate] error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/deploy', async (req, res) => {
  const { html, prompt, appName } = req.body || {};
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'html required' });
  try {
    const result = await deployGeneratedApp({
      html, jwt: LOCUS_BUILD_TOKEN, apiKey: LOCUS_API_KEY,
      workspaceId: LOCUS_WORKSPACE_ID, appName: appName || prompt?.slice(0, 24) || 'app',
    });
    const schedule = scheduleTeardown({ jwt: LOCUS_BUILD_TOKEN, projectId: result.projectId, delayMs: 30 * 60_000 });
    res.json({ ...result, ...schedule });
  } catch (e) {
    console.error('[/deploy] error:', e);
    res.status(500).json({ error: e.message, details: e.body });
  }
});

app.get('/api/status/:deploymentId', async (req, res) => {
  try {
    const d = await getDeploymentStatus({ jwt: LOCUS_BUILD_TOKEN, deploymentId: req.params.deploymentId });
    res.json({ status: d.status, durationMs: d.durationMs, version: d.version });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/teardown', async (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  try {
    await teardown({ jwt: LOCUS_BUILD_TOKEN, projectId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/update', async (req, res) => {
  const { prompt, previousHtml, updatePrompt } = req.body || {};
  if (!previousHtml || !updatePrompt) return res.status(400).json({ error: 'previousHtml and updatePrompt required' });
  try {
    const merged = `The original app was built for this prompt: "${prompt || 'an interactive tool'}".\n\nHere is the current HTML:\n\n${previousHtml}\n\nModify this app to: ${updatePrompt}\n\nReturn the FULL updated HTML file only.`;
    const html = await generateAppHTML({ prompt: merged, apiKey: LOCUS_API_KEY });
    res.json({ html });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`[zearch-orchestrator] listening on :${PORT}`));
