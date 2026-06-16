// The SearchProvider seam (D13): the web_search tool talks to this interface, never to a concrete
// backend. Tavily is the launch provider; DDG/Brave/SerpAPI can be swapped in later by implementing
// SearchProvider and pointing the tool at it — the tool stays unchanged.

export interface SearchHit {
  title: string;
  url: string;
  // The extracted snippet/content for this result (Tavily's `content`, or `raw_content` when richer).
  content: string;
}

export interface SearchProvider {
  name: string;
  search(query: string, opts?: { maxResults?: number }): Promise<SearchHit[]>;
}
