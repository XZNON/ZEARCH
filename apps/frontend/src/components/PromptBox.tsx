import type { Dispatch, SetStateAction, KeyboardEvent } from 'react';
import { Brackets } from './Brackets';

interface PromptBoxProps {
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  onSubmit: () => void;
  disabled: boolean;
}

export function PromptBox({ prompt, setPrompt, onSubmit, disabled }: PromptBoxProps) {
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && prompt.trim()) onSubmit();
    }
  }

  return (
    <div className="reveal d4 mt-10">
      <div className="card field-glow p-3.5 md:p-4">
        <Brackets />
        <div className="flex flex-col md:flex-row gap-3 items-stretch">
          <div className="flex-1 flex items-start gap-3 px-2 pt-2">
            <span className="font-mono text-accent text-lg leading-none mt-1 select-none">⌖</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={onKey}
              placeholder="Napoleon Bonaparte · How black holes work · The French Revolution…"
              rows={2}
              className="flex-1 resize-none bg-transparent outline-none text-base md:text-lg leading-relaxed text-ink"
              disabled={disabled}
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={disabled || !prompt.trim()}
            className="btn-primary px-6 py-3 md:self-stretch whitespace-nowrap inline-flex items-center justify-center gap-2"
          >
            {disabled ? (
              <>
                <span className="dot-pulse" /> Synthesizing
              </>
            ) : (
              <>Search →</>
            )}
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between px-1">
        <span className="label text-ink/35">↵ to search · ⇧↵ for newline</span>
        <span className="label text-ink/35 hidden sm:block">single-file · live · ephemeral</span>
      </div>
    </div>
  );
}
