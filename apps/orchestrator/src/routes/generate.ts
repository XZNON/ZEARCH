// Routes that turn prompts into HTML: POST /api/generate and POST /api/update.

import { Router, type Request, type Response } from 'express';
import { generateAppHTML, runGeneration } from '../pipeline/index.js';

export const generateRouter = Router();

generateRouter.post('/generate', async (req: Request, res: Response) => {
  const { prompt } = (req.body || {}) as { prompt?: string };
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt required' });
  try {
    const { html, archetype, title } = await runGeneration({ prompt });
    res.json({
      html,
      sizeBytes: Buffer.byteLength(html, 'utf8'),
      archetype,
      title,
    });
  } catch (e) {
    console.error('[/generate] error:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

generateRouter.post('/update', async (req: Request, res: Response) => {
  const { prompt, previousHtml, updatePrompt } = (req.body || {}) as {
    prompt?: string; previousHtml?: string; updatePrompt?: string;
  };
  if (!previousHtml || !updatePrompt) return res.status(400).json({ error: 'previousHtml and updatePrompt required' });
  try {
    const merged = `The original app was built for this prompt: "${prompt || 'an interactive tool'}".\n\nHere is the current HTML:\n\n${previousHtml}\n\nModify this app to: ${updatePrompt}\n\nReturn the FULL updated HTML file only.`;
    const html = await generateAppHTML({ prompt: merged });
    res.json({ html });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
