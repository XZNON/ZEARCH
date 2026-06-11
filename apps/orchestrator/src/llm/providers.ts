export interface LLMProvider {
  name: string;
  baseURL: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  // Extra body fields merged into the request (e.g. Groq's reasoning_effort).
  extraBody: Record<string, unknown>;
}

export type ModelTier = "cheap" | "strong";

function posInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

type ProviderFactory = (tier: ModelTier) => LLMProvider;

const PROVIDERS: Record<string, ProviderFactory> = {
  groq: (tier) => ({
    name: "groq",
    baseURL:
      process.env.GROQ_BASE_URL ||
      process.env.GROQ_BASE ||
      "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
    // Cheap tier swaps gpt-oss-120b → a small fast model with a tiny budget for classification;
    // strong tier is the unchanged generation config.
    model:
      tier === "cheap"
        ? process.env.GROQ_CLASSIFY_MODEL || "llama-3.1-8b-instant"
        : process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    // Free Groq tiers cap tokens-per-minute (e.g. 8000 TPM), and max_completion_tokens
    // counts toward that budget, so the default is modest. Raise via env on a higher tier.
    maxTokens:
      tier === "cheap"
        ? posInt(process.env.GROQ_CLASSIFY_MAX_TOKENS, 512)
        : posInt(process.env.GROQ_MAX_TOKENS, 7000),
    extraBody: {
      reasoning_effort:
        tier === "cheap"
          ? process.env.GROQ_CLASSIFY_REASONING_EFFORT || "low"
          : process.env.GROQ_REASONING_EFFORT || "low",
    },
  }),
  openai: (tier) => ({
    name: "openai",
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model:
      tier === "cheap"
        ? process.env.OPENAI_CLASSIFY_MODEL || "gpt-4o-mini"
        : process.env.OPENAI_MODEL || "gpt-5.4-mini",
    maxTokens:
      tier === "cheap"
        ? posInt(process.env.OPENAI_CLASSIFY_MAX_TOKENS, 512)
        : posInt(process.env.OPENAI_MAX_TOKENS, 16000),
    extraBody: {},
  }),
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);

export function resolveProvider(
  name: string = process.env.LLM_PROVIDER || "groq",
  tier: ModelTier = "strong",
): LLMProvider {
  const factory = PROVIDERS[name.toLowerCase()];
  if (!factory) {
    throw new Error(
      `Unknown LLM_PROVIDER "${name}". Supported: ${SUPPORTED_PROVIDERS.join(", ")}`,
    );
  }
  return factory(tier);
}
