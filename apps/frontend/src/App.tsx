import { useState, useEffect, useRef } from 'react';
import { useGeneration } from './hooks/useGeneration';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PromptBox } from './components/PromptBox';
import { Examples } from './components/Examples';
import { BuildingCard } from './components/BuildingCard';
import { AppViewer } from './components/AppViewer';
import { ErrorCard } from './components/ErrorCard';
import { Footer } from './components/Footer';
import { ArchetypeShowcase } from './components/ArchetypeShowcase';
import { HowItWorks } from './components/HowItWorks';

const EXAMPLES = [
  'Napoleon Bonaparte',
  'How black holes work',
  'French Revolution',
  'Kyoto, Japan',
  'React vs Vue',
  'Apollo 11 mission',
  'CRISPR gene editing',
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [updatePrompt, setUpdatePrompt] = useState('');
  const { stage, statusNote, error, result, elapsed, busy, canShow, run, applyUpdate, teardown } = useGeneration();

  useSpotlight();

  return (
    <>
      <Scene />
      <div className="relative z-10 max-w-[1140px] mx-auto px-5 md:px-8 pt-9 pb-16 min-h-full">
        <Header />

        {!result && (
          <section className="mt-16 md:mt-24">
            <Hero onPick={(p) => { setPrompt(p); run(p); }} disabled={busy} />
            <PromptBox
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={() => prompt.trim() && run(prompt.trim())}
              disabled={busy}
            />
            <Examples items={EXAMPLES} onPick={(p) => { setPrompt(p); run(p); }} disabled={busy} />

            {busy && <BuildingCard stage={stage} note={statusNote} elapsed={elapsed} prompt={prompt} />}
            {error && <ErrorCard error={error} />}

            {!busy && (
              <>
                <ArchetypeShowcase onPick={(p) => { setPrompt(p); run(p); }} disabled={busy} />
                <HowItWorks />
              </>
            )}
          </section>
        )}

        {result && (
          <section className="mt-8">
            <AppViewer
              result={result}
              stage={stage}
              note={statusNote}
              elapsed={elapsed}
              onTeardown={teardown}
              canShow={canShow}
              updatePrompt={updatePrompt}
              setUpdatePrompt={setUpdatePrompt}
              applyUpdate={() => { void applyUpdate(updatePrompt).then((ok) => { if (ok) setUpdatePrompt(''); }); }}
              busy={busy}
            />
            {error && <ErrorCard error={error} />}
          </section>
        )}

        <Footer />
      </div>
    </>
  );
}

// Layered atmospheric background — drifting aurora, blueprint grid, mouse spotlight,
// scanlines (dark only), grain, and a vignette. Pure CSS; defined in index.css.
function Scene() {
  return (
    <div className="scene" aria-hidden>
      <div className="scene-aurora" />
      <div className="scene-grid" />
      <div className="scene-spot" />
      <div className="scene-scan" />
      <div className="scene-grain" />
      <div className="scene-vignette" />
    </div>
  );
}

// Feeds pointer position into --mx/--my for the spotlight layer. rAF-throttled; respects reduced motion.
function useSpotlight() {
  const raf = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    function onMove(e: PointerEvent) {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const root = document.documentElement;
        root.style.setProperty('--mx', `${(e.clientX / window.innerWidth) * 100}%`);
        root.style.setProperty('--my', `${(e.clientY / window.innerHeight) * 100}%`);
      });
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf.current); };
  }, []);
}
