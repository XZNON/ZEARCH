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
    if (stage === 'idle' || stage === 'ready') return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function pollStatus(deploymentId: string | undefined) {
    if (!deploymentId) { setStage('ready'); setStatusNote('Ready'); return; }
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await getStatus(deploymentId);
        if (s.status === 'building' || s.status === 'deploying') {
          setStage('building'); setStatusNote('Almost ready…');
        } else if (s.status === 'healthy') {
          setStage('ready'); setStatusNote('Ready');
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
      setStage('thinking'); setStatusNote('Thinking…');
      const gen = await postJSON('/api/generate', { prompt: userPrompt });
      if (gen.error) throw new Error(gen.error);

      setStage('building'); setStatusNote('Building…');
      const dep = await postJSON('/api/deploy', { html: gen.html, prompt: userPrompt });
      if (dep.error) throw new Error(dep.error);

      setResult({ ...dep, html: gen.html, prompt: userPrompt });
      pollStatus(dep.deploymentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('idle');
    }
  }

  async function applyUpdate(updatePrompt: string): Promise<boolean> {
    if (!updatePrompt.trim() || !result) return false;
    setError(null); setStage('thinking'); setStatusNote('Thinking…');
    try {
      const gen = await postJSON('/api/update', { prompt: result.prompt, previousHtml: result.html, updatePrompt });
      if (gen.error) throw new Error(gen.error);
      setStage('building'); setStatusNote('Building…');
      const dep = await postJSON('/api/deploy', { html: gen.html, prompt: result.prompt });
      if (dep.error) throw new Error(dep.error);
      setResult({ ...dep, html: gen.html, prompt: result.prompt });
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

  const busy = stage !== 'idle' && stage !== 'ready';
  const canShow = stage === 'ready' && !!result?.serviceUrl;

  return { stage, statusNote, error, result, elapsed, busy, canShow, run, applyUpdate, teardown };
}
