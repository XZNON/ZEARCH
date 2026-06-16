// The tool contract the Architect (Phase B) calls through. A Tool is a self-describing,
// OpenAI-function-callable unit of work: it advertises a name + JSON-Schema for its args, and
// runs via execute(). Tools are plain HTTP grounding helpers (search/Wikipedia/images) — no LLM.
//
// CONTRACT: execute() NEVER throws. On any failure (missing key, HTTP error, bad JSON, no result)
// it returns { ok: false, content: <clear message> } so the Architect's tool loop can recover.
// This mirrors the never-throws contract of pipeline/classify.ts.

export interface ToolResult {
  ok: boolean;
  // Human/LLM-readable summary fed back to the model on the next loop turn (what the tool found,
  // or why it failed). Always present, even on failure.
  content: string;
  // Optional structured payload for later programmatic use (e.g. the Builder consuming image URLs).
  data?: unknown;
}

export interface Tool {
  // The function name the model calls (snake_case, e.g. "web_search").
  name: string;
  // When/why the Architect should call this tool — read by the model to decide.
  description: string;
  // JSON Schema for the args, passed straight through as OpenAI's tool `parameters`.
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

// The exact shape OpenAI's chat-completions `tools` array wants. toOpenAIToolSchemas() emits this;
// Phase B feeds it into the function-calling loop.
export interface OpenAIToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
