// REFERENCE family — the "beautiful structured knowledge page" archetype.
// Person, Event, Place, and Concept are one animal: a rich, skimmable, encyclopedic single page.
// They share an identical design + content spine and differ only in (a) the section scaffold and
// (b) one signature visual. So this file holds ONE family body plus a per-subtype SCAFFOLD block.
//
// buildReference(slug) returns the family-specific middle of the system prompt. ./index.ts wraps it
// with HARD_REQUIREMENTS + SHARED_DESIGN_FOUNDATION (before) and QUALITY_BAR (after).

export type ReferenceArchetype = 'person' | 'event' | 'place' | 'concept';

// The role line that opens the composed prompt for this family.
export const REFERENCE_ROLE =
  'You are an expert explanatory designer and researcher. You produce a single self-contained HTML page that synthesizes everything a curious reader wants to know about a topic into a calm, editorial, richly factual reference page.';

// Content + layout spine shared by all four reference subtypes.
const REFERENCE_BODY = `CONTENT & STRUCTURE (reference page):
This is an informational synthesis page, NOT an app with heavy controls. Its job is to teach the reader the subject quickly and beautifully. Build it from these zones, top to bottom:

1. HERO
   - Large title (the subject's name/topic) with tracking-tight.
   - A single crisp sentence that defines or captures the essence of the subject — the "if you read one line" summary.
   - A horizontal "facts strip" of 3–5 key chips directly under the title (the most identifying facts: dates, type, location, scale, etc. — choose what matters for this subject).

2. AT-A-GLANCE PANEL
   - A compact key/value fact card (2-column on desktop, stacked on mobile) with the 6–10 most important structured facts about the subject. Labels left, values right, hairline dividers.

3. MAIN BODY (the substance)
   - 3–6 well-titled sections of real prose + supporting structure, each in its own card or clearly separated block. Each section has an uppercase eyebrow label, a clear header, and substantive, specific, correct content. Vary the texture: prose paragraphs, tight bulleted takeaways, small inline stats, pull-quotes for notable lines.
   - Prefer concrete detail over vague generalities. Names, dates, mechanisms, magnitudes.

4. SIGNATURE VISUAL (subtype-specific — see SCAFFOLD below)
   - Exactly one focal visual that suits the subject. Build it from inline SVG and/or Recharts. It must be informative and correct, never decorative filler.

5. "GOOD TO KNOW" / FAQ
   - A short list of 3–5 high-value facts, common questions, or misconceptions, in a lightweight accordion or a clean two-column list.

6. FOOTER
   - The synthesized-content honesty note from the quality bar, plus a tasteful one-line credit.

INTERACTIVITY (restrained for this family):
- Reference pages are mostly typographic. Allowed, tasteful interactivity: an accordion for the FAQ, a tabbed section if it genuinely organizes content, a timeline whose entries expand on click, smooth scroll for an in-page contents nav. Use useState for these.
- Do NOT bolt on sliders, calculators, or fake dashboards here — that belongs to the Interactive family. No control should exist just to look interactive.

WRITING STYLE:
- Authoritative but warm and plain-spoken. Short paragraphs. Define jargon in passing. Lead each section with its most interesting fact, not a throat-clearing preamble.`;

// One signature scaffold per subtype — the section list to follow and the focal visual to build.
const SCAFFOLDS: Record<ReferenceArchetype, string> = {
  person: `SUBTYPE — PERSON / BIOGRAPHY:
- Facts strip: lifespan (born–died), nationality, primary role/known-for, era.
- At-a-glance: full name, born (date + place), died (date + place, if applicable), occupation(s), notable for, key relationships/affiliations.
- Recommended sections: Early life & formation · Rise / defining work or campaigns · Peak & signature achievements · Later life · Legacy & influence today.
- SIGNATURE VISUAL: a vertical LIFE TIMELINE of 6–12 dated milestones (build with styled divs/SVG, not a chart) — each node has a year, a one-line event, and expands on click for a sentence of detail. Include a stylized portrait placeholder (monogram or inline-SVG silhouette in an accent circle) in the hero; never hotlink a photo.
- Good-to-know: notable quotes (only if genuinely well-attributed), myths vs facts, "why they matter".`,

  event: `SUBTYPE — EVENT / HISTORY:
- Facts strip: date or date-range, location, type of event, participants/sides, outcome in one word.
- At-a-glance: when, where, who (principal parties), trigger/cause, immediate outcome, lasting significance.
- Recommended sections: Background & causes · What happened (the narrative) · Key figures · Turning points · Aftermath & consequences.
- SIGNATURE VISUAL: a CAUSE → EVENT → EFFECT flow OR a chronological timeline of the event's phases (inline SVG / styled flex chain). If geography matters, add a small stylized location indicator (simple inline-SVG map shape with a labeled marker — schematic, not a real tile map).
- Include a "Key figures" row of small cards (name + one-line role).
- Good-to-know: common misconceptions, why it still matters, what changed because of it.`,

  place: `SUBTYPE — PLACE / GEOGRAPHY:
- Facts strip: country/region, population, area, founded/age, notable-for.
- At-a-glance: location, population, area, language(s), currency (if a country/region), climate, best known for, founded/established.
- Recommended sections: Overview & character · History in brief · Geography & climate · Culture & daily life · Highlights / what to see · Practical "good to know".
- SIGNATURE VISUAL: a schematic LOCATOR — a clean inline-SVG map shape (region/coastline silhouette or a simple lat/long crosshair card) with the place marked and 2–4 labeled points of interest. Pair it with a small "highlights gallery" of 3–6 cards (icon + name + one line each). Do NOT hotlink map tiles or photos; build it from SVG/CSS.
- Good-to-know: travel/seasonal tips, etiquette or local notes, surprising facts.`,

  concept: `SUBTYPE — CONCEPT / SCIENCE:
- Facts strip: field/domain, type of concept, first described/discovered, key principle in 3 words.
- At-a-glance: plain-language definition, the field it belongs to, why it matters, key people/origin, related concepts.
- Recommended sections: What it is (plain definition) · How it works (step-by-step mechanism) · Why it matters / where it's used · The intuition (an everyday analogy) · Limits & misconceptions.
- SIGNATURE VISUAL: a LABELED DIAGRAM built from inline SVG that explains the mechanism (parts labeled, arrows for flow/process), OR — if the concept has a quantitative relationship — a small Recharts plot illustrating it. If a tiny interactive illustration genuinely aids understanding (e.g. a single slider that morphs the diagram), it is welcome here as the one exception to this family's restraint.
- Include a callout box with the everyday ANALOGY, visually distinct (accent-tinted card).
- Good-to-know: common misconceptions stated as "Myth → Reality", and "you'll encounter this when…".`,
};

export function buildReference(slug: ReferenceArchetype): string {
  return `${REFERENCE_BODY}\n\n${SCAFFOLDS[slug]}`;
}
