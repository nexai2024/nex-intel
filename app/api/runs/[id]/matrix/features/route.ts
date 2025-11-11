import { prisma } from '@/lib/prisma';
import { canonicalFeatureName, normalizeFeature } from '@/lib/normalize';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const runId = (await ctx.params).id;
  const [competitors, features] = await Promise.all([
    prisma.competitor.findMany({ where: { runId }, orderBy: { name: 'asc' } }),
    prisma.feature.findMany({
      where: { runId },
      include: { competitor: true, featureDefinition: true },
    }),
  ]);

  const featurePresence = new Map<
    string,
    { name: string; normalized: string; presence: Set<string> }
  >();

  for (const feature of features) {
    const normalized = normalizeFeature(
      feature.featureDefinition?.normalized ?? feature.normalized ?? feature.name
    );
    if (!normalized) continue;
    const displayName =
      feature.featureDefinition?.name ??
      canonicalFeatureName(feature.name ?? normalized);
    const entry =
      featurePresence.get(normalized) ??
      { name: displayName, normalized, presence: new Set<string>() };
    if (feature.competitorId) {
      entry.presence.add(feature.competitorId);
    }
    featurePresence.set(normalized, entry);
  }

  const header = ['Feature', ...competitors.map((c) => c.name)].join(',');
  const rows = Array.from(featurePresence.values()).map((entry) => {
    const presenceFlags = competitors.map((comp) =>
      entry.presence.has(comp.id) ? '1' : '0'
    );
    return [entry.name, ...presenceFlags].join(',');
  });

  const csvLines = rows.length > 0 ? [header, ...rows] : [header];
  const csv = csvLines.join('\n');

  return new Response(csv, { headers: { 'content-type': 'text/csv' } });
}
