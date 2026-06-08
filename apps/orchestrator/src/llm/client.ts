// Provider-agnostic chat client. Given messages, calls the active provider's
// OpenAI-compatible /chat/completions endpoint and returns the assistant's text.
// This is the only module that talks HTTP to an LLM.

import { resolveProvider } from './providers.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Minimal shape of an OpenAI-compatible chat completion response (Groq, OpenAI, …).
interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export async function chatCompletion(
  { messages, provider }: { messages: ChatMessage[]; provider?: string },
): Promise<string> {
  const llm = resolveProvider(provider);
  if (!llm.apiKey) throw new Error(`${llm.name} API key not set (set ${llm.name.toUpperCase()}_API_KEY)`);

  const res = await fetch(`${llm.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${llm.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: llm.model,
      max_completion_tokens: llm.maxTokens,
      temperature: 0.7,
      ...llm.extraBody,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${llm.name} API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error(`Empty completion from ${llm.name}`);
  return text;
}
