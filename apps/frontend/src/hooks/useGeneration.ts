// The generate → deploy → poll → update → teardown state machine, extracted from App.
// Owns all generation state; the form inputs (prompt, updatePrompt) stay in the component.

import { useEffect, useRef, useState } from 'react';
import type { Stage, AppResult } from '../types';
import { postJSON, getStatus } from '../api/client';

export function useGeneration() {
  const [stage, setStage] = useState<Stage>('idle');
  const [statusNote, setStatusNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AppResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (stage === 'idle' || stage === 'healthy') return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function pollStatus(deploymentId: string | undefined) {
    if (!deploymentId) { setStage('healthy'); setStatusNote('App is live'); return; }
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await getStatus(deploymentId);
        if (s.status === 'building') { setStage('building'); setStatusNote('Building container on Locus…'); }
        else if (s.status === 'deploying') { setStage('deploying'); setStatusNote('Rolling out to the edge…'); }
        else if (s.status === 'healthy') {
          setStage('healthy'); setStatusNote('Live');
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (s.status === 'failed' || s.status === 'cancelled') {
          setError(`Deployment ${s.status}`); setStage('idle');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    }, 5000);
  }

  async function run(userPrompt: string) {
    setError(null); setResult(null); setElapsed(0);
    startRef.current = Date.now();
    try {
      setStage('generating'); setStatusNote('Claude is sketching your app…');
      const gen = await postJSON('/api/generate', { prompt: userPrompt });
      if (gen.error) throw new Error(gen.error);

      setStage('packaging'); setStatusNote('Writing files and packaging source…');
      await new Promise((r) => setTimeout(r, 200));

      setStage('pushing'); setStatusNote('Creating project and pushing to Locus Build…');
      const dep = await postJSON('/api/deploy', { html: gen.html, prompt: userPrompt });
      if (dep.error) throw new Error(dep.error);

      setResult({ ...dep, html: gen.html, prompt: userPrompt });
      setStage('building'); setStatusNote('Locus is building the container (~1-3 min)…');
      pollStatus(dep.deploymentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('idle');
    }
  }

  // Returns true on success so the caller can clear its input only when the update went through.
  async function applyUpdate(updatePrompt: string): Promise<boolean> {
    if (!updatePrompt.trim() || !result) return false;
    setError(null); setStage('generating'); setStatusNote('Applying your changes…');
    try {
      const gen = await postJSON('/api/update', { prompt: result.prompt, previousHtml: result.html, updatePrompt });
      if (gen.error) throw new Error(gen.error);
      setStage('pushing'); setStatusNote('Re-deploying the updated app…');
      const dep = await postJSON('/api/deploy', { html: gen.html, prompt: result.prompt });
      if (dep.error) throw new Error(dep.error);
      setResult({ ...dep, html: gen.html, prompt: result.prompt });
      setStage('building'); setStatusNote('Building updated container…');
      pollStatus(dep.deploymentId);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); setStage('idle');
      return false;
    }
  }

  async function teardown() {
    if (!result) return;
    await postJSON('/api/teardown', { projectId: result.projectId });
    setResult(null); setStage('idle'); setStatusNote('');
  }

  const busy = stage !== 'idle' && stage !== 'healthy';
  const canShow = stage === 'healthy' && !!result?.serviceUrl;

  return { stage, statusNote, error, result, elapsed, busy, canShow, run, applyUpdate, teardown };
}
