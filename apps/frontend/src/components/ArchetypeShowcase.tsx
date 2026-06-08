import { Brackets } from './Brackets';

interface Archetype {
  name: string;
  icon: string;
  example: string;
  shape: string[];
}

const ARCHETYPES: Archetype[] = [
  { name: 'Person / Biography', icon: '👤', example: 'Napoleon Bonaparte',     shape: ['timeline', 'portrait', 'battles', 'legacy'] },
  { name: 'Event / History',    icon: '📜', example: 'The French Revolution',   shape: ['cause→effect', 'key figures', 'map', 'aftermath'] },
  { name: 'Place / Geography',  icon: '🗺️', example: 'Kyoto, Japan',            shape: ['map', 'facts', 'gallery', 'good to know'] },
  { name: 'Concept / Science',  icon: '🔬', example: 'How black holes work',    shape: ['explainer', 'diagrams', 'analogy', 'sim'] },
  { name: 'Comparison',         icon: '⚖️', example: 'React vs Vue',             shape: ['side-by-side', 'radar chart', 'verdict'] },
  { name: 'Data / Stats',       icon: '📊', example: 'World population trends',  shape: ['charts', 'filters', 'sortable tables'] },
  { name: 'Tool / Calculator',  icon: '🧮', example: 'Compound interest calculator', shape: ['sliders', 'live stats', 'charts'] },
];

interface ArchetypeShowcaseProps {
  onPick: (example: string) => void;
  disabled: boolean;
}

export function ArchetypeShowcase({ onPick, disabled }: ArchetypeShowcaseProps) {
  return (
    <section className="mt-24">
      <div className="reveal d5 flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="label text-accent mb-2">// synthesis modes</div>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight">What do you want to understand?</h2>
        </div>
        <span className="label text-ink/35 hidden md:block">07 archetypes</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {ARCHETYPES.map((a, i) => (
          <button
            key={a.name}
            onClick={() => !disabled && onPick(a.example)}
            disabled={disabled}
            className="reveal group card p-4 text-left overflow-hidden transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ animationDelay: `${0.5 + i * 0.06}s` }}
          >
            <Brackets />
            <div className="flex items-start justify-between">
              <span className="text-2xl">{a.icon}</span>
              <span className="label text-ink/30 group-hover:text-accent transition-colors">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="mt-3 font-semibold text-[0.95rem] text-ink/95">{a.name}</div>
            <div className="mt-1 font-mono text-xs text-ink/55 italic truncate">{a.example}</div>
            <div className="mt-3 flex flex-wrap gap-1">
              {a.shape.map((s) => (
                <span
                  key={s}
                  className="text-[0.62rem] font-mono px-1.5 py-0.5 rounded border border-[var(--card-border)] text-ink/50 group-hover:border-[rgb(var(--accent-rgb)/0.3)] group-hover:text-ink/70 transition-colors"
                >
                  {s}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
