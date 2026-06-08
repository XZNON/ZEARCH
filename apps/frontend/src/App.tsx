import { useState } from 'react';
import { useGeneration } from './hooks/useGeneration';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PromptBox } from './components/PromptBox';
import { Examples } from './components/Examples';
import { BuildingCard } from './components/BuildingCard';
import { AppViewer } from './components/AppViewer';
import { ErrorCard } from './components/ErrorCard';
import { Footer } from './components/Footer';

const EXAMPLES = [
  '₹10,000/month for 10 years at 12% — what do I get?',
  'Loan EMI calculator with amortization chart',
  'Startup runway calculator (burn, revenue, funding)',
  'Crypto portfolio risk simulator',
  'Retirement corpus needed for ₹50k/month lifestyle',
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [updatePrompt, setUpdatePrompt] = useState('');
  const { stage, statusNote, error, result, elapsed, busy, canShow, run, applyUpdate, teardown } = useGeneration();

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
              applyUpdate={() => { void applyUpdate(updatePrompt).then((ok) => { if (ok) setUpdatePrompt(''); }); }} busy={busy}
            />
            {error && <ErrorCard error={error} />}
          </section>
        )}

        <Footer />
      </div>
    </div>
  );
}
