interface ExamplesProps {
  items: string[];
  onPick: (p: string) => void;
  disabled: boolean;
}

export function Examples({ items, onPick, disabled }: ExamplesProps) {
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
