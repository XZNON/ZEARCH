import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Stage, AppResult } from '../types';
import { Brackets } from './Brackets';

interface AppViewerProps {
  result: AppResult;
  stage: Stage;
  note: string;
  elapsed: number;
  onTeardown: () => void;
  canShow: boolean;
  updatePrompt: string;
  setUpdatePrompt: Dispatch<SetStateAction<string>>;
  applyUpdate: () => void;
  busy: boolean;
}

const TOTAL_MS = 30 * 60 * 1000; // idle window the decay bar is scaled against

export function AppViewer({ result, stage, note, elapsed, onTeardown, canShow, updatePrompt, setUpdatePrompt, applyUpdate, busy }: AppViewerProps) {
  const [countdown, setCountdown] = useState('');
  const [frac, setFrac] = useState(1);

  useEffect(() => {
    function tick() {
      const ms = new Date(result.tearDownAt).getTime() - Date.now();
      if (ms <= 0) { setCountdown('0m 00s'); setFrac(0); return; }
      const totalSec = Math.floor(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setCountdown(`${m}m ${String(s).padStart(2, '0')}s`);
      setFrac(Math.max(0, Math.min(1, ms / TOTAL_MS)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [result.tearDownAt]);

  return (
    <div className="reveal card p-4 md:p-5 overflow-hidden">
      <Brackets />

      {/* header row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0">
          <div className="label text-accent mb-1.5">// live page</div>
          <div className="font-display text-2xl md:text-3xl tracking-tight truncate" title={result.prompt}>
            {result.prompt}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StageBadge stage={stage} note={note} elapsed={elapsed} />
          <a href={result.serviceUrl} target="_blank" rel="noreferrer" className="btn-ghost">Open ↗</a>
          <button className="btn-ghost hover:!border-[rgb(var(--accent-rgb)/0.6)]" onClick={onTeardown}>Destroy</button>
        </div>
      </div>

      {/* viewport */}
      <div
        className="mt-4 rounded-console overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg-solid)] relative"
        style={{ aspectRatio: '16 / 10', minHeight: 440 }}
      >
        {canShow ? (
          <iframe title="zearch-page" src={result.serviceUrl} className="w-full h-full bg-white" />
        ) : (
          <SkeletonBuild note={note} elapsed={elapsed} />
        )}
      </div>

      {/* refine console */}
      <div className="mt-4 card field-glow p-2.5 flex flex-col md:flex-row gap-2.5">
        <div className="flex-1 flex items-center gap-2.5 px-2">
          <span className="font-mono text-accent select-none">▸</span>
          <input
            value={updatePrompt}
            onChange={(e) => setUpdatePrompt(e.target.value)}
            placeholder="Focus on his military campaigns · add a timeline · make it darker…"
            className="flex-1 bg-transparent outline-none py-2 text-ink"
            onKeyDown={(e) => e.key === 'Enter' && !busy && updatePrompt.trim() && applyUpdate()}
            disabled={busy}
          />
        </div>
        <button onClick={applyUpdate} disabled={busy || !updatePrompt.trim()} className="btn-primary px-5 py-2.5">
          Refine →
        </button>
      </div>

      {/* decay meter */}
      <div className="mt-4 flex items-center gap-3">
        <span className="label text-ink/40 whitespace-nowrap">decays in</span>
        <div className="flex-1 h-1 rounded-full bg-[rgb(var(--ink)/0.08)] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${frac * 100}%`, background: frac < 0.15 ? '#e2502b' : 'var(--accent)' }}
          />
        </div>
        <span className="font-mono text-sm text-ink/70 tnum whitespace-nowrap">{countdown}</span>
      </div>
    </div>
  );
}

function StageBadge({ stage, note, elapsed }: { stage: Stage; note: string; elapsed: number }) {
  const live = stage === 'ready';
  return (
    <div className="chip !cursor-default before:!content-none">
      {live ? <span className="dot-live" /> : <span className="dot-pulse" />}
      <span>{live ? 'LIVE' : (note || 'Working…')}</span>
      {!live && <span className="text-ink/40 tnum">{elapsed.toFixed(0)}s</span>}
    </div>
  );
}

function SkeletonBuild({ note, elapsed }: { note: string; elapsed: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="reactor">
        <span className="reactor-ring" />
        <span className="reactor-ring r2" />
        <span className="reactor-ring r3" />
        <span className="reactor-core" />
      </div>
      <div className="flex items-center gap-2">
        <span className="label text-accent">{note || 'Building your page'}</span>
        <span className="font-mono text-xs text-ink/40 tnum">{elapsed.toFixed(0)}s</span>
      </div>
      <div className="w-full max-w-md h-1 rounded-full bg-[rgb(var(--ink)/0.08)] relative overflow-hidden">
        <div className="absolute inset-0 shimmer" />
      </div>
    </div>
  );
}
