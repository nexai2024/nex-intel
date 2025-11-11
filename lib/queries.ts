import { inferVertical } from './verticals';

type QueryInputs = {
  category?: string;
  keywords?: string[];
  competitors?: string[];
  productName?: string;
  description?: string;
  targetSegments?: string[];
  regions?: string[];
  features?: string[];
  project?: { industry?: string | null; subIndustry?: string | null };
};

export function buildQueries(inputs?: QueryInputs) {
  const profile = inferVertical(inputs?.project ?? {});

  const queries = new Set<string>();
  const push = (value?: string | null) => {
    if (!value) return;
    const sanitizer = value.replace(/\s+/g, ' ').trim();
    if (!sanitizer) return;
    queries.add(sanitizer);
  };

  const product = inputs?.productName?.trim();
  const category = inputs?.category?.trim();
  const primaryKeywords = (inputs?.keywords ?? []).map((k) => k.trim()).filter(Boolean);
  const descriptionTerms = (inputs?.description ?? '')
    .split(/[,.;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 3);
  const segments = (inputs?.targetSegments ?? []).map((s) => s.trim()).filter(Boolean);
  const competitors = (inputs?.competitors ?? []).map((c) => c.trim()).filter(Boolean);
  const features = (inputs?.features ?? []).map((f) => f.trim()).filter(Boolean);

  // Product-centric queries
  if (product) {
    push(`${product} competitor analysis`);
    push(`${product} vs alternatives`);
    push(`${product} pricing comparison`);
    push(`${product} feature comparison`);
    push(`${product} market positioning`);
  }

  // Category & keyword-based queries
  const baseTerms = [category, ...primaryKeywords].filter(Boolean).join(' ');
  if (baseTerms) {
    push(`${baseTerms} alternatives`);
    push(`${baseTerms} competitors`);
    push(`${baseTerms} reviews`);
    push(`${baseTerms} best tools`);
  }

  // Description-driven queries
  descriptionTerms.forEach((term) => {
    if (product) {
      push(`${product} ${term} competitors`);
      push(`${product} ${term} use cases`);
    }
    if (category) {
      push(`${category} ${term} tools`);
    }
  });

  // Segment-specific queries
  segments.forEach((segment) => {
    if (product) push(`${product} for ${segment}`);
    if (category) push(`${category} tools for ${segment}`);
  });

  // Feature-focused queries
  features.forEach((feature) => {
    if (product) push(`${product} ${feature}`);
    if (category) {
      push(`${category} tools with ${feature}`);
      push(`${category} ${feature} comparison`);
    }
    push(`${feature} market overview`);
    push(`${feature} competitor analysis`);
  });

  // Competitor deep dives
  competitors.forEach((competitor) => {
    push(`${competitor} features`);
    push(`${competitor} pricing`);
    push(`${competitor} integrations`);
    push(`${competitor} reviews`);
    push(`${competitor} vs ${product || 'alternatives'}`);
  });

  // Industry insight
  const industry = inputs?.project?.industry?.trim();
  const subIndustry = inputs?.project?.subIndustry?.trim();
  if (industry) {
    push(`${industry} market analysis`);
    push(`${industry} software competitors`);
  }
  if (subIndustry) {
    push(`${subIndustry} platforms comparison`);
  }

  // Region-specific queries
  (inputs?.regions ?? []).forEach((region) => {
    const trimmed = region.trim();
    if (!trimmed) return;
    if (product) push(`${product} adoption in ${trimmed}`);
    if (category) push(`${category} tools ${trimmed}`);
  });

  // Vertical accents for richer context
  profile.queryAccents.slice(0, 5).forEach((accent) => {
    if (product) push(`${product} ${accent}`);
    if (category) push(`${category} ${accent}`);
  });

  // Fallback generic queries if still empty
  if (queries.size === 0) {
    push(`${product || category || 'software'} competitor analysis`);
    push(`${product || category || 'software'} market overview`);
  }

  return Array.from(queries).slice(0, 20);
}