// Tools barrel + registration point. Importing this module imports every tool module for its
// self-registration side effect, then re-exports the registry surface so callers (Phase B) get a
// fully-populated registry from a single import.
//
// A2–A4 add their `import './web-search.js'` etc. lines below as they land. At A1 there are no
// tools to import yet — the registry is wired and empty.

// --- tool self-registration (side-effect imports) ---
import './web-search.js';         // A2 — web_search (Tavily)
import './wikipedia.js';          // A3 — wikipedia_summary
import './images.js';             // A4 — image_search

export { registerTool, getTool, listTools, toOpenAIToolSchemas } from './registry.js';
export type { Tool, ToolResult, OpenAIToolSchema } from './types.js';
