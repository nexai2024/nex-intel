import { loadSettings } from '@/lib/config';
export type SearchResult = {
    url: string;
    title?: string;
    snippet?: string;
    publishedAt?: string; // ISO
    source?: string; // domain
  };
  
  export interface SearchProvider {
    search(query: string, opts?: { num?: number; freshnessDays?: number }): Promise<SearchResult[]>;
  }
  
  class NullSearch implements SearchProvider {
    async search(): Promise<SearchResult[]> { return []; }
  }
  
  class TavilySearch implements SearchProvider {
    constructor(private apiKey: string) {}
    async search(query: string, opts: { num?: number; freshnessDays?: number } = {}): Promise<SearchResult[]> {
      console.log('TavilySearch', query, opts);
      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey },
          body: JSON.stringify({
            api_key: this.apiKey,
            query,
            search_depth: 'advanced',
            max_results: Math.min(20, opts.num ?? 10), // Increased max results
            include_domains: [],
            include_answer: false,
            include_raw_content: false,
            include_images: false,
          })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Tavily API error (${res.status}):`, errorText);
          return [];
        }
        
        const data = await res.json();
        const results = Array.isArray(data.results) ? data.results : [];
        console.log('TavilySearch results', results);
        // Filter by freshness if specified
        let filtered = results;
        if (opts.freshnessDays) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - opts.freshnessDays);
          filtered = results.filter((r: any) => {
            if (!r.published_date) return true; // Include if no date
            const published = new Date(r.published_date);
            return published >= cutoff;
          });
        }
        
        return filtered.map((r: any) => ({
          url: r.url,
          title: r.title,
          snippet: r.content || r.snippet,
          publishedAt: r.published_date,
          source: (() => { 
            try { 
              return new URL(r.url).hostname.replace(/^www\./,''); 
            } catch { 
              return undefined; 
            } 
          })()
        }));
      } catch (error: any) {
        console.error('Tavily search error:', error);
        return [];
      }
    }
  }
  
  class SerpApiSearch implements SearchProvider {
    constructor(private apiKey: string) {}
    async search(query: string, opts: { num?: number; freshnessDays?: number } = {}): Promise<SearchResult[]> {
      const params = new URLSearchParams({
        engine: 'google',
        q: query,
        num: String(Math.min(10, opts.num ?? 10)),
        api_key: this.apiKey,
        tbs: opts.freshnessDays ? `qdr:${opts.freshnessDays <= 7 ? 'w' : opts.freshnessDays <= 30 ? 'm' : 'y'}` : ''
      });
      const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      const results = data.organic_results ?? [];
      return results.map((r: any) => ({
        url: r.link,
        title: r.title,
        snippet: r.snippet,
        publishedAt: r.date,
        source: (() => { try { return new URL(r.link).hostname.replace(/^www\./,''); } catch { return undefined; } })()
      }));
    }
  }
  
  export async function makeSearch(): Promise<SearchProvider> {
    const s = await loadSettings();
    const provider = (s.searchProvider ?? '').toString().toLowerCase();
    if (provider === 'tavily' && s.tavilyKey) return new TavilySearch(s.tavilyKey);
    if (provider === 'serpapi' && s.serpapiKey) return new SerpApiSearch(s.serpapiKey);
    return new NullSearch();
  }