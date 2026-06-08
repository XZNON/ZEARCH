import { Brackets } from './Brackets';

export function ErrorCard({ error }: { error: string }) {
  return (
    <div className="reveal mt-6 card p-5 overflow-hidden !border-[rgb(var(--accent-rgb)/0.4)]">
      <Brackets />
      <div className="label text-accent mb-2">// synthesis fault</div>
      <div className="font-display text-xl tracking-tight">The reactor stalled.</div>
      <div className="mt-2 font-mono text-xs text-ink/65 whitespace-pre-wrap break-words bg-[rgb(var(--ink)/0.04)] rounded p-3 border border-[var(--card-border)]">
        {error}
      </div>
    </div>
  );
}
