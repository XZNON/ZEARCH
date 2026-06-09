// INTERACTIVE family — the only family that is a real working app rather than a reading page.
// Two subtypes: a TOOL/CALCULATOR (inputs → live computed outputs) and a DATA/STATS explorer
// (a baked-in illustrative dataset with filters, charts, and a sortable table). This is where the
// computation-heavy LOGIC that used to dominate the v0 prompt correctly belongs.
//
// buildInteractive(slug) returns the family-specific middle; ./index.ts wraps it with the shared
// render/design blocks and quality bar.

export type InteractiveArchetype = 'tool' | 'data';

export const INTERACTIVE_ROLE =
  'You are an expert product engineer and data-visualization designer. You produce a single self-contained HTML page that is a genuinely working, client-side interactive tool: inputs drive correct computation and the results update instantly and beautifully.';

// Shared spine for both interactive subtypes.
const INTERACTIVE_BODY = `CONTENT & STRUCTURE (interactive page):
This is a working app, not a reading page. The reader comes to DO something — compute, explore, or play with the numbers. Build it so the interaction is obvious and immediate.

CORE LOOP (mandatory):
- A clear set of INPUTS (controls) and a clear set of OUTPUTS (results), visually separated. Changing any input recomputes outputs INSTANTLY — no submit button required. Drive every derived value through useMemo on the input state so recomputation is automatic and cheap.
- Show the headline result(s) as large, prominent STAT CARDS at the top of the output area (big number, label, and where useful a secondary delta/sub-figure). The reader should see the answer change as they drag.
- Pair the numbers with at least one CHART that visualizes the relationship (how the output behaves across the input range or over time). Charts and stat cards must always agree.

CONTROLS:
- Sliders use native <input type="range"> styled with accent-rose-400 / accent-indigo-400 and a live value readout beside the label. Provide sensible min/max/step and good DEFAULTS so the page is useful on first paint before any interaction.
- Use the right control per input: range for continuous values, number inputs for precise entry (kept in sync with sliders), selects for discrete choices, toggles for on/off. Label every control and show units.

CORRECTNESS & ROBUSTNESS:
- Use CORRECT formulas for the domain (e.g. compound interest A = P(1+r/n)^(nt) with proper periodic contributions; physics/unit/loan/BMI/etc. as appropriate). Get the math right — this is the whole value of the page.
- Guard every edge case: no NaN, no Infinity, no divide-by-zero, no negative values where nonsensical. Clamp inputs to valid ranges.
- Format all numbers for humans with Intl.NumberFormat (currency, percent, thousands separators, sensible precision). Never dump raw floats like 1234.56789999.
- Provide a "Reset to defaults" affordance.

PAGE FRAME:
- A hero (title + one-sentence description of what the tool does), the interactive panel (controls + results + chart), a short "how it works / assumptions" explainer so the reader trusts the numbers, and the footer honesty note.`;

const SCAFFOLDS: Record<InteractiveArchetype, string> = {
  tool: `SUBTYPE — TOOL / CALCULATOR:
- Map the query to a concrete calculation (savings/investment growth, loan repayment, mortgage, tip/split, unit/currency conversion, BMI/calorie, percentage, physics, etc.). If the query is open-ended, choose the most useful calculator for that topic and state its scope.
- Layout: controls in a left column (or top on mobile), results + chart in the larger right area.
- Results: 2–4 headline stat cards (e.g. for an investment calc: total contributed, final value, total growth, effective return). Below them, a chart showing the trajectory (e.g. an AreaChart/LineChart of value over time, with contributed vs growth distinguished).
- Show the key assumptions/formula plainly ("Assumes monthly compounding; figures are estimates"). Let the reader adjust the assumptions that matter (rate, term, frequency).`,

  data: `SUBTYPE — DATA / STATS:
- The query is a data topic (e.g. "world population trends", "EV adoption by country"). Bake in a CURATED, REPRESENTATIVE dataset hard-coded in the file. Use real, well-known approximate figures where you confidently can; where you synthesize illustrative values, you MUST label the dataset clearly as "illustrative / approximate" and not present it as authoritative.
- Provide EXPLORATION controls: filters (category/region/year-range via selects, multi-select chips, or a range slider) and a metric/series toggle. All controls feed useMemo-derived views.
- Show 2–3 complementary CHARTS that update with the filters (e.g. a trend LineChart, a ranking BarChart, a share PieChart) plus a few summary stat cards (total, average, peak, growth rate) that recompute from the filtered data.
- Include a SORTABLE, filterable TABLE of the underlying rows: click a column header to sort asc/desc (track sort state in useState, sort via useMemo). Format cells with Intl.NumberFormat.
- Make the synthetic/illustrative-data disclaimer visible near the data, not just in the footer.`,
};

export function buildInteractive(slug: InteractiveArchetype): string {
  return `${INTERACTIVE_BODY}\n\n${SCAFFOLDS[slug]}`;
}
