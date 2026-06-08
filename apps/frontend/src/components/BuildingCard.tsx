import type { Stage } from '../types';

interface BuildingCardProps {
  stage: Stage;
  note: string;
  elapsed: number;
  prompt: string;
}

export function BuildingCard({ stage, note, elapsed, prompt }: BuildingCardProps) {
  const order: Stage[] = ['generating', 'packaging', 'pushing', 'building', 'deploying', 'healthy'];
  const idx = Math.max(0, order.indexOf(stage));
  return (
    <div className="mt-10 card p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="dot-pulse" />
          <span className="text-sm font-medium text-ink/80">{note || 'Starting…'}</span>
        </div>
        <span className="text-sm text-ink/50 tabular-nums">{elapsed}s</span>
      </div>
      <div className="mt-4 text-lg text-ink/90">
        Building: <span className="font-medium">“{prompt}”</span>
      </div>
      <div className="mt-6 grid grid-cols-6 gap-2">
        {order.map((s, i) => (
          <div key={s} className="relative h-1.5 rounded-full overflow-hidden bg-ink/5">
            <div className={`h-full rounded-full transition-all duration-500 ${i <= idx ? 'bg-[#ef5b36]' : ''}`} style={{ width: i <= idx ? '100%' : '0%' }} />
            {i === idx && <div className="absolute inset-0 shimmer" />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/55">
        {order.slice(0, 6).map((s, i) => (
          <span key={s} className={i <= idx ? 'text-ink/80' : ''}>{labelFor(s)}</span>
        ))}
      </div>
    </div>
  );
}

function labelFor(s: Stage): string {
  switch (s) {
    case 'generating': return 'Design';
    case 'packaging': return 'Package';
    case 'pushing': return 'Push';
    case 'building': return 'Build';
    case 'deploying': return 'Rollout';
    case 'healthy': return 'Live';
    default: return s;
  }
}
