interface ExamplesProps {
  items: string[];
  onPick: (p: string) => void;
  disabled: boolean;
}

export function Examples({ items, onPick, disabled }: ExamplesProps) {
  return (
    <div className="reveal d5 mt-6">
      <div className="label text-ink/35 mb-3">try a frequency</div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button key={it} className="chip" onClick={() => !disabled && onPick(it)} disabled={disabled}>
            {it}
          </button>
        ))}
      </div>
    </div>
  );
}
