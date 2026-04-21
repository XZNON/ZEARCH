// Code generation via Locus Wrapped Anthropic API.
// Turns a user prompt into a self-contained index.html file for a generated app.

const LOCUS_PAY_BASE = process.env.LOCUS_PAY_BASE || 'https://beta-api.paywithlocus.com/api';

const SYSTEM_PROMPT = `You are an expert web app generator. You produce a SINGLE self-contained HTML file that loads React, Tailwind, and Recharts via CDN and renders a beautiful, interactive mini-app that answers the user's prompt.

HARD REQUIREMENTS:
- Return ONLY the raw HTML starting with <!DOCTYPE html>. No markdown fences, no prose, no explanation.
- Single file only. No external JS/CSS files other than CDNs.
- CRITICAL — use EXACTLY these CDN URLs in EXACTLY this order in <head>, no exceptions:
    1. <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    2. <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    3. <script src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js" crossorigin></script>
    4. <script src="https://unpkg.com/recharts@2.15.4/umd/Recharts.js" crossorigin></script>
    5. <script src="https://unpkg.com/papaparse@5.4.1/papaparse.min.js" crossorigin></script>  (only if CSV needed)
    6. <script src="https://cdn.tailwindcss.com"></script>
    7. <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  Then AFTER all the above scripts, put the <script type="text/babel" data-presets="react"> tag.
  Recharts and prop-types MUST always be included — never skip them.
- The <body> must contain <div id="root"></div> and a <script type="text/babel" data-presets="react"> that mounts the app via ReactDOM.createRoot.
- Destructure hooks as:  const { useState, useEffect, useMemo, useCallback, useRef } = React;
- ALWAYS destructure from window.Recharts at the top of your babel script (even if not all are used):
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } = window.Recharts;

DESIGN (very important):
- Soft, modern, minimal. Off-white background (e.g. bg-[#fafaf7] or bg-gradient-to-br from-rose-50 via-white to-sky-50).
- Rounded-2xl cards with subtle shadow-sm, generous padding.
- Accent color: warm coral / soft indigo. Use it sparingly on primary buttons and chart lines.
- Typography: font-sans, tracking-tight for headings.
- Sliders: native <input type="range"> styled with accent-rose-400 or accent-indigo-400 and live value display.
- Charts: ResponsiveContainer height 300-360, gridColor #eee, smooth curves (type="monotone").
- NO dark mode. Feel: Apple Notes meets Stripe dashboard.
- Fully responsive (md: breakpoints), max-w-5xl mx-auto layout.

LOGIC:
- All computation happens client-side. No backend calls.
- For financial calculations use correct compound-interest formulas.
- Recalculate instantly on slider change via useMemo.
- Show key numbers prominently (total invested, final value, gains) as big stat cards.

Produce ONLY the HTML file. No backticks. No commentary.`;

export async function generateAppHTML({ prompt, apiKey }) {
  const userMsg = `Build an interactive web app for this user prompt:\n\n"${prompt}"\n\nReturn only the HTML file.`;

  const res = await fetch(`${LOCUS_PAY_BASE}/wrapped/anthropic/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Locus Wrapped Anthropic error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const payload = data?.data ?? data;
  const text = payload?.content?.[0]?.text ?? payload?.completion ?? '';
  if (!text) throw new Error('Empty completion from Anthropic');

  return extractHTML(text);
}

function extractHTML(raw) {
  let s = raw.trim();
  const fence = s.match(/```(?:html)?\s*\n([\s\S]*?)\n```/i);
  if (fence) s = fence[1].trim();
  const idx = s.indexOf('<!DOCTYPE');
  if (idx > 0) s = s.slice(idx);
  return s;
}
