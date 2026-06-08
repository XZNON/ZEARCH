export function Header() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Logo />
        <span className="font-display text-2xl tracking-tight">Zearch</span>
      </div>
      <div className="hidden md:flex items-center gap-2 text-sm text-ink/60">
        <span className="dot-pulse" /> powered by Locus Build
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff9a7b] to-[#ef5b36] shadow-soft flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 6h14M5 12h14M5 18h8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
