// The three blocks every archetype family shares. Each generated page = HARD_REQUIREMENTS
// (the load-bearing render contract) + SHARED_DESIGN_FOUNDATION + a family-specific body +
// QUALITY_BAR. Keeping these as single constants (never copy-pasted into each family) is the
// whole point: the CDN block below is what makes babel-in-browser apps render at all, so it must
// have exactly ONE source of truth. Edit HARD_REQUIREMENTS with extreme care.
//
// NOTE: this module is not yet wired into the pipeline. It is the Phase 2 target that ./index.ts
// composes; the live MVP still runs on prompts/shared.ts's SYSTEM_PROMPT.

// ─────────────────────────────────────────────────────────────────────────────
// 1. RENDER CONTRACT — load-bearing. Byte-identical to the block in prompts/shared.ts that is
//    proven to render. Do not reorder, drop, or "modernize" these CDN URLs.
// ─────────────────────────────────────────────────────────────────────────────
export const HARD_REQUIREMENTS = `HARD REQUIREMENTS (non-negotiable — the page must render with no build step):
- Return ONLY the raw HTML starting with <!DOCTYPE html>. No markdown fences, no prose, no explanation before or after.
- A SINGLE self-contained file. No external JS/CSS files other than the CDNs listed below. No fetch/XHR/WebSocket to any backend — everything runs in the browser.
- CRITICAL — use EXACTLY these CDN URLs in EXACTLY this order inside <head>, no exceptions:
    1. <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    2. <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    3. <script src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js" crossorigin></script>
    4. <script src="https://unpkg.com/recharts@2.15.4/umd/Recharts.js" crossorigin></script>
    5. <script src="https://unpkg.com/papaparse@5.4.1/papaparse.min.js" crossorigin></script>  (only if CSV parsing is needed)
    6. <script src="https://cdn.tailwindcss.com"></script>
    7. <script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>  (MUST be pinned to v7 — v8 breaks via the automatic JSX runtime)
  Then, AFTER all of the above, put the single <script type="text/babel" data-presets="react"> tag that contains your whole app.
  React, react-dom, prop-types, and Recharts MUST always be included — never skip them, even if a page uses no chart.
- The <body> must contain exactly <div id="root"></div> followed by the <script type="text/babel" data-presets="react"> tag, and the app must mount via ReactDOM.createRoot(document.getElementById('root')).render(<App />).
- At the top of the babel script, destructure hooks:  const { useState, useEffect, useMemo, useCallback, useRef } = React;
- At the top of the babel script, ALWAYS destructure from window.Recharts (even if some are unused):
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } = window.Recharts;
- All JSX lives inside that one text/babel script. Do not use ES module syntax (import/export), TypeScript, or any tag/library not loaded above.
- STRUCTURE — ALL your component logic and JSX MUST live inside a top-level \`function App() { ... }\`, and the LAST lines of the babel script MUST mount it. Never write a bare top-level \`return (...)\` (Babel errors with "'return' outside of function" and the page is blank). The script must follow exactly this skeleton:
    const { useState, useEffect, useMemo, useCallback, useRef } = React;
    const { /* …Recharts… */ } = window.Recharts;
    // any helper components / data here
    function App() {
      // hooks + logic
      return ( /* the page JSX */ );
    }
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
- VALID JS LITERALS: every value in your data must be a syntactically valid JavaScript literal — Babel parses the whole script and ONE bad token blanks the entire page. A numeric field must hold a real number (1990, 2004), never a bare token like 1990s, 300BC, or 1.2M. Fuzzy/range/decade values (e.g. "1990s", "early 2000s", "300 BC", "~1.2M") MUST be quoted strings. Keep keys that you sort or chart numeric (year: 1995); put the human-readable label in a separate string field (label: "1990s").
- Self-contained means self-contained: any data the page shows is hard-coded into the file. Image references, if any, must be inline SVG or data-URIs — never hotlinked external images that may 404.`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. DESIGN FOUNDATION — the house style shared across every family. Family bodies add their own
//    layout/section rules on top; they never restate these basics.
// ─────────────────────────────────────────────────────────────────────────────
export const SHARED_DESIGN_FOUNDATION = `DESIGN FOUNDATION (applies to every page — make it look hand-crafted, not templated):
- Overall feel: calm, editorial, modern. Think Apple Notes meets Stripe docs meets a beautiful museum placard. Confident whitespace, never cramped, never busy.
- Light theme only. NO dark mode. Background is a soft off-white or the faintest gradient (e.g. bg-[#fafaf7], or bg-gradient-to-br from-rose-50 via-white to-sky-50). Never pure #fff, never a dark canvas.
- Layout: a centered column, max-w-5xl mx-auto, px-5 md:px-8, with generous vertical rhythm (space-y-10 / py-12+ between major sections). Fully responsive; design mobile-first and add md:/lg: refinements.
- Surfaces: content sits on rounded-2xl cards with border border-black/5, shadow-sm, and generous padding (p-6 md:p-8). Group related facts into cards; don't float bare text on the background.
- Accent: pick ONE accent (warm coral ~#ef5b36 or soft indigo ~#6366f1) and use it sparingly — primary actions, active states, one chart series, section eyebrows. Everything else is neutral slate/zinc.
- Typography: font-sans. Headings tracking-tight and clearly scaled (text-3xl/4xl page title, text-xl section headers). Body text text-slate-600/700, leading-relaxed, comfortable measure (max-w-prose for long-form). Use a small uppercase tracking-widest "eyebrow" label above section titles.
- Hierarchy: every page opens with a hero (title + one-sentence essence) and uses clear, labeled sections below. The reader should be able to skim headers and understand the shape of the page in five seconds.
- Motion: subtle only — a gentle fade/translate-in on load via a tiny useEffect + CSS transition is welcome; no autoplaying, looping, or distracting animation. Respect prefers-reduced-motion.
- Charts (Recharts): wrap in ResponsiveContainer, height 300–360. Thin axes, gridColor #eee, smooth type="monotone" lines, tooltips on. Label axes and series. Never render an empty or single-point chart — omit the chart if there isn't real data to show.
- Accessibility: semantic landmarks (header/main/section/footer), real heading order, sufficient contrast, alt/aria on icons and controls, visible focus states, keyboard-usable controls.`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. QUALITY BAR — the universal "do not ship garbage" contract, appended last so it lands as the
//    final instruction the model reads before generating.
// ─────────────────────────────────────────────────────────────────────────────
export const QUALITY_BAR = `QUALITY BAR (a page that violates any of these is a failure):
- SPECIFIC, not generic. The page must be unmistakably about THIS query. No "Section 1 / Lorem ipsum / [placeholder]" — every heading, fact, and label is real and topical. A reader should never see scaffolding text.
- SUBSTANTIVE. Fill the page with genuinely useful, correct content: real dates, names, numbers, mechanisms, definitions. Aim for the depth of a strong encyclopedia entry or a polished product page, not a stub.
- FACTUAL DISCIPLINE. Use well-established knowledge. If a figure is approximate or contested, say so ("≈", "estimated", "as of …"). NEVER invent precise statistics, quotes, or citations. When a page presents illustrative or synthesized data (e.g. example datasets), label it clearly as illustrative.
- COMPLETE. No dead buttons, no controls that do nothing, no charts bound to empty arrays, no broken layout at mobile or desktop widths. Everything visible works.
- POLISHED. Consistent spacing, aligned grids, no overflow, no clipped text, no color clashes. It should look like a designer signed off on it.
- HONEST SCOPE. End the page with a small, unobtrusive footer note that the content was synthesized and important facts should be verified.
- OUTPUT. Produce ONLY the HTML document, starting at <!DOCTYPE html>. No backticks, no commentary, no trailing notes.`;
