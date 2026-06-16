// The tool registry — a name-keyed Map of Tools, mirroring the keyed-provider pattern in
// llm/providers.ts. Tool modules self-register here as an import side effect (see tools/index.ts),
// and Phase B resolves/lists them by name and exports their OpenAI schemas into the tool loop.

import type { Tool, OpenAIToolSchema } from './types.js';

const registry = new Map<string, Tool>();

// Register a tool. Throws on a duplicate name — a dev-time wiring mistake, not a runtime condition,
// so it should fail loud and early at import time (unlike execute(), which never throws).
export function registerTool(tool: Tool): void {
  if (registry.has(tool.name)) {
    throw new Error(`Tool "${tool.name}" is already registered`);
  }
  registry.set(tool.name, tool);
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

export function listTools(): Tool[] {
  return [...registry.values()];
}

// Emit every registered tool in the shape OpenAI's chat-completions `tools` param expects.
export function toOpenAIToolSchemas(): OpenAIToolSchema[] {
  return listTools().map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}
