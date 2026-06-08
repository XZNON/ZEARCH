export function ErrorCard({ error }: { error: string }) {
  return (
    <div className="mt-6 card p-5 border !border-rose-200 !bg-rose-50/70">
      <div className="text-sm font-semibold text-rose-700">Something went wrong</div>
      <div className="text-sm text-rose-800/90 mt-1 whitespace-pre-wrap break-words">{error}</div>
    </div>
  );
}
