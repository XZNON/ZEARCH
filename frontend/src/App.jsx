import React, { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_ORCH_URL || 'http://localhost:8080';

const EXAMPLES = [
  '₹10,000/month for 10 years at 12% — what do I get?',
  'Loan EMI calculator with amortization chart',
  'Startup runway calculator (burn, revenue, funding)',
  'Crypto portfolio risk simulator',
  'Retirement corpus needed for ₹50k/month lifestyle',
];

const STAGES = [
  { key: 'idle', label: '' },
  { key: 'generating', label: 'Designing the app' },
  { key: 'packaging', label: 'Packaging source' },
  { key: 'pushing', label: 'Pushing to Locus' },
  { key: 'building', label: 'Building container' },
  { key: 'deploying', label: 'Rolling out' },
  { key: 'healthy', label: 'Live' },
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [stage, setStage] = useState('idle');
  const [statusNote, setStatusNote] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [updatePrompt, setUpdatePrompt] = useState('');
  const startRef = useRef(0);
  const pollRef = useRef(null);

  useEffect(() => {
    if (stage === 'idle' || stage === 'healthy') return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => () => pollRef.current && clearInterval(pollRef.current), []);

  async function run(userPrompt) {
    setError(null); setResult(null); setElapsed(0);
    startRef.current = Date.now();
    try {
      setStage('generating'); setStatusNote('Claude is sketching your app…');
      const gen = await postJSON('/api/generate', { prompt: userPrompt });
      if (gen.error) throw new Error(gen.error);

      setStage('packaging'); setStatusNote('Writing files and packaging source…');
      await new Promise(r => setTimeout(r, 200));

      setStage('pushing'); setStatusNote('Creating project and pushing to Locus Build…');
      const dep = await postJSON('/api/deploy', { html: gen.html, prompt: userPrompt });
      if (dep.error) throw new Error(dep.error);

      setResult({ ...dep, html: gen.html, prompt: userPrompt });
      setStage('building'); setStatusNote('Locus is building the container (~1-3 min)…');
      pollStatus(dep.deploymentId, dep.serviceUrl);
    } catch (e) {
      setError(e.message || String(e));
      setStage('idle');
    }
  }

  function pollStatus(deploymentId, serviceUrl) {
    if (!deploymentId) { setStage('healthy'); setStatusNote('App is live'); return; }
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await fetch(`${API_BASE}/api/status/${deploymentId}`).then(r => r.json());
        if (s.status === 'building') { setStage('building'); setStatusNote('Building container on Locus…'); }
        else if (s.status === 'deploying') { setStage('deploying'); setStatusNote('Rolling out to the edge…'); }
        else if (s.status === 'healthy') {
          setStage('healthy'); setStatusNote('Live'); clearInterval(pollRef.current);
        } else if (s.status === 'failed' || s.status === 'cancelled') {
          setError(`Deployment ${s.status}`); setStage('idle'); clearInterval(pollRef.current);
        }
      } catch {}
    }, 5000);
  }

  async function applyUpdate() {
    if (!updatePrompt.trim() || !result) return;
    setError(null); setStage('generating'); setStatusNote('Applying your changes…');
    try {
      const gen = await postJSON('/api/update', { prompt: result.prompt, previousHtml: result.html, updatePrompt });
      if (gen.error) throw new Error(gen.error);
      setStage('pushing'); setStatusNote('Re-deploying the updated app…');
      const dep = await postJSON('/api/deploy', { html: gen.html, prompt: result.prompt });
      if (dep.error) throw new Error(dep.error);
      setResult({ ...dep, html: gen.html, prompt: result.prompt });
      setUpdatePrompt('');
      setStage('building'); setStatusNote('Building updated container…');
      pollStatus(dep.deploymentId, dep.serviceUrl);
    } catch (e) {
      setError(e.message); setStage('idle');
    }
  }

  async function teardown() {
    if (!result) return;
    await postJSON('/api/teardown', { projectId: result.projectId });
    setResult(null); setStage('idle'); setStatusNote('');
  }

  const busy = stage !== 'idle' && stage !== 'healthy';
  const canShow = stage === 'healthy' && result?.serviceUrl;

  return (
    <div className="grain min-h-full">
      <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-8 pt-10 pb-20">
        <Header />

        {!result && (
          <section className="mt-10 md:mt-16">
            <Hero />
            <PromptBox
              prompt={prompt} setPrompt={setPrompt}
              onSubmit={() => prompt.trim() && run(prompt.trim())}
              disabled={busy}
            />
            <Examples items={EXAMPLES} onPick={(p) => { setPrompt(p); run(p); }} disabled={busy} />
            {busy && <BuildingCard stage={stage} note={statusNote} elapsed={elapsed} prompt={prompt} />}
            {error && <ErrorCard error={error} />}
          </section>
        )}

        {result && (
          <section className="mt-8">
            <AppViewer
              result={result} stage={stage} note={statusNote} elapsed={elapsed}
              onTeardown={teardown} canShow={canShow}
              updatePrompt={updatePrompt} setUpdatePrompt={setUpdatePrompt}
              applyUpdate={applyUpdate} busy={busy}
            />
            {error && <ErrorCard error={error} />}
          </section>
        )}

        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Logo />
        <span className="font-display text-2xl tracking-tight">Zearch</span>
      </div>
      <div className="hidden md:flex items-center gap-2 text-sm text-ink/60">
        <span className="dot-pulse" /> powered by Locus Build
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff9a7b] to-[#ef5b36] shadow-soft flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 6h14M5 12h14M5 18h8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function Hero() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 text-xs tracking-wide uppercase text-ink/55 mb-4">
        <span className="h-px w-8 bg-ink/20" /> a new kind of search <span className="h-px w-8 bg-ink/20" />
      </div>
      <h1 className="font-display text-5xl md:text-7xl leading-[1.02] tracking-tight">
        Search gives answers.
        <br />
        <span className="italic text-[#ef5b36]">We give tools.</span>
      </h1>
      <p className="mt-6 text-ink/65 text-lg max-w-2xl mx-auto">
        Ask anything. We spin up a real, deployed little app — charts, sliders, the works — live in under a minute.
      </p>
    </div>
  );
}

