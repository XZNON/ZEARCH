// Builds the Express app: middleware + route mounting only. Booting (listen) is in ./index.ts.

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { generateRouter } from './routes/generate.js';
import { deployRouter } from './routes/deploy.js';
import { appsRouter } from './routes/apps.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  // /api/generate, /api/update, /api/deploy, /api/status/:id, /api/teardown
  app.use('/api', generateRouter);
  app.use('/api', deployRouter);
  // GET /app/:id
  app.use('/', appsRouter);

  return app;
}
