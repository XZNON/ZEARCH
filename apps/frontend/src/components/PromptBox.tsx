import type { Dispatch, SetStateAction, KeyboardEvent } from 'react';

interface PromptBoxProps {
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  onSubmit: () => void;
  disabled: boolean;
}

export function PromptBox({ prompt, setPrompt, onSubmit, disabled }: PromptBoxProps) {
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
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
