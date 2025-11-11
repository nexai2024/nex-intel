import { prisma } from './prisma';
import { canonicalFeatureName, normalizeFeature } from './normalize';

type FeatureOrigin = 'USER' | 'COMPETITOR' | 'SYSTEM';

interface EnsureFeatureOptions {
  origin?: FeatureOrigin;
  category?: string | null;
}

const DEFAULT_ORIGIN: FeatureOrigin = 'COMPETITOR';

export async function ensureFeatureDefinitions(
  names: string[],
  options: EnsureFeatureOptions = {}
) {
  const origin = options.origin ?? DEFAULT_ORIGIN;
  const category = options.category ?? null;

  const cleaned = names
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter(Boolean);
  if (cleaned.length === 0) return [];

  const normalizedEntries = cleaned.map((name) => ({
    original: name,
    normalized: normalizeFeature(name),
    canonical: canonicalFeatureName(name),
  }));

  const normalizedSet = Array.from(
    new Set(normalizedEntries.map((entry) => entry.normalized))
  );

  const existing = await prisma.featureDefinition.findMany({
    where: { normalized: { in: normalizedSet } },
  });
  const byNormalized = new Map(existing.map((def) => [def.normalized, def]));

  const createdDefs = [];
  for (const entry of normalizedEntries) {
    if (byNormalized.has(entry.normalized)) continue;

    const created = await prisma.featureDefinition.create({
      data: {
        name: entry.canonical || entry.original,
        normalized: entry.normalized,
        description: null,
        category,
        origin,
        aliases:
          entry.canonical && entry.canonical !== entry.original
            ? [entry.original]
            : [],
      },
    });
    byNormalized.set(created.normalized, created);
    createdDefs.push(created);
  }

  // Append aliases for existing definitions when new variants are provided
  const aliasUpdates = new Map<
    string,
    { aliases: string[]; existing: string[] }
  >();

  for (const entry of normalizedEntries) {
    const def = byNormalized.get(entry.normalized);
    if (!def) continue;

    const aliases = new Set(def.aliases ?? []);
    const canonical = entry.canonical || entry.original;
    if (def.name !== canonical && !aliases.has(canonical)) {
      aliases.add(canonical);
    }
    if (
      entry.original &&
      entry.original !== canonical &&
      !aliases.has(entry.original)
    ) {
      aliases.add(entry.original);
    }

    const nextAliases = Array.from(aliases);
    if (
      JSON.stringify(nextAliases.slice().sort()) !==
      JSON.stringify((def.aliases ?? []).slice().sort())
    ) {
      aliasUpdates.set(def.id, {
        aliases: nextAliases,
        existing: def.aliases ?? [],
      });
    }
  }

  for (const [id, { aliases }] of aliasUpdates) {
    await prisma.featureDefinition.update({
      where: { id },
      data: { aliases: { set: aliases } },
    });
  }

  return Array.from(byNormalized.values());
}

export async function ensureProjectFeatures(
  projectId: string,
  names: string[]
) {
  const definitions = await ensureFeatureDefinitions(names, { origin: 'USER' });
  if (definitions.length === 0) return [];

  await prisma.projectFeature.createMany({
    data: definitions.map((def) => ({
      projectId,
      featureDefinitionId: def.id,
    })),
    skipDuplicates: true,
  });

  return definitions;
}


