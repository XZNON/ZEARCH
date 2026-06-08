// Extract a raw HTML document from an LLM completion — strip markdown fences and any preamble
// before the doctype, so what we store and serve starts at <!DOCTYPE html>.

export function extractHTML(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:html)?\s*\n([\s\S]*?)\n```/i);
  if (fence) s = fence[1].trim();
  const idx = s.indexOf('<!DOCTYPE');
  if (idx > 0) s = s.slice(idx);
  return s;
}
