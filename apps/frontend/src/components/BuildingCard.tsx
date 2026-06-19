import type { Stage } from '../types';
import { Brackets } from './Brackets';

interface BuildingCardProps {
  stage: Stage;
  note: string;
  elapsed: number;
  prompt: string;
}

const PHASES: { id: Stage; label: string }[] = [
  { id: 'planning',    label: 'Planning' },
  { id: 'researching', label: 'Researching' },
  { id: 'building',    label: 'Building' },
  { id: 'ready',       label: 'Ready' },
];

// Honest, flavorful log lines revealed over time — what's actually happening, dressed up a little.
const LOG = [
  'parsing query',
  'selecting synthesis mode',
  'drafting page structure',
  'generating interactive HTML',
  'wiring charts & interactions',
  'hosting live page',
];

export function BuildingCard({ stage, note, elapsed, prompt }: BuildingCardProps) {
  const idx = Math.max(0, PHASES.findIndex((s) => s.id === stage));
  const shown = Math.min(LOG.length, 1 + Math.floor(elapsed / 2.2));

  return (
    <div className="mt-10 card p-6 md:p-8 overflow-hidden">
      <Brackets />
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="reactor shrink-0">
          <span className="reactor-ring" />
          <span className="reactor-ring r2" />
          <span className="reactor-ring r3" />
          <span className="reactor-core" />
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between">
            <span className="label text-accent">{note || 'Synthesizing'}</span>
            <span className="font-mono text-sm text-ink/50 tnum">{elapsed.toFixed(0)}s</span>
          </div>
          <div className="mt-2 font-display text-2xl md:text-3xl tracking-tight truncate" title={prompt}>
            “{prompt}”
          </div>

          {/* 3-phase progress */}
          <div className="mt-5 grid grid-cols-4 gap-2">
            {PHASES.map((s, i) => (
              <div key={s.id} className="relative h-1.5 rounded-full overflow-hidden bg-[rgb(var(--ink)/0.08)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: i <= idx ? '100%' : '0%', background: 'var(--accent)' }}
                />
                {i === idx && <div className="absolute inset-0 shimmer" />}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-4 text-center">
            {PHASES.map((s, i) => (
              <span key={s.id} className={`label ${i <= idx ? 'text-ink/75' : 'text-ink/30'}`}>{s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* streaming log */}
      <div className="mt-6 pt-5 border-t border-[var(--card-border)] font-mono text-xs space-y-1.5">
        {LOG.slice(0, shown).map((line, i) => {
          const done = i < shown - 1 || stage === 'ready';
          return (
            <div key={line} className="flex items-center gap-2.5 text-ink/55">
              <span className={done ? 'text-[#38d39f]' : 'text-accent'}>{done ? '✓' : '▸'}</span>
              <span className={done ? 'text-ink/45' : 'text-ink/80'}>{line}</span>
              {!done && <span className="caret text-accent">▮</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
