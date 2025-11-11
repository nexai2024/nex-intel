const MULTISPACE = /\s+/g;
const NON_ALPHANUM = /[^a-z0-9\+]/g;

export function normalizeFeature(raw: string) {
  const normalized = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(NON_ALPHANUM, ' ')
    .replace(MULTISPACE, ' ')
    .trim();
  return normalized;
}

export function canonicalFeatureName(raw: string) {
  const norm = normalizeFeature(raw);
  if (!norm) return '';
  return norm
    .split(' ')
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ');
}

export function normalizePriceToMonthly(price: number, cadence: 'monthly'|'annual') {
  return cadence === 'annual' ? price / 12 : price;
}