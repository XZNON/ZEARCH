// Orchestrator entry point — log the active LLM provider, then start the server.

import { createApp } from './server.js';
import { PORT } from './config.js';
import { resolveProvider } from './llm/providers.js';

try {
  const llm = resolveProvider();
  console.log(`[zearch] LLM provider: ${llm.name} (model ${llm.model})`);
  if (!llm.apiKey) console.warn(`[zearch] ${llm.name.toUpperCase()}_API_KEY not set — /api/generate will fail`);
} catch (e) {
  console.warn('[zearch]', (e as Error).message);
}

const app = createApp();
app.listen(PORT, '0.0.0.0', () => console.log(`[zearch-orchestrator] listening on :${PORT}`));
