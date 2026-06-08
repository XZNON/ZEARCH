import type { Dispatch, SetStateAction } from 'react';
import type { Stage, AppResult } from '../types';

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

export function AppViewer({ result, stage, note, elapsed, onTeardown, canShow, updatePrompt, setUpdatePrompt, applyUpdate, busy }: AppViewerProps) {
  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-ink/50">Your app</div>
          <div className="font-display text-xl md:text-2xl tracking-tight truncate" title={result.prompt}>
            {result.prompt}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StageBadge stage={stage} note={note} elapsed={elapsed} />
          <a href={result.serviceUrl} target="_blank" rel="noreferrer" className="chip">Open ↗</a>
          <button className="chip" onClick={onTeardown}>Destroy</button>
        </div>
      </div>

      <div className="mt-4 rounded-xl overflow-hidden border border-ink/10 bg-white relative" style={{ aspectRatio: '16/10', minHeight: 420 }}>
        {canShow ? (
          <iframe title="zearch-app" src={result.serviceUrl} className="w-full h-full" />
        ) : (
          <SkeletonBuild stage={stage} note={note} elapsed={elapsed} />
        )}
      </div>

      <div className="mt-4 flex flex-col md:flex-row gap-3">
        <input
          value={updatePrompt}
          onChange={(e) => setUpdatePrompt(e.target.value)}
          placeholder="Make it yearly instead of monthly, add inflation adjustment…"
          className="flex-1 card px-4 py-3 outline-none"
          onKeyDown={(e) => e.key === 'Enter' && !busy && applyUpdate()}
          disabled={busy}
        />
        <button onClick={applyUpdate} disabled={busy || !updatePrompt.trim()} className="btn-primary rounded-xl px-5 py-3">Update →</button>
      </div>

      <div className="mt-3 text-xs text-ink/50 flex flex-wrap gap-x-4 gap-y-1">
        <span>project: <code className="text-ink/70">{result.projectId}</code></span>
        <span>service: <code className="text-ink/70">{result.serviceId}</code></span>
        <span>auto-teardown: <code className="text-ink/70">{new Date(result.tearDownAt).toLocaleTimeString()}</code></span>
      </div>
    </div>
  );
}

interface StageBadgeProps {
  stage: Stage;
  note: string;
  elapsed: number;
}

function StageBadge({ stage, note, elapsed }: StageBadgeProps) {
  const live = stage === 'healthy';
  return (
    <div className={`chip ${live ? '!bg-emerald-50 !border-emerald-200 text-emerald-700' : ''}`}>
      {live ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : <span className="dot-pulse" />}
      <span className="text-xs">{live ? 'Live' : (note || 'Working…')}</span>
      {!live && <span className="text-ink/40 text-xs tabular-nums">{elapsed}s</span>}
    </div>
  );
}

interface SkeletonBuildProps {
  stage: Stage;
  note: string;
  elapsed: number;
}

function SkeletonBuild({ stage, note, elapsed }: SkeletonBuildProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex items-center gap-2">
        <span className="dot-pulse" />
        <span className="text-sm font-medium text-ink/80">{note || 'Building…'}</span>
        <span className="text-sm text-ink/40 tabular-nums">{elapsed}s</span>
      </div>
      <div className="w-full max-w-xl grid grid-cols-6 gap-2">
        {(['generating', 'packaging', 'pushing', 'building', 'deploying', 'healthy'] as Stage[]).map((s, i) => {
          const order: Stage[] = ['generating', 'packaging', 'pushing', 'building', 'deploying', 'healthy'];
          const idx = order.indexOf(stage);
          return (
            <div key={s} className="relative h-1.5 rounded-full overflow-hidden bg-ink/5">
              <div className={`h-full rounded-full transition-all duration-500 ${i <= idx ? 'bg-[#ef5b36]' : ''}`} style={{ width: i <= idx ? '100%' : '0%' }} />
              {i === idx && <div className="absolute inset-0 shimmer" />}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-ink/45">Locus is provisioning a real container. This usually takes 1–3 minutes.</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl mt-4">
        <Skel /> <Skel /> <Skel />
        <div className="md:col-span-3"><Skel tall /></div>
      </div>
    </div>
  );
}

function Skel({ tall }: { tall?: boolean }) {
  return (
    <div className={`rounded-xl border border-ink/5 bg-white/60 relative overflow-hidden ${tall ? 'h-32' : 'h-14'}`}>
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}
