// Stage C of the generation pipeline — turn a user prompt into a self-contained index.html.
// Builds the messages (shared system prompt + user prompt), calls the LLM, extracts the HTML, and
// HARD-VALIDATES it (real @babel parse + mount check) before returning, retrying on failure.
// Stages A (classify) and B (ground) will be added as sibling modules and composed in ./index.ts.

import { chatCompletion } from '../llm/client.js';
import { SYSTEM_PROMPT } from '../prompts/index.js';
import { extractHTML } from '../lib/html.js';
import { validateAppHTML } from '../lib/validate.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('generate');

// Models occasionally emit a page that won't compile/mount in the browser (a top-level `return`, a
// stray syntax error, no createRoot). We validate every generation server-side and regenerate with
// a targeted correction when it fails. Bounded to keep cost/latency in check.
const MAX_ATTEMPTS = 3;

export async function generateAppHTML(
  { prompt, provider, systemPrompt }:
  { prompt: string; provider?: string; systemPrompt?: string },
): Promise<string> {
  // Default = the flat SYSTEM_PROMPT, so existing callers (and /api/update) are unchanged.
  // The orchestrator (./index.ts) passes a composed per-archetype prompt for high-confidence routes.
  const system = systemPrompt ?? SYSTEM_PROMPT;
  const baseUser = `Build an interactive web app for this user prompt:\n\n"${prompt}"\n\nReturn only the HTML file.`;

  let lastHtml = '';
  let correction = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const text = await chatCompletion({
      provider,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: baseUser + correction },
      ],
    });
    const html = extractHTML(text);

    const result = validateAppHTML(html);
    if (result.ok) {
      if (attempt > 1) log(`recovered on attempt ${attempt}/${MAX_ATTEMPTS}`);
      return html;
    }

    lastHtml = html;
    log(`attempt ${attempt}/${MAX_ATTEMPTS} invalid: ${result.reason}`);
    // Feed the concrete failure back so the next attempt fixes THIS problem, not a generic one.
    correction =
      `\n\nYOUR PREVIOUS OUTPUT WAS REJECTED because ${result.reason}. ` +
      'Return a COMPLETE, corrected HTML file: all JSX inside a top-level `function App() { ... }`, ' +
      'no bare top-level `return`, and mount with ' +
      '`ReactDOM.createRoot(document.getElementById("root")).render(<App />);` as the last line of the babel script.';
  }

  // All attempts failed validation. Returning the last attempt (rather than throwing) still gives
  // the caller HTML; the repeated failure is already logged for diagnosis.
  log(`all ${MAX_ATTEMPTS} attempts failed validation — shipping last attempt`);
  return lastHtml;
}
