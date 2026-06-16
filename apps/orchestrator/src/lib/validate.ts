// Hard render-validation for generated pages. A page is only shipped if its in-browser babel
// script actually COMPILES and MOUNTS — otherwise the user gets a blank/erroring page. We reproduce
// the browser's check server-side with @babel/parser (sourceType:'script' + the jsx plugin), which
// throws the exact same errors babel-standalone would ("'return' outside of function", unexpected
// token, …). This is a real parse, not a regex heuristic, so it catches arbitrary syntax breakage.
// The pipeline (pipeline/generate.ts) calls validateAppHTML and retries when it fails.

import { parse } from '@babel/parser';
import { isMountable } from './html.js';

export interface ValidationResult {
  ok: boolean;
  /** A short, model-readable reason on failure — fed back into the retry's corrective prompt. */
  reason?: string;
}

// Pull the contents of the single <script type="text/babel"> … </script> block.
function extractBabelScript(html: string): string | null {
  const m = html.match(/<script[^>]*type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/i);
  return m ? m[1] : null;
}

export function validateAppHTML(html: string): ValidationResult {
  if (!/<div[^>]*id=["']root["']/i.test(html)) {
    return { ok: false, reason: 'missing the <div id="root"></div> mount point' };
  }

  const code = extractBabelScript(html);
  if (code == null) {
    return { ok: false, reason: 'missing the <script type="text/babel"> block' };
  }

  // sourceType:'script' (not 'module') makes a top-level `return` fail exactly as the browser does.
  // The jsx plugin enables JSX; modern syntax (optional chaining, nullish, spread) is on by default.
  try {
    parse(code, { sourceType: 'script', plugins: ['jsx'] });
  } catch (e) {
    const msg = (e as Error).message.split('\n')[0];
    return { ok: false, reason: `the babel script has a syntax error — ${msg}` };
  }

  if (!isMountable(html)) {
    return {
      ok: false,
      reason: 'the app is never mounted — call ReactDOM.createRoot(document.getElementById("root")).render(<App />)',
    };
  }

  return { ok: true };
}
