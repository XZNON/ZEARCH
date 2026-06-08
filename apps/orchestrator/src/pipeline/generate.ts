// Stage C of the generation pipeline — turn a user prompt into a self-contained index.html.
// Builds the messages (shared system prompt + user prompt), calls the LLM, and extracts the HTML.
// Stages A (classify) and B (ground) will be added as sibling modules and composed in ./index.ts.

import { chatCompletion } from '../llm/client.js';
import { SYSTEM_PROMPT } from '../prompts/index.js';
import { extractHTML } from '../lib/html.js';

export async function generateAppHTML(
  { prompt, provider }: { prompt: string; provider?: string },
): Promise<string> {
  const userMsg = `Build an interactive web app for this user prompt:\n\n"${prompt}"\n\nReturn only the HTML file.`;
  const text = await chatCompletion({
    provider,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
  });
  return extractHTML(text);
}
