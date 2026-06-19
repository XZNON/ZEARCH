import type { BuildSpec } from '@zearch/shared';
import { chatCompletion } from '../llm/client.js';
import { composeSystemPrompt } from '../prompts/archetypes/index.js';
import { extractHTML } from '../lib/html.js';
import { validateAppHTML } from '../lib/validate.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('builder');
const MAX_ATTEMPTS = 3;

function buildUserMessage(spec: BuildSpec): string {
  const factsBlock =
    spec.facts.length === 0
      ? 'No grounded facts provided — use your best established knowledge.'
      : spec.facts
          .map((f, i) =>
            f.source
              ? `${i + 1}. ${f.text} [Source: ${f.source}]`
              : `${i + 1}. ${f.text}`,
          )
          .join('\n');

  const imagesBlock =
    spec.images.length === 0
      ? ''
      : '\n\nIMAGES — these are pre-researched real URLs; you MAY use them as <img> src directly:\n' +
        spec.images
          .map(
            (img, i) =>
              `${i + 1}. URL: ${img.url} | Alt: ${img.alt ?? ''} | Credit: ${img.credit ?? ''}`,
          )
          .join('\n');

  const liveBlock = spec.liveEndpoint
    ? `\n\nLIVE DATA ENDPOINT (CRITICAL — read before writing any code):
EXCEPTION to the "no backend calls" rule: this page MUST fetch one live data source.

Endpoint: ${spec.liveEndpoint.url}
Description: ${spec.liveEndpoint.description}
Response shape: ${spec.liveEndpoint.shape ?? 'JSON object — inspect the snapshot for the structure'}

IMPLEMENTATION RULES (non-negotiable):
1. Fetch ONLY via the orchestrator proxy using a RELATIVE path:
     fetch('/api/live?url=' + encodeURIComponent('${spec.liveEndpoint.url}'))
   NEVER fetch the endpoint URL directly — it will be CORS-blocked.
2. Use this exact React pattern inside function App():
     const [liveData, setLiveData] = useState(SNAPSHOT_INITIAL_VALUE);
     const [liveStatus, setLiveStatus] = useState('snapshot');
     useEffect(() => {
       setLiveStatus('loading');
       fetch('/api/live?url=' + encodeURIComponent('${spec.liveEndpoint.url}'))
         .then(r => r.ok ? r.json() : Promise.reject(r.status))
         .then(data => { setLiveData(data); setLiveStatus('live'); })
         .catch(() => setLiveStatus('error'));
     }, []);
   Where SNAPSHOT_INITIAL_VALUE is the build-time snapshot value (see below).
3. Render from liveData in a SINGLE render path — snapshot and live data share the same shape, so no conditional branching needed.
4. Show a small status badge: green "● Live" when liveStatus==='live', amber "● Snapshot" when liveStatus is 'snapshot' or 'error', grey "● Loading..." when liveStatus==='loading'.
5. Do NOT duplicate render logic for live vs snapshot — one render path, reads liveData.

BUILD-TIME SNAPSHOT (use this as the useState initial value — paste as the JS literal):
${JSON.stringify(spec.snapshot ?? null, null, 2)}

(compact form for the useState call: ${JSON.stringify(spec.snapshot ?? null)})`
    : '';

  return (
    `Build a page for: "${spec.title}"\n\n` +
    `ARCHETYPE: ${spec.archetype}\n\n` +
    `DESIGN DIRECTION:\n${spec.designDirection}\n\n` +
    `PRESENTATION PLAN:\n${spec.presentation}\n\n` +
    `GROUNDED FACTS (${spec.facts.length} facts — embed ALL of them verbatim; cite sources inline where provided):\n` +
    factsBlock +
    imagesBlock +
    liveBlock +
    '\n\nReturn only the HTML file.'
  );
}

export async function runBuilder(
  { spec, provider }: { spec: BuildSpec; provider?: string },
): Promise<string> {
  const system = composeSystemPrompt(spec.archetype);
  const baseUser = buildUserMessage(spec);

  let lastHtml = '';
  let correction = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const text = await chatCompletion({
      provider,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: baseUser + correction },
      ],
    });
    const html = extractHTML(text);

    const result = validateAppHTML(html);
    if (result.ok) {
      if (attempt > 1) log(`recovered on attempt ${attempt}/${MAX_ATTEMPTS}`);
      return html;
    }

    lastHtml = html;
    log(`attempt ${attempt}/${MAX_ATTEMPTS} invalid: ${result.reason}`);
    correction =
      `\n\nYOUR PREVIOUS OUTPUT WAS REJECTED because ${result.reason}. ` +
      'Return a COMPLETE, corrected HTML file. ' +
      'IMPORTANT: you must preserve ALL of the grounded facts, images, and design direction from the BuildSpec above — ' +
      'do NOT strip or simplify the content while fixing the error. ' +
      'Structural rules: all JSX inside a top-level `function App() { ... }`, ' +
      'no bare top-level `return`, and mount with ' +
      '`ReactDOM.createRoot(document.getElementById("root")).render(<App />);` as the last line of the babel script. ' +
      'IMPORTANT: if the page included a live /api/live fetch in a useEffect — preserve it exactly. ' +
      'Do NOT remove the useEffect, revert to static data, or remove the liveData/liveStatus state while fixing the validation error.';
  }

  log(`all ${MAX_ATTEMPTS} attempts failed validation — shipping last attempt`);
  return lastHtml;
}
