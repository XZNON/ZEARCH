// LLM provider abstraction.
// Every supported provider speaks the OpenAI-compatible POST /chat/completions
// API, so a "provider" is just transport config: base URL, credential, default
// model, token budget, and any provider-specific body fields. Selecting between
// them is done with the LLM_PROVIDER env var (default "groq"). Pointing the
// "openai" provider's OPENAI_BASE_URL elsewhere lets it drive any other
// OpenAI-compatible endpoint without new code.

export interface LLMProvider {
  name: string;
  baseURL: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  // Extra body fields merged into the request (e.g. Groq's reasoning_effort).
  extraBody: Record<string, unknown>;
}

function posInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

type ProviderFactory = () => LLMProvider;

const PROVIDERS: Record<string, ProviderFactory> = {
  groq: () => ({
    name: 'groq',
    baseURL: process.env.GROQ_BASE_URL || process.env.GROQ_BASE || 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    // Free Groq tiers cap tokens-per-minute (e.g. 8000 TPM), and max_completion_tokens
    // counts toward that budget, so the default is modest. Raise via env on a higher tier.
    maxTokens: posInt(process.env.GROQ_MAX_TOKENS, 7000),
    extraBody: { reasoning_effort: process.env.GROQ_REASONING_EFFORT || 'low' },
  }),
  openai: () => ({
    name: 'openai',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: posInt(process.env.OPENAI_MAX_TOKENS, 16000),
    extraBody: {},
  }),
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);

export function resolveProvider(name: string = process.env.LLM_PROVIDER || 'groq'): LLMProvider {
  const factory = PROVIDERS[name.toLowerCase()];
  if (!factory) {
    throw new Error(`Unknown LLM_PROVIDER "${name}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`);
  }
  return factory();
}
