export function Hero() {
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
