// Thin client for the orchestrator API. All network calls go through here.

const API_BASE = (import.meta.env.VITE_ORCH_URL as string) || 'http://localhost:8080';

// POST JSON and parse the response; non-JSON bodies are surfaced as { error }.
export async function postJSON(pathname: string, body: unknown): Promise<any> {
  const r = await fetch(`${API_BASE}${pathname}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { error: t }; }
}

// Status is typed as a plain string (not the narrow shared union) because the poll loop also
// handles legacy build statuses (building/deploying/failed/cancelled) that native hosting never emits.
export async function getStatus(deploymentId: string): Promise<{ status: string; durationMs?: number; version?: number }> {
  return fetch(`${API_BASE}/api/status/${deploymentId}`).then((r) => r.json());
}
