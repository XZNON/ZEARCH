# ZEARCH — Idea (source of truth)

> The single source of truth for *what ZEARCH is*. `PLAN.md` (build plan) and
> `.agent/TASKS.md` (work board) derive from this file. When the vision changes,
> change it here first.

---

## One line

**A new kind of search: you type a query, and instead of a paragraph of text you get a
live, interactive web page that explains, visualizes, and lets you *explore* the topic.**

## The problem

Traditional search returns ten blue links. AI search (ChatGPT, Perplexity) returns a wall
of text. Both make *you* do the work of assembling a mental model — reading, scrolling,
cross-referencing, imagining the timeline, picturing the map.

A good answer to "Napoleon Bonaparte" is not a paragraph. It's a **page**: a hero with his
portrait, a scrollable timeline of his life, a map of his campaigns, cards for his major
battles, a gallery, a "rise and fall" chart, a legacy section — all on one screen, all
interactive. That page is what a knowledgeable friend would *build* for you if they had ten
minutes. ZEARCH builds it in seconds.

## The promise

**Search gives answers. ZEARCH gives understanding you can touch.**

Not a response — a working, explorable artifact generated on demand for *your* exact query.

## How it works (today)

1. User types a natural-language query in the frontend.
2. Orchestrator's `generator.ts` calls an LLM (Groq, OpenAI-compatible) with a system prompt
   and gets back a **single self-contained `index.html`** (React + Tailwind + Recharts via
   CDN, transpiled by Babel in the browser).
3. `deployer.ts` stores the HTML (memory + disk) and serves it at `/app/:id`.
4. Frontend iframes the live page. Follow-up prompts regenerate/refine it.
5. Pages are **ephemeral** — auto-torn-down after 30 minutes idle.

## What changes (the pivot)

The code today is hard-wired to generate **financial calculators** (the system prompt talks
about compound interest, ₹ sliders, investment stat cards). That was the v1 demo. The real
product is **informational interactive search** — the Napoleon case — with calculators
demoted to *just one archetype* among many.

### Page archetypes

Every query maps to an archetype, which decides the page's shape and components:

| Archetype | Example query | Page shape |
| --- | --- | --- |
| **Person / biography** | "Napoleon Bonaparte", "Ada Lovelace" | hero + portrait, life timeline, key events, gallery, legacy |
| **Event / history** | "French Revolution", "Apollo 11" | timeline, cause→effect flow, key figures, map, aftermath |
| **Place / geography** | "Kyoto", "Mariana Trench" | map, facts panel, photo gallery, stats, "things to know" |
| **Concept / science** | "How do black holes work", "CRISPR" | explainer sections, diagrams, interactive sim, analogy |
| **Comparison** | "React vs Vue", "Lion vs Tiger" | side-by-side table, radar/bar charts, verdict |
| **Data / stats** | "IPL team stats", "world population" | charts, filters, sortable tables, sliders |
| **Tool / calculator** | "SIP for ₹10k/mo", "EMI calculator" | inputs/sliders, live computed stat cards, charts *(the old v1)* |

### Grounding

LLM-only generation hallucinates dates, names, and figures. ZEARCH should **ground**
generations in real data — fetch a Wikipedia/Wikimedia summary + images for the query and
inject them as context *before* generation. This raises accuracy and unlocks real imagery
instead of placeholders.

## Non-goals (for now)

- Not a general website builder — pages answer a *query*, they aren't blank-canvas apps.
- Not multi-page sites — one self-contained page per query.
- Not user accounts / auth in the MVP.
- Not real-time/live data feeds (stock tickers, scores) in the MVP — grounding is snapshot.

## Success picture

Someone types "Napoleon Bonaparte", and within ~15 seconds is scrolling a beautiful,
accurate, interactive page — timeline, map, battles, gallery — that they'd actually want to
share. They tweak it ("focus on his military campaigns") and it regenerates. That's the bar.
