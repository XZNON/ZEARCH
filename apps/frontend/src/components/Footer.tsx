export function Footer() {
  return (
    <footer className="mt-24 pt-7 border-t border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="label text-ink/40">Powered by Groq</div>
      <div className="label text-ink/40 flex items-center gap-2">
        <span className="dot-pulse" />
        Pages are ephemeral — auto-destroyed after 30 min idle
      </div>
      <div className="label text-ink/30">ZEARCH · v0</div>
    </footer>
  );
}
