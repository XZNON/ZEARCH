import { useMemo } from 'react';
import { useScramble } from '../hooks/useScramble';

interface HeroProps {
  onPick: (q: string) => void;
  disabled: boolean;
}

export function Hero({ onPick, disabled }: HeroProps) {
  const topics = useMemo(
    () => ['Napoleon Bonaparte', 'How black holes work', 'The French Revolution', 'Kyoto, Japan', 'CRISPR gene editing'],
    []
  );
  const { text: scrambled, word: current } = useScramble(topics);

  return (
    <div className="relative">
      <div className="reveal d1 label mb-5 flex items-center gap-3">
        <span className="h-px w-8 bg-[rgb(var(--accent-rgb)/0.6)]" />
        <span style={{ animation: 'float-tag 4s ease-in-out infinite' }}>// a new kind of search</span>
      </div>

      <h1 className="reveal d2 font-display tracking-tight leading-[0.95] text-[3.4rem] sm:text-[5rem] md:text-[6.3rem]">
        Search gives answers.
        <br />
        <span className="italic" style={{ color: 'var(--accent)' }}>
          We give understanding
        </span>
        <span style={{ color: 'var(--accent)' }}>.</span>
      </h1>

      <p className="reveal d3 mt-7 text-lg md:text-xl text-ink/65 max-w-2xl leading-relaxed">
        Ask anything — get a <span className="text-ink/90 font-medium">live, interactive page</span> that explains,
        visualizes, and lets you explore the topic. Synthesized in seconds, then it quietly self-destructs.
      </p>

      <button
        onClick={() => !disabled && onPick(current)}
        disabled={disabled}
        className="reveal d4 group mt-7 inline-flex items-center gap-3 text-left disabled:cursor-not-allowed"
        aria-label={`Synthesize ${current}`}
      >
        <span className="label text-ink/45">now synthesizing</span>
        <span className="font-mono text-base md:text-lg text-ink/90 min-w-[12ch]">
          “{scrambled}<span className="caret text-accent">▮</span>”
        </span>
        <span className="label text-accent opacity-0 group-hover:opacity-100 transition-opacity">↵ run</span>
      </button>
    </div>
  );
}