function PromptBox({ prompt, setPrompt, onSubmit, disabled }) {
  function onKey(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit();
  }
  return (
    <div className="mt-10 card p-3 md:p-4 flex flex-col md:flex-row gap-3 items-stretch">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={onKey}
        placeholder="If I invest ₹10,000/month for 10 years at 12% return…"
        rows={2}
        className="flex-1 resize-none bg-transparent outline-none px-3 py-2 text-base md:text-lg placeholder:text-ink/40"
        disabled={disabled}
      />
      <button onClick={onSubmit} disabled={disabled || !prompt.trim()} className="btn-primary rounded-xl px-5 py-3 md:self-stretch whitespace-nowrap">
        {disabled ? 'Building…' : 'Build it →'}
      </button>
    </div>
  );
}

function Examples({ items, onPick, disabled }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 justify-center">
      {items.map((it) => (
        <button key={it} className="chip" onClick={() => !disabled && onPick(it)} disabled={disabled}>
          {it}
        </button>
      ))}
    </div>
  );
}

function BuildingCard({ stage, note, elapsed, prompt }) {
  const order = ['generating','packaging','pushing','building','deploying','healthy'];
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
        {order.slice(0,6).map((s, i) => (
          <span key={s} className={i <= idx ? 'text-ink/80' : ''}>{labelFor(s)}</span>
        ))}
      </div>
    </div>
  );
}

function labelFor(s) {
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

function AppViewer({ result, stage, note, elapsed, onTeardown, canShow, updatePrompt, setUpdatePrompt, applyUpdate, busy }) {
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

function StageBadge({ stage, note, elapsed }) {
  const live = stage === 'healthy';
  return (
    <div className={`chip ${live ? '!bg-emerald-50 !border-emerald-200 text-emerald-700' : ''}`}>
      {live ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : <span className="dot-pulse" />}
      <span className="text-xs">{live ? 'Live' : (note || 'Working…')}</span>
      {!live && <span className="text-ink/40 text-xs tabular-nums">{elapsed}s</span>}
    </div>
  );
}

function SkeletonBuild({ stage, note, elapsed }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex items-center gap-2">
        <span className="dot-pulse" />
        <span className="text-sm font-medium text-ink/80">{note || 'Building…'}</span>
        <span className="text-sm text-ink/40 tabular-nums">{elapsed}s</span>
      </div>
      <div className="w-full max-w-xl grid grid-cols-6 gap-2">
        {['generating','packaging','pushing','building','deploying','healthy'].map((s, i) => {
          const order = ['generating','packaging','pushing','building','deploying','healthy'];
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

function Skel({ tall }) {
  return (
    <div className={`rounded-xl border border-ink/5 bg-white/60 relative overflow-hidden ${tall ? 'h-32' : 'h-14'}`}>
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}

function ErrorCard({ error }) {
  return (
    <div className="mt-6 card p-5 border !border-rose-200 !bg-rose-50/70">
      <div className="text-sm font-semibold text-rose-700">Something went wrong</div>
      <div className="text-sm text-rose-800/90 mt-1 whitespace-pre-wrap break-words">{error}</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 text-center text-xs text-ink/45">
      Every app is a real deployment on Locus Build. Generated with Claude via Locus Wrapped APIs.
      <div className="mt-1">Ephemeral by design — apps auto-destroy after 30 minutes idle.</div>
    </footer>
  );
}

async function postJSON(pathname, body) {
  const r = await fetch(`${API_BASE}${pathname}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { error: t }; }
}
