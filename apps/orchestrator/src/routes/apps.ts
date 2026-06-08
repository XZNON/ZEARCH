// Serves a deployed app's HTML at GET /app/:id.

import { Router, type Request, type Response } from 'express';
import { getApp } from '../store/appStore.js';

export const appsRouter = Router();

appsRouter.get('/app/:id', (req: Request, res: Response) => {
  const entry = getApp(req.params.id);
  if (!entry) return res.status(404).send('App not found or expired');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(entry.html);
});
