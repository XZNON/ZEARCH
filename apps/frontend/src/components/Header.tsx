import { useEffect, useState } from 'react';

export function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'dark'
  );
  const clock = useClock();

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('zearch-theme', next);
  }

  return (
    <header className="reveal flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Mark />
        <div className="leading-none">
          <div className="font-display text-[1.7rem] tracking-tight leading-none">ZEARCH</div>
          <div className="label mt-1 hidden sm:block">Live Synthesis Engine</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden md:flex items-center gap-2 chip !cursor-default">
          <span className="dot-live" />
          <span>ONLINE</span>
          <span className="text-ink/30">·</span>
          <span className="tnum text-ink/55">{clock}</span>
        </div>
        <button
          onClick={toggleTheme}
          className="btn-ghost flex items-center gap-2"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          <span className="hidden sm:inline">{theme === 'light' ? 'Console' : 'Blueprint'}</span>
        </button>
      </div>
    </header>
  );
}

function useClock() {
  const [t, setT] = useState(() => fmt(new Date()));
  useEffect(() => {
    const id = setInterval(() => setT(fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour12: false });
}

function Mark() {
  return (
    <div className="relative w-10 h-10 rounded-console grid place-items-center bg-gradient-to-br from-[#ff8a64] to-[var(--accent)] shadow-[0_8px_22px_-6px_rgba(239,91,54,0.6)]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l5 5" />
        <path d="M11 7.5v7M7.5 11h7" opacity="0.85" />
      </svg>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
