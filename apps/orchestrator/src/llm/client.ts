// Provider-agnostic chat client. Given messages, calls the active provider's
// OpenAI-compatible /chat/completions endpoint and returns the assistant's text.
// This is the only module that talks HTTP to an LLM.

import { resolveProvider, type ModelTier } from './providers.js';
import type { OpenAIToolSchema } from '../tools/index.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Minimal shape of an OpenAI-compatible chat completion response (Groq, OpenAI, …).
interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

// ── Tool-calling sibling (Phase B) ─────────────────────────────────────────────
// chatCompletion() above is TEXT-ONLY and throws on empty content (correct for HTML generation).
// The Architect's tool loop needs a DIFFERENT contract: a tool-call turn legitimately has
// content:null, so chatCompletionWithTools() must NOT throw on that. It still throws on a missing
// key / non-2xx HTTP — runArchitect catches those and degrades to an ungrounded spec.

/** One tool call the model wants to make. `arguments` is a model-authored JSON STRING (parse it
 *  defensively — it can be malformed). */
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** A message in the tool loop's conversation. Mirrors the OpenAI chat message variants we use:
 *  system/user text, an assistant turn (text and/or tool_calls), and a tool result keyed by id. */
export type LoopMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string };

/** The assistant turn we hand back to runArchitect each loop iteration. */
export interface AssistantTurn {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason?: string;
}

interface ToolChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: ToolCall[] };
    finish_reason?: string;
  }>;
}

export async function chatCompletionWithTools(
  { messages, tools, toolChoice = 'auto', provider, tier = 'strong' }:
  { messages: LoopMessage[]; tools: OpenAIToolSchema[]; toolChoice?: 'auto' | 'none';
    provider?: string; tier?: ModelTier },
): Promise<AssistantTurn> {
  const llm = resolveProvider(provider, tier);
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
      tools,
      tool_choice: toolChoice,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${llm.name} API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as ToolChatCompletionResponse;
  const choice = data?.choices?.[0];
  // A tool-call turn legitimately carries content:null — do NOT throw on empty content here.
  return {
    content: choice?.message?.content ?? null,
    toolCalls: choice?.message?.tool_calls ?? [],
    finishReason: choice?.finish_reason,
  };
}

export async function chatCompletion(
  { messages, provider, tier = 'strong' }:
  { messages: ChatMessage[]; provider?: string; tier?: ModelTier },
): Promise<string> {
  const llm = resolveProvider(provider, tier);
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
