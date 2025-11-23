import { prisma } from './prisma';

type Settings = {
  searchProvider?: 'tavily' | 'serpapi' | null;
  tavilyKey?: string;
  serpapiKey?: string;
  notionToken?: string;
  notionParentPageId?: string;
  stalenessDays?: number;
  // AI/LLM Configuration
  aiProvider?: 'openai' | 'gemini' | 'anthropic' | null;
  openaiApiKey?: string;
  openaiModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
};

let cache: { data: Settings; ts: number } | null = null;
const TTL_MS = 60_000;

export async function loadSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data;
  const rows = await prisma.appSetting.findMany();
  const map = new Map(rows.map(r => [r.key, r.value]));
  const data: Settings = {
    searchProvider: (map.get('searchProvider') as any) ?? (process.env.SEARCH_PROVIDER as any) ?? null,
    tavilyKey: map.get('tavilyKey') ?? process.env.TAVILY_API_KEY ?? undefined,
    serpapiKey: map.get('serpapiKey') ?? process.env.SERPAPI_API_KEY ?? undefined,
    notionToken: map.get('notionToken') ?? process.env.NOTION_TOKEN ?? undefined,
    notionParentPageId: map.get('notionParentPageId') ?? process.env.NOTION_PARENT_PAGE_ID ?? undefined,
    stalenessDays: Number(map.get('stalenessDays') ?? process.env.STALENESS_DAYS ?? 180),
    // AI/LLM Configuration
    aiProvider: (map.get('aiProvider') as any) ?? (process.env.AI_PROVIDER as any) ?? null,
    openaiApiKey: map.get('openaiApiKey') ?? process.env.OPENAI_API_KEY ?? undefined,
    openaiModel: map.get('openaiModel') ?? process.env.OPENAI_MODEL ?? undefined,
    geminiApiKey: map.get('geminiApiKey') ?? process.env.GEMINI_API_KEY ?? undefined,
    geminiModel: map.get('geminiModel') ?? process.env.GEMINI_MODEL ?? undefined,
    anthropicApiKey: map.get('anthropicApiKey') ?? process.env.ANTHROPIC_API_KEY ?? undefined,
    anthropicModel: map.get('anthropicModel') ?? process.env.ANTHROPIC_MODEL ?? undefined,
  };
  cache = { data, ts: Date.now() };
  return data;
}

export async function setSettings(partial: Partial<Settings>) {
  const entries = Object.entries(partial).filter(([, v]) => v !== undefined) as [string, string | number | boolean][];
  await prisma.$transaction(entries.map(([key, val]) => prisma.appSetting.upsert({
    where: { key }, update: { value: String(val) }, create: { key, value: String(val) }
  })));
  cache = null;
}