const STEPS = [
  { n: '01', title: 'Type a query', body: 'Ask about any person, event, place, concept, comparison, or tool.' },
  { n: '02', title: 'ZEARCH synthesizes', body: 'A single self-contained, interactive page is generated in seconds.' },
  { n: '03', title: 'Explore & refine', body: 'Scroll, interact, and reshape it with plain-language follow-ups.' },
];

export function HowItWorks() {
  return (
    <section className="mt-24">
      <div className="reveal label text-accent mb-2">// the process</div>
      <h2 className="reveal font-display text-3xl md:text-4xl tracking-tight mb-9">Three steps. No setup.</h2>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* connecting rail (desktop) */}
        <div className="hidden md:block absolute top-6 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[rgb(var(--accent-rgb)/0.4)] to-transparent" />

        {STEPS.map((step, i) => (
          <div
            key={step.n}
            className="reveal relative flex flex-col gap-3"
            style={{ animationDelay: `${0.2 + i * 0.12}s` }}
          >
            <div className="relative z-10 w-12 h-12 rounded-full grid place-items-center font-mono text-sm bg-[var(--bg)] border border-[rgb(var(--accent-rgb)/0.45)] text-accent shadow-[0_0_24px_-6px_rgba(239,91,54,0.5)]">
              {step.n}
            </div>
            <div className="font-display text-2xl tracking-tight">{step.title}</div>
            <div className="text-ink/60 leading-relaxed max-w-xs">{step.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
