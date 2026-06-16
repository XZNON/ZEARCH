// Extract a raw HTML document from an LLM completion — strip markdown fences and any preamble
// before the doctype, so what we store and serve starts at <!DOCTYPE html>. Then sanitize the
// babel script so a stray ES module statement can't blank the whole page.

export function extractHTML(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:html)?\s*\n([\s\S]*?)\n```/i);
  if (fence) s = fence[1].trim();
  const idx = s.indexOf('<!DOCTYPE');
  if (idx > 0) s = s.slice(idx);
  return stripModuleSyntax(pinBabelStandalone(s));
}

// The page transpiles JSX in-browser via @babel/standalone. The unpinned CDN URL now resolves to
// v8, whose react preset defaults to the AUTOMATIC JSX runtime — it injects
// `import { jsx } from "react/jsx-runtime"` into the transpiled output, which the browser rejects
// with "Cannot use import statement outside a module" (blank page). v7 defaults to the classic
// runtime (React.createElement, no import), which works with the UMD React globals. Force the pin
// here so a model that copies the bare/v8 URL still gets a working page.
const PINNED_BABEL = 'https://unpkg.com/@babel/standalone@7.26.4/babel.min.js';
export function pinBabelStandalone(html: string): string {
  return html.replace(
    /https?:\/\/unpkg\.com\/@babel\/standalone(?:@[^/"']+)?\/babel(?:\.min)?\.js/g,
    PINNED_BABEL,
  );
}

// A generated page is only renderable if its babel script defines a component and actually MOUNTS
// it. A common model failure is to emit the hooks/JSX (and a top-level `return`) WITHOUT wrapping
// them in `function App()` and WITHOUT calling ReactDOM.createRoot(...).render(...) — which Babel
// rejects with "'return' outside of function" and which would render nothing anyway. The pipeline
// uses this to validate a generation and retry when it fails. Cheap structural heuristic, not a
// full parse: requires a createRoot(...).render(...) mount.
export function isMountable(html: string): boolean {
  return /createRoot\s*\(/.test(html) && /\.\s*render\s*\(/.test(html);
}

// The generated app runs inside a <script type="text/babel"> transpiled by babel-standalone, which
// transforms JSX but NOT ES modules. A single `import`/`export` makes the browser throw
// "Cannot use import statement outside a module" on the whole script → blank page. The system
// prompt forbids module syntax, but the model still slips occasionally, so we strip it here as a
// deterministic safety net. React/ReactDOM/Recharts are CDN globals, so any lib import is redundant
// — removing it is safe; removing `export` keywords just turns `export default function App` back
// into a plain top-level declaration the babel script already mounts.
export function stripModuleSyntax(html: string): string {
  return html
    // Braced import that may span lines, bounded by the closing brace so it can't run past its
    // own statement:  import { a, b } from 'x';
    .replace(/^[ \t]*import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?[ \t]*\r?\n?/gm, '')
    // Any other single-line import (default / namespace / side-effect), line-bounded:
    //   import X from 'x';   import * as N from 'x';   import 'x';
    .replace(/^[ \t]*import\b[^\n]*\r?\n?/gm, '')
    // export default function App() {...}  →  function App() {...}
    .replace(/\bexport\s+default\s+/g, '')
    // export const X = ... / export function X / export class X  →  drop the leading `export`
    .replace(/^([ \t]*)export\s+(?=(?:const|let|var|function|class|async)\b)/gm, '$1');
}
