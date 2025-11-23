// Orchestrator: end-to-end pipeline to discover, extract, synthesize, and publish a report
// UI-first: every phase updates Run.status and .lastNote so the Runs UI stays in sync.

import { prisma } from '@/lib/prisma';
import { loadSettings } from '@/lib/config';
import { inferVertical } from '@/lib/verticals';
import { buildQueries } from '@/lib/queries';
import { makeSearch } from '@/lib/search';
import { extractCapabilities } from '@/lib/extract/capabilities';
import { extractPricingV2 } from '@/lib/extract/pricing_v2';
import { extractStructuredDataFromContent, generateSyntheticInsights, standardizeAndFilterCapabilities } from '@/lib/ai';
import { generateMarkdown } from '@/lib/report';
import { detectSourceChanges, storeChangeDetection, checkForAlerts } from '@/lib/monitoring';
import { sendReportCompletionNotification } from '@/lib/notifications';
import { ensureFeatureDefinitions } from '@/lib/features';
import { canonicalFeatureName, normalizeFeature } from '@/lib/normalize';

type RunStatus = 'NEW' | 'DISCOVERING' | 'EXTRACTING' | 'SYNTHESIZING' | 'QA' | 'COMPLETE' | 'ERROR' | 'SKIPPED';

type SearchResult = { title: string; url: string; snippet?: string; publishedAt?: string | null; source?: string };

export async function orchestrateRun(runId: string) {
  const startedAtTs = Date.now();
  
  try {
    console.log(`[Orchestrator] Starting run ${runId}`);
    
    // 0) Load run + project with projectInputs
    const run = await prisma.run.findUnique({ 
      where: { id: runId }, 
      include: { 
        project: { 
          include: { 
            projectInputs: true,
            projectFeatures: { include: { featureDefinition: true } },
          } 
        } 
      } 
    });
    if (!run) throw new Error(`Run not found: ${runId}`);
    if (run.status === 'SKIPPED') {
      console.log(`[Orchestrator] Run ${runId} is SKIPPED, exiting`);
      return;
    }

    await setStatus(runId, 'DISCOVERING', 'Starting discovery…', startedAtTs);
    console.log(`[Orchestrator] Run ${runId} status set to DISCOVERING`);

    const settings = await loadSettings();
    const stalenessDays = Number.isFinite(settings.stalenessDays) ? Number(settings.stalenessDays) : 180;
    const profile = inferVertical({ industry: run.project.industry, subIndustry: run.project.subIndustry });

    // Get inputs from projectInputs relation (first item if array exists)
    const projectInput = run.project.projectInputs?.[0];
    const projectFeatureDefs =
      (run.project.projectFeatures ?? [])
        .map((pf) => pf.featureDefinition)
        .filter((def): def is NonNullable<typeof def> => Boolean(def));
    const inputKeywords = projectInput?.keywords || [];
    const inputCompetitors = projectInput?.competitors || [];
    const targetSegments = run.project.targetSegments || [];
    const regions = run.project.regions || [];
    const descriptionPieces = [
      run.project.description,
      projectInput?.problem,
      projectInput?.solution,
      projectInput?.notes,
    ];
    if ((projectInput?.platforms ?? []).length) {
      descriptionPieces.push(`Platforms: ${(projectInput?.platforms ?? []).join(', ')}`);
    }
    if (targetSegments.length) {
      descriptionPieces.push(`Segments: ${targetSegments.join(', ')}`);
    }
    if (projectFeatureDefs.length > 0) {
      descriptionPieces.push(`Core features: ${projectFeatureDefs.map((f) => f.name).join(', ')}`);
    }
    const derivedDescription = descriptionPieces.filter(Boolean).join(' ');

    const productTokens = run.project.name
      .split(/[\s\/\-|]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 2);
    const categoryTokens = (run.project.category ?? '')
      .split(/[\s\/\-|]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 2);
    const keywordTokens = inputKeywords
      .flatMap((kw) => kw.split(/[\s\/\-|]+/))
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 2);
    const descriptionTokens = derivedDescription
      .split(/[\s,;\.\-/]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 3);
    const competitorTokens = inputCompetitors
      .flatMap((name) => name.split(/[\s\/\-|]+/))
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 2);
    const featureTokens = projectFeatureDefs
      .map((def) => def.name?.toLowerCase())
      .filter((t): t is string => Boolean(t && t.length > 2));
    const relevanceTokens = new Set(
      [
        ...productTokens,
        ...categoryTokens,
        ...keywordTokens,
        ...descriptionTokens,
        ...competitorTokens,
        ...featureTokens,
        ...targetSegments.map((s) => s.toLowerCase()),
      ].filter(Boolean)
    );

    // 1) Discovery: Build queries and search
    const queries = buildQueries({
      category: run.project.category ?? undefined,
      productName: run.project.name,
      keywords: inputKeywords.length > 0 ? inputKeywords : undefined,
      competitors: inputCompetitors.length > 0 ? inputCompetitors : undefined,
      description: derivedDescription || undefined,
      targetSegments: targetSegments.length > 0 ? targetSegments : undefined,
      regions: regions.length > 0 ? regions : undefined,
      features: projectFeatureDefs.map((f) => f.name).filter((name): name is string => Boolean(name)),
      project: { industry: run.project.industry, subIndustry: run.project.subIndustry }
    });

    console.log(`[Orchestrator] Generated ${queries.length} queries for run ${runId}`);
    queries.forEach((q, idx) => console.log(`  [Q${idx + 1}] ${q}`));

    if (inputCompetitors.length > 0) {
      for (const compName of inputCompetitors) {
        const trimmed = compName?.trim();
        if (!trimmed) continue;
        try {
          await prisma.competitor.create({
            data: {
              runId,
              name: trimmed,
            }
          });
        } catch (err) {
          // Ignore duplicates for seeded competitors
        }
      }
    }

    const search = await makeSearch();
    const seen = new Set<string>();
    const discovered: {
      runId: string; url: string; title?: string | null; snippet?: string | null; source?: string | null; publishedAt?: Date | null; domain?: string | null;
    }[] = [];

    console.log(`[Orchestrator] Running ${queries.length} search queries...`);
    for (const q of queries) {
      try {
        console.log(`[Orchestrator] Searching: "${q}"`);
        const results = await search.search(q, { num: 10, freshnessDays: stalenessDays }) as SearchResult[];
        console.log(`[Orchestrator] Found ${results.length} results for "${q}"`);

        const relevant: SearchResult[] = [];
        const fallback: SearchResult[] = [];

        for (const r of results) {
          const url = normalizeUrl(typeof r.url === 'string' ? r.url : '');
          if (!url || seen.has(url)) continue;
          fallback.push(r);

          const body = `${r.title ?? ''} ${r.snippet ?? ''} ${r.url ?? ''}`.toLowerCase();
          let score = 0;
          if (relevanceTokens.size === 0) {
            score = 1; // Nothing to compare against, accept by default
          } else {
            for (const token of relevanceTokens) {
              if (token.length < 3) continue;
              if (body.includes(token)) {
                score += token.length >= 6 ? 2 : 1;
              }
            }
          }

          // Boost score if competitor appears explicitly
          for (const comp of inputCompetitors) {
            if (body.includes(comp.toLowerCase())) {
              score += 2;
            }
          }

          if (score > 0) {
            relevant.push(r);
          }
        }

        const selectedResults = relevant.length > 0 ? relevant : fallback.slice(0, 3);

        for (const r of selectedResults) {
          const url = normalizeUrl(typeof r.url === 'string' ? r.url : '');
          if (!url || seen.has(url)) continue;
          seen.add(url);
          
          // Check if source is fresh
          const publishedAt = r.publishedAt ? new Date(r.publishedAt) : null;
          const isStale = publishedAt && (Date.now() - publishedAt.getTime()) > (stalenessDays * 24 * 60 * 60 * 1000);
          
          discovered.push({
            runId,
            url,
            title: r.title ?? null,
            snippet: r.snippet ?? null,
            source: r.source ?? 'search',
            publishedAt,
            domain: getDomain(url)
          });
          
          if (isStale) {
            await appendLog(runId, `Warning: Stale source detected - ${url} (published: ${publishedAt?.toISOString()})`);
          }
        }
      } catch (err: any) {
        console.error(`[Orchestrator] Search error for "${q}":`, err);
        await appendLog(runId, `Search error "${q}": ${err?.message ?? String(err)}`);
      }
    }
    
    console.log(`[Orchestrator] Total unique sources discovered: ${discovered.length}`);

    // Persist initial sources (status = OK for now, will update if fetch fails)
    // Mark stale sources
    const sources = await prisma.$transaction(
      discovered.map((d) => {
        const isStale = d.publishedAt && (Date.now() - d.publishedAt.getTime()) > (stalenessDays * 24 * 60 * 60 * 1000);
        return prisma.source.create({
          data: {
            runId: d.runId,
            url: d.url,
            title: d.title ?? undefined,
            domain: d.domain ?? undefined,
            fetchedAt: new Date(),
            status: 'OK',
            content: null,
            notes: isStale ? `Stale source: published ${d.publishedAt?.toISOString()}` : undefined
          }
        });
      })
    );

    await setStatus(runId, 'EXTRACTING', `Fetched ${sources.length} sources; extracting content…`);

    // 2) Fetch & extract content from sources
    const fetched: {
      id: string; url: string; title?: string | null; domain?: string | null; content: string;
    }[] = [];

    for (const s of sources) {
      try {
        const raw = await fetchTextWithTimeout(s.url, 20_000);
        const text = htmlToText(raw).slice(0, 300_000);
        await prisma.source.update({ where: { id: s.id }, data: { content: text, status: 'OK' } });
        fetched.push({ id: s.id, url: s.url, title: s.title, domain: s.domain, content: text });
      } catch (err: any) {
        await prisma.source.update({ where: { id: s.id }, data: { status: 'ERROR', notes: err?.message ?? String(err) } });
        await appendLog(runId, `Fetch failed ${s.url}: ${err?.message ?? String(err)}`);
      }
    }

    await setStatus(runId, 'EXTRACTING', `Extracting capabilities, integrations, compliance, pricing…`);

    // Determine the Vertical Profile for Standardization
    const verticalProfile = inferVertical({ industry: run.project.industry, subIndustry: run.project.subIndustry });
    await appendLog(runId, `Using Vertical Profile: ${verticalProfile.key}`);

    // 3) Entity extraction - AI-Powered (with regex fallback)
    const capWrites: { runId: string; category: string; name: string; normalized: string }[] = [];
    const featureCandidates: {
      runId: string;
      name: string;
      normalized: string;
      sourceId: string;
      description?: string;
      competitorId?: string | null;
    }[] = [];
    const compWrites: { runId: string; framework: string; status?: string | null; notes?: string | null }[] = [];
    const intWrites: { runId: string; name: string; vendor?: string | null; category?: string | null; url?: string | null }[] = [];
    const priceWrites: { runId: string; competitorId: string; planName: string; priceMonthly?: number | null; priceAnnual?: number | null; transactionFee?: number | null; currency?: string | null }[] = [];

    // crude vendor detector for integrations (fallback)
    const vendorRE = /(Shopify|Salesforce|HubSpot|Zapier|Stripe|Segment|Snowflake|Slack|Google Analytics|Datadog|Amplitude|Notion|Zendesk|PayPal|Adyen|Paddle|Klaviyo|Marketo|Intercom)/gi;

    // Map competitor by brand name guess
    const competitorByName = new Map<string, string>();
    const seededCompetitors = await prisma.competitor.findMany({ where: { runId } });
    for (const comp of seededCompetitors) {
      competitorByName.set(comp.name, comp.id);
    }

    // Check if AI extraction is enabled
    const aiSettings = await loadSettings();
    const useAIExtraction = aiSettings.aiProvider && (aiSettings.openaiApiKey || aiSettings.geminiApiKey || aiSettings.anthropicApiKey);

    for (const s of fetched) {
      const text = s.content;
      const brand = guessBrandName(s.title, s.domain);
      let compId: string | null = null;
      if (brand && isLikelyCompetitorName(brand, { title: s.title, domain: s.domain })) {
        const cached = competitorByName.get(brand);
        if (cached) {
          compId = cached;
        } else {
          try {
            const competitor = await prisma.competitor.upsert({
              where: { runId_name: { runId, name: brand } },
              update: {},
              create: {
                runId,
                name: brand,
                website: s.domain ? `https://${s.domain}` : undefined,
              },
            });
            compId = competitor.id;
            competitorByName.set(brand, competitor.id);
          } catch (err) {
            console.warn(`[Orchestrator] Failed to upsert competitor ${brand}:`, err);
          }
        }
      }

      // Try AI-Powered Extraction first, fallback to regex
      let aiExtractionSuccess = false;
      if (useAIExtraction && brand && compId) {
        try {
          const aiData = await extractStructuredDataFromContent(
            brand,
            text,
            { industry: run.project.industry, keywords: projectInput?.keywords || [] }
          );

          if (aiData) {
            aiExtractionSuccess = true;
            await appendLog(runId, `AI extraction succeeded for ${brand} from ${shortUrl(s.url)}`);

            // Phase III: AI-Powered Standardization & Filtering
            let normalizedCapabilities: any[] = [];
            if (aiData.capabilities.length > 0) {
              try {
                const standardized = await standardizeAndFilterCapabilities(
                  aiData.capabilities,
                  verticalProfile
                );
                normalizedCapabilities = standardized;
                await appendLog(runId, `Standardized ${aiData.capabilities.length} capabilities to ${standardized.length} relevant capabilities for ${brand}`);
              } catch (err: any) {
                console.error(`[Orchestrator] Standardization failed for ${brand}:`, err);
                await appendLog(runId, `Standardization failed for ${brand}: ${err?.message ?? String(err)}`);
                // Fallback: use capabilities as-is without standardization
                normalizedCapabilities = aiData.capabilities.map(cap => ({
                  normalizedName: cap.name,
                  category: cap.category,
                  sourceName: cap.name,
                  description: cap.description,
                }));
              }
            }

            // Process standardized and filtered capabilities
            for (const cap of normalizedCapabilities) {
              const normalized = normalizeFeature(cap.normalizedName || cap.name);
              // Use normalizedName as the canonical name, but keep sourceName for reference
              capWrites.push({ 
                runId, 
                category: cap.category, 
                name: cap.normalizedName || cap.sourceName, // Use canonical name
                normalized 
              });
              featureCandidates.push({
                runId,
                name: cap.normalizedName || cap.sourceName, // Use canonical name
                normalized,
                sourceId: s.id,
                competitorId: compId,
                description: cap.description || `Mentioned under ${cap.category}`,
              });
            }

            // Process AI-extracted pricing
            for (const plan of aiData.pricingPlans) {
              priceWrites.push({
                runId,
                competitorId: compId,
                planName: plan.planName,
                priceMonthly: plan.priceMonthly ?? null,
                priceAnnual: plan.priceAnnual ?? null,
                transactionFee: plan.transactionFee ?? null,
                currency: plan.currency || 'USD',
              });
            }

            // Process AI-extracted compliance
            for (const item of aiData.complianceItems) {
              compWrites.push({
                runId,
                framework: item.framework.toUpperCase(),
                status: item.status || 'Claims',
                notes: item.notes || `Extracted from ${shortUrl(s.url)}`,
              });
            }

            // Process AI-extracted integrations
            for (const int of aiData.integrations) {
              intWrites.push({
                runId,
                name: int.name,
                vendor: int.vendor,
                category: int.category,
                url: int.url || s.url,
              });
            }

            // Update source with AI summary if available
            if (aiData.summary) {
              await prisma.source.update({
                where: { id: s.id },
                data: { meta: { aiSummary: aiData.summary } },
              });
            }
          }
        } catch (err: any) {
          console.error(`[Orchestrator] AI extraction failed for ${brand} (${s.url}):`, err);
          await appendLog(runId, `AI extraction failed for ${shortUrl(s.url)}: ${err?.message ?? String(err)}`);
        }
      }

      // Fallback to regex-based extraction if AI failed or not configured
      if (!aiExtractionSuccess) {
        // Capabilities (regex fallback)
        for (const c of extractCapabilities(text)) {
          capWrites.push({ runId, category: c.category, name: c.name, normalized: c.normalized });
          featureCandidates.push({
            runId,
            name: c.name,
            normalized: c.normalized,
            sourceId: s.id,
            competitorId: compId,
            description: extractFeatureDescription(text, c.mention) ?? `Mentioned under ${c.category}`,
          });
        }

        // Integrations (regex fallback)
        const mentions = text.match(vendorRE);
        if (mentions) {
          for (const m of uniq(mentions)) {
            intWrites.push({ runId, name: m, vendor: m, category: inferIntegrationCategory(m) ?? null, url: s.url });
          }
        }

        // Compliance (regex fallback)
        const complianceHits = text.match(/\b(SOC\s*2|HIPAA|GDPR|PCI[-\s]?DSS|ISO\s*27001|BAA)\b/gi);
        if (complianceHits) {
          for (const f of uniq(complianceHits)) {
            compWrites.push({ runId, framework: f.toUpperCase().replace(/\s+/g, ' '), status: 'Claims', notes: `Mentioned at ${shortUrl(s.url)}` });
          }
        }

        // Pricing extraction if page looks like pricing (regex fallback)
        if (looksLikePricingPage(s.title, text)) {
          try {
            const rows = extractPricingV2(text);
            if (compId) {
              for (const r of rows) {
                priceWrites.push({
                  runId,
                  competitorId: compId,
                  planName: r.planName,
                  priceMonthly: r.priceMonthly ?? null,
                  priceAnnual: r.priceAnnual ?? null,
                  transactionFee: r.transactionFee ?? null,
                  currency: r.currency ?? 'USD'
                });
              }
            }
          } catch (err: any) {
            await appendLog(runId, `Pricing parse failed ${s.url}: ${err?.message ?? String(err)}`);
          }
        }
      }
    }

    // Dedup capabilities by category+normalized
    const capSeen = new Set<string>();
    const capUnique = capWrites.filter((c) => {
      const k = `${c.category}|${c.normalized.toLowerCase()}`;
      if (capSeen.has(k)) return false;
      capSeen.add(k);
      return true;
    });

    // Persist extracted entities
    const featureByKey = new Map<
      string,
      {
        runId: string;
        name: string;
        normalized: string;
        sourceId: string;
        description?: string;
        competitorId?: string | null;
      }
    >();
    for (const candidate of featureCandidates) {
      const key = `${candidate.competitorId ?? 'global'}|${candidate.normalized}`;
      if (!featureByKey.has(key)) {
        featureByKey.set(key, candidate);
      }
    }
    const featureCreates = Array.from(featureByKey.values());

    const featureDefinitions = featureCreates.length
      ? await ensureFeatureDefinitions(
          featureCreates.map((f) => f.name),
          { origin: 'COMPETITOR' }
        )
      : [];
    const featureDefByNormalized = new Map(
      featureDefinitions.map((def) => [def.normalized, def])
    );
    const featureCreatesWithDefs = featureCreates.map((f) => {
      const normalized = normalizeFeature(f.name);
      const def = featureDefByNormalized.get(normalized);
      return {
        runId: f.runId,
        name: f.name,
        normalized,
        description: f.description,
        sourceId: f.sourceId,
        competitorId: f.competitorId ?? null,
        featureDefinitionId: def?.id,
        origin: 'COMPETITOR' as const,
        confidence: 0.6,
      };
    });

    await prisma.$transaction([
      ...capUnique.map((c) => prisma.capability.create({ data: c })),
      ...featureCreatesWithDefs.map((f) => prisma.feature.create({ data: f })),
      ...compWrites.map((x) => prisma.complianceItem.create({ data: x })),
      ...intWrites.map((x) => prisma.integration.create({ data: x })),
      ...priceWrites.map((x) => prisma.pricingPoint.create({ data: x }))
    ]);

    await setStatus(runId, 'SYNTHESIZING', 'Synthesizing findings…');

    // 4) Synthesis: Findings with citations - Enhanced analysis
    const allCaps = await prisma.capability.findMany({ where: { runId } });
    const allSources = await prisma.source.findMany({ where: { runId }, select: { id: true, url: true, title: true } });
    const allCompetitors = await prisma.competitor.findMany({ where: { runId } });
    const allPricing = await prisma.pricingPoint.findMany({ where: { runId }, include: { competitor: true } });
    const allIntegrations = await prisma.integration.findMany({ where: { runId } });
    const allCompliance = await prisma.complianceItem.findMany({ where: { runId } });
    const allFeatures = await prisma.feature.findMany({
      where: { runId },
      include: { featureDefinition: true, competitor: true }
    });
    const historicalWhere: any = {
      featureDefinitionId: { not: null },
      runId: { not: runId }
    };
    if (run.project.industry) {
      historicalWhere.run = { project: { industry: run.project.industry } };
    }
    const historicalFeatures = await prisma.feature.findMany({
      where: historicalWhere,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { featureDefinition: true, competitor: true }
    });

    const capByKey = groupBy(allCaps, (c) => `${c.category}|${c.normalized.toLowerCase()}`);
    const capTotal = allCaps.length;
    if (capTotal === 0) {
      await appendLog(runId, 'No capabilities extracted - sources may be sparse or parsing failed.');
    }
    const common = capTotal > 0 ? Object.entries(capByKey).sort((a, b) => b[1].length - a[1].length).slice(0, 15) : [];
    const rare = capTotal > 0 ? Object.entries(capByKey).filter(([, arr]) => arr.length === 1).slice(0, 10) : [];

    const findings: {
      kind: 'GAP' | 'DIFFERENTIATOR' | 'COMMON_FEATURE' | 'RISK' | 'RECOMMENDATION' | 'INSIGHT';
      text: string;
      confidence: number;
      citations: string[];
    }[] = [];

    // Common features - market standards
    if (capTotal > 0) {
      for (const [k, instances] of common.slice(0, 10)) {
        const [category, norm] = k.split('|');
        const sourceIds = instances
          .map(() => pickAnySource(allSources))
          .filter(Boolean) as string[];

        findings.push({
          kind: 'COMMON_FEATURE',
          text: `${category}: "${norm}" appears across ${instances.length} sources, indicating this is a market standard.`,
          confidence: Math.min(0.9, 0.6 + (instances.length * 0.05)),
          citations: sourceIds.slice(0, 3)
        });
      }
    }

    const presentFeatures = new Set<string>();
    for (const cap of allCaps) {
      const normalized = normalizeFeature(cap.normalized);
      if (normalized) presentFeatures.add(normalized);
    }
    for (const feat of allFeatures) {
      const normalized =
        feat.featureDefinition?.normalized ??
        normalizeFeature(feat.normalized ?? feat.name);
      if (normalized) presentFeatures.add(normalized);
    }

    // Gaps: user-declared features not observed in market data
    const declaredFeatureSet = new Set<string>();
    for (const def of projectFeatureDefs) {
      const norm = normalizeFeature(def.normalized ?? def.name ?? '');
      if (!norm) continue;
      declaredFeatureSet.add(norm);
      if (!presentFeatures.has(norm)) {
        findings.push({
          kind: 'GAP',
          text: `Feature gap: "${def.name}" was not observed across the analysed competitor set. Validate whether the market under-indexes this capability or if messaging needs amplification.`,
          confidence: 0.6,
          citations: [],
        });
      }
    }

    // Gaps: important keywords not found in capabilities or features
    const rawKeywords: unknown[] = projectInput?.keywords || [];
    const keywordWants = new Set(
      rawKeywords
        .filter((s): s is string => typeof s === 'string')
        .map((s) => normalizeFeature(s))
    );
    if (keywordWants.size && capTotal >= 3) {
      for (const kw of keywordWants) {
        if (!kw || declaredFeatureSet.has(kw)) continue;
        if (!presentFeatures.has(kw)) {
          const display = canonicalFeatureName(kw);
          findings.push({
            kind: 'GAP',
            text: `Market gap: "${display}" did not appear in competitor capabilities or feature narratives. This could represent whitespace or signal a positioning opportunity.`,
            confidence: 0.62,
            citations: [],
          });
        }
      }
    }

    // Feature suggestions from competitive landscape (current + historical)
    const featureSuggestionMap = new Map<
      string,
      {
        name: string;
        normalized: string;
        competitors: Set<string>;
        citations: Set<string>;
        currentCount: number;
        historicalCount: number;
      }
    >();

    const recordFeatureEvidence = (
      normalized: string | null | undefined,
      name: string | null | undefined,
      competitorName: string | null | undefined,
      sourceId: string | null | undefined,
      bucket: 'current' | 'historical'
    ) => {
      if (!normalized && !name) return;
      const norm = normalizeFeature(normalized ?? name ?? '');
      if (!norm) return;
      const display = canonicalFeatureName(name ?? normalized ?? norm);
      const entry =
        featureSuggestionMap.get(norm) ??
        {
          name: display,
          normalized: norm,
          competitors: new Set<string>(),
          citations: new Set<string>(),
          currentCount: 0,
          historicalCount: 0,
        };
      if (competitorName) {
        entry.competitors.add(competitorName);
      }
      if (bucket === 'current') {
        entry.currentCount += 1;
        if (sourceId) {
          entry.citations.add(sourceId);
        }
      } else {
        entry.historicalCount += 1;
      }
      featureSuggestionMap.set(norm, entry);
    };

    for (const feat of allFeatures) {
      recordFeatureEvidence(
        feat.featureDefinition?.normalized ?? feat.normalized ?? feat.name,
        feat.featureDefinition?.name ?? feat.name,
        feat.competitor?.name ?? null,
        feat.sourceId,
        'current'
      );
    }
    for (const feat of historicalFeatures) {
      recordFeatureEvidence(
        feat.featureDefinition?.normalized ?? feat.normalized ?? feat.name,
        feat.featureDefinition?.name ?? feat.name,
        feat.competitor?.name ?? null,
        null,
        'historical'
      );
    }

    const featureSuggestions = Array.from(featureSuggestionMap.values())
      .filter((entry) => !declaredFeatureSet.has(entry.normalized))
      .sort(
        (a, b) =>
          b.currentCount + b.historicalCount - (a.currentCount + a.historicalCount)
      )
      .slice(0, 5);

    for (const suggestion of featureSuggestions) {
      const marketMentions = [];
      if (suggestion.currentCount > 0) {
        marketMentions.push(
          `${suggestion.currentCount} competitor${suggestion.currentCount > 1 ? 's' : ''} in this run`
        );
      }
      if (suggestion.historicalCount > 0) {
        marketMentions.push(
          `${suggestion.historicalCount} sightings in prior analyses`
        );
      }
      if (marketMentions.length === 0) continue;
      const competitorExamples = Array.from(suggestion.competitors).slice(0, 3);
      const exampleText = competitorExamples.length
        ? ` (e.g., ${competitorExamples.join(', ')})`
        : '';
      findings.push({
        kind: 'INSIGHT',
        text: `Opportunity: "${suggestion.name}" appears across ${marketMentions.join(
          ' and '
        )}${exampleText}. Consider adding or strengthening this capability to keep pace with the market.`,
        confidence: suggestion.currentCount > 0 ? 0.7 : 0.55,
        citations: Array.from(suggestion.citations).slice(0, 3),
      });
    }

    // Differentiators: appear once or rarely
    if (capTotal >= 5) {
      for (const [k] of rare) {
        const [category, norm] = k.split('|');
        const sourceId = pickAnySource(allSources);
        findings.push({
          kind: 'DIFFERENTIATOR',
          text: `Potential differentiator: ${category} — "${norm}" appears uniquely in the market. This could be a competitive advantage.`,
          confidence: 0.6,
          citations: sourceId ? [sourceId] : []
        });
      }
    }

    // Pricing insights
    if (allPricing.length > 0) {
      const monthlyPrices = allPricing
        .map(p => p.priceMonthly)
        .filter((p): p is number => typeof p === 'number' && p > 0);
      
      if (monthlyPrices.length > 0) {
        const avgPrice = monthlyPrices.reduce((a, b) => a + b, 0) / monthlyPrices.length;
        const minPrice = Math.min(...monthlyPrices);
        const maxPrice = Math.max(...monthlyPrices);
        
        if (maxPrice / minPrice > 3) {
          findings.push({
            kind: 'INSIGHT',
            text: `Pricing analysis: Wide price range detected ($${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}/mo), suggesting multiple market segments. Average: $${avgPrice.toFixed(0)}/mo.`,
            confidence: 0.8,
            citations: []
          });
        }
      }
    }

    // Integration ecosystem insights
    if (allIntegrations.length > 0) {
      const uniqueIntegrations = new Set(allIntegrations.map(i => i.name.toLowerCase()));
      if (uniqueIntegrations.size > 20) {
        findings.push({
          kind: 'INSIGHT',
          text: `Integration ecosystem: Found ${uniqueIntegrations.size} unique integrations across competitors, indicating a mature integration market.`,
          confidence: 0.75,
          citations: []
        });
      }
    }

    // Compliance insights
    if (allCompliance.length > 0) {
      const frameworks = new Set(allCompliance.map(c => c.framework));
      findings.push({
        kind: 'INSIGHT',
        text: `Compliance landscape: ${frameworks.size} different compliance frameworks mentioned (${Array.from(frameworks).join(', ')}), showing industry focus on security and compliance.`,
        confidence: 0.8,
        citations: []
      });
    }

    // Competitor count insights
    if (allCompetitors.length > 0) {
      findings.push({
        kind: 'INSIGHT',
        text: `Market landscape: Identified ${allCompetitors.length} competitors in this space, ${allCompetitors.length > 10 ? 'indicating a crowded market' : 'suggesting moderate competition'}.`,
        confidence: 0.7,
        citations: []
      });
    }

    // AI-Generated Synthesis: Generate RISK and RECOMMENDATION findings
    let aiExecutiveSummary: string | null = null;
    const useAISynthesis = aiSettings.aiProvider && (aiSettings.openaiApiKey || aiSettings.geminiApiKey || aiSettings.anthropicApiKey);
    if (useAISynthesis) {
      try {
        await appendLog(runId, 'Generating AI insights (risks and recommendations)…');
        const aiInsights = await generateSyntheticInsights(
          {
            project: {
              name: run.project.name,
              industry: run.project.industry,
              description: run.project.description,
              targetSegments: run.project.targetSegments || [],
            },
            competitors: allCompetitors.map(c => ({
              name: c.name,
              capabilities: allFeatures.filter(f => f.competitorId === c.id).map(f => ({
                name: f.name,
                category: allCaps.find(cap => cap.normalized === f.normalized)?.category || 'Other',
                description: f.description || null,
              })),
              pricingPoints: allPricing.filter(p => p.competitorId === c.id).map(p => ({
                planName: p.planName,
                priceMonthly: p.priceMonthly,
                priceAnnual: p.priceAnnual,
              })),
            })),
            capabilities: allCaps.map(c => ({
              name: c.name,
              category: c.category,
              normalized: c.normalized,
            })),
            pricingPoints: allPricing.map(p => ({
              planName: p.planName,
              priceMonthly: p.priceMonthly,
              competitorId: p.competitorId,
            })),
            findings: findings.map(f => ({
              kind: f.kind,
              text: f.text,
            })),
          },
          projectInput || undefined
        );

        if (aiInsights) {
          // Store executive summary for report generation
          if (aiInsights.executiveSummary) {
            aiExecutiveSummary = aiInsights.executiveSummary;
          }

          // Add AI-generated RISK findings
          for (const risk of aiInsights.risks) {
            findings.push({
              kind: 'RISK',
              text: risk.text,
              confidence: risk.confidence,
              citations: risk.citations,
            });
          }

          // Add AI-generated RECOMMENDATION findings
          for (const rec of aiInsights.recommendations) {
            findings.push({
              kind: 'RECOMMENDATION',
              text: rec.text,
              confidence: rec.confidence,
              citations: rec.citations,
            });
          }

          await appendLog(runId, `Generated ${aiInsights.risks.length} risks and ${aiInsights.recommendations.length} recommendations from AI`);
        }
      } catch (err: any) {
        console.error(`[Orchestrator] AI synthesis failed:`, err);
        await appendLog(runId, `AI synthesis failed: ${err?.message ?? String(err)}`);
        // Continue without AI insights if synthesis fails
      }
    }

    await prisma.$transaction(findings.map((f) => prisma.finding.create({ data: { runId, ...f } })));

    // 5) Report generation
    await setStatus(runId, 'SYNTHESIZING', 'Generating report…');

    const competitors = await prisma.competitor.findMany({ where: { runId } });
    const pricingPoints = await prisma.pricingPoint.findMany({ where: { runId }, include: { competitor: true } });
    const compliance = await prisma.complianceItem.findMany({ where: { runId } });
    const integrations = await prisma.integration.findMany({ where: { runId } });

    const md = generateMarkdown({
      headline: `${run.project.name}: Competitive Landscape (${profile.key.replace(/_/g, ' ')})`,
      profile,
      competitors,
      pricing: pricingPoints,
      findings,
      capabilities: allCaps,
      compliance,
      integrations,
      executiveSummary: aiExecutiveSummary || null
    }) || '';

    const report = await prisma.report.create({
      data: {
        projectId: run.projectId,
        runId,
        headline: `${run.project.name} Competitive Report`,
        mdContent: md,
        format: 'MARKDOWN'
      }
    });

    // 6) Change detection for monitored projects
    await setStatus(runId, 'QA', 'Running change detection…');

    // Check if this is a re-run for change detection
    const previousRun = await prisma.run.findFirst({
      where: {
        projectId: run.projectId,
        status: 'COMPLETE',
        createdAt: { lt: run.createdAt }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (previousRun) {
      try {
        console.log(`[Orchestrator] Running change detection for run ${runId} vs previous ${previousRun.id}`);
        const changes = await detectSourceChanges(previousRun.id, runId);

        // Store change detection results
        await storeChangeDetection(run.projectId, previousRun.id, runId, changes);

        // Check for alerts
        const alerts = await checkForAlerts(run.projectId, changes);
        if (alerts.length > 0) {
          console.log(`[Orchestrator] Generated ${alerts.length} alerts for project ${run.projectId}`);

          // TODO: Send email notifications here
          for (const alert of alerts) {
            await appendLog(runId, `ALERT: ${alert.message} (${alert.severity})`);
          }
        }

        await appendLog(runId, `Change detection completed: ${changes.addedSources.length} added, ${changes.removedSources.length} removed, ${changes.modifiedSources.length} modified`);
      } catch (error: any) {
        console.error(`[Orchestrator] Change detection failed:`, error);
        await appendLog(runId, `Change detection failed: ${error.message}`);
      }
    } else {
      await appendLog(runId, 'No previous runs found for change detection');
    }

    // 7) Guardrails (non-fatal)
    await setStatus(runId, 'QA', 'Running guardrails…');
    const guard = await runGuardrails({ runId, stalenessDays });
    if (guard.issues.length) {
      await appendLog(runId, `Guardrails: ${guard.issues.join('; ')}`);
    } else {
      await appendLog(runId, 'Guardrails: All checks passed');
    }

    // 8) Send notifications
    await setStatus(runId, 'COMPLETE', `Report ready: ${report.id}`);

    // Send email notification to user
    try {
      const user = await prisma.user.findUnique({
        where: { id: run.project.userId ?? undefined }
      });

      if (user?.email) {
        const findings = await prisma.finding.findMany({
          where: { runId },
          select: { text: true, notes: true }
        });

        const emailSent = await sendReportCompletionNotification(
          user.email,
          user.name || 'User',
          run.project.name,
          runId,
          findings
        );

        if (emailSent) {
          await appendLog(runId, `Email notification sent to ${user.email}`);
        } else {
          await appendLog(runId, `Failed to send email notification`);
        }
      }
    } catch (error: any) {
      console.error(`[Orchestrator] Failed to send email notification:`, error);
      await appendLog(runId, `Email notification failed: ${error.message}`);
    }

    console.log(`[Orchestrator] Run ${runId} completed successfully`);
  } catch (error: any) {
    console.error(`[Orchestrator] Run ${runId} failed:`, error);
    await setStatus(runId, 'ERROR', `Error: ${error?.message || String(error)}`);
    await appendLog(runId, `FATAL ERROR: ${error?.message || String(error)}\n${error?.stack || ''}`);
    throw error; // Re-throw so caller can handle it
  }
}

// --------------------------- Helpers ---------------------------

async function setStatus(runId: string, status: RunStatus, note?: string, startedAtTs?: number) {
  const data: any = { status, lastNote: note ?? null };
  if (status === 'DISCOVERING' && startedAtTs) data.startedAt = new Date(startedAtTs);
  if (status === 'COMPLETE' || status === 'ERROR' || status === 'SKIPPED') data.completedAt = new Date();
  await prisma.run.update({ where: { id: runId }, data });
}

async function appendLog(runId: string, line: string) {
  try {
    await prisma.runLog.create({ data: { runId, line } });
  } catch {
    try {
      await prisma.run.update({ where: { id: runId }, data: { lastNote: line } });
    } catch {
      // swallow
    }
  }
}

function arr<T = unknown>(v: any): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function groupBy<T, K extends string>(xs: T[], keyFn: (t: T) => K): Record<K, T[]> {
  return xs.reduce((acc: any, x: T) => {
    const k = keyFn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}

function normalizeWord(s: string) {
  return s.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function normalizeUrl(url: string | null | undefined) {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

function getDomain(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url;
  }
}

function looksLikePricingPage(title?: string | null, text?: string) {
  const t = `${title ?? ''} ${text?.slice(0, 3000) ?? ''}`;
  return /\b(pricing|plans?|fees?)\b/i.test(t);
}

function guessBrandName(title?: string | null, domain?: string | null) {
  if (title) {
    const cleaned = title.replace(/\s*[-–|·].*$/, '').trim();
    const sanitized = sanitizeBrandCandidate(cleaned);
    if (sanitized && sanitized.length <= 50) return sanitized;
  }
  if (domain) {
    const fromDomain = deriveBrandFromDomain(domain);
    if (fromDomain) return fromDomain;
  }
  return null;
}

const SKIP_DOMAIN_LABELS = new Set(['www', 'blog', 'news', 'learn', 'info', 'docs', 'support', 'help']);

function deriveBrandFromDomain(domain: string) {
  const trimmed = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  const parts = trimmed.split('.').filter(Boolean);
  if (parts.length === 0) return null;

  // Handle common country-code TLDs (e.g., co.uk)
  const tld = parts.slice(-2).join('.');
  const ccTLDs = new Set(['co.uk', 'com.au', 'com.br', 'com.mx']);
  const limit = ccTLDs.has(tld) ? parts.length - 2 : parts.length - 1;

  let candidate: string | null = null;
  for (let i = 0; i < limit; i++) {
    const label = parts[i];
    if (!label || SKIP_DOMAIN_LABELS.has(label)) continue;
    candidate = label;
  }

  if (!candidate) {
    candidate = parts[limit - 1] ?? parts[0];
  }
  if (!candidate) return null;

  return candidate.length >= 2 ? candidate.charAt(0).toUpperCase() + candidate.slice(1) : null;
}

function sanitizeBrandCandidate(candidate: string) {
  let result = candidate.trim();
  if (!result) return '';
  result = result.replace(/\b(pricing|plan|plans|features|feature|reviews?|case study|overview|comparison|guide)\b$/i, '').trim();
  result = result.replace(/\b(vs|versus)\b$/i, '').trim();
  return result;
}

const AGGREGATOR_DOMAINS = new Set([
  'medium.com',
  'substack.com',
  'youtube.com',
  'www.youtube.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'facebook.com',
  'news.ycombinator.com',
  'reddit.com',
  'github.com',
  'dev.to',
  'hashnode.dev',
  'producthunt.com',
  'stackshare.io',
  'g2.com',
  'g2crowd.com',
  'capterra.com',
  'getapp.com',
  'wordpress.com',
  'blogspot.com',
  'notion.site',
]);

const COMPETITOR_NAME_STOPWORDS = [
  /\btop\s*\d+/i,
  /\bbest\b/i,
  /\balternatives?\b/i,
  /\bcomparison\b/i,
  /\bcompare\b/i,
  /\bvs\b/i,
  /\bversus\b/i,
  /\bguide\b/i,
  /\boverview\b/i,
  /\btutorial\b/i,
  /\broundup\b/i,
  /\bchecklist\b/i,
  /\btrends?\b/i,
  /\bnews\b/i,
  /\breview(s)?\b/i,
  /\bcase study\b/i,
  /\bhow to\b/i,
  /\bwhat is\b/i,
];

function isLikelyCompetitorName(
  name: string,
  opts: { title?: string | null; domain?: string | null }
) {
  const candidate = name.trim();
  if (!candidate) return false;
  if (candidate.length < 3) return false;
  if (candidate.split(/\s+/).length > 6) return false;

  const lowerCandidate = candidate.toLowerCase();
  if (COMPETITOR_NAME_STOPWORDS.some((re) => re.test(lowerCandidate))) return false;

  const title = opts.title?.toLowerCase() ?? '';
  if (title) {
    if (
      /\b(top\s*\d+|best|alternatives?|roundup|guide|tutorial|overview|list|blog|checklist|trends?|news|comparison)\b/.test(
        title
      )
    ) {
      if (!/\bpricing\b/.test(lowerCandidate) && !/\bplatform\b/.test(lowerCandidate)) {
        return false;
      }
    }
  }

  const domain = opts.domain?.toLowerCase() ?? '';
  if (domain) {
    for (const agg of AGGREGATOR_DOMAINS) {
      if (domain === agg || domain.endsWith(`.${agg}`)) {
        return false;
      }
    }
  }

  return true;
}

function inferIntegrationCategory(vendor: string): string | undefined {
  const s = vendor.toLowerCase();
  if (/shopify|woocommerce|magento/.test(s)) return 'Ecommerce';
  if (/salesforce|hubspot|pipedrive|zoho/.test(s)) return 'CRM';
  if (/segment|snowflake|amplitude|google analytics|datadog/.test(s)) return 'Data/Analytics';
  if (/stripe|paypal|adyen|paddle/.test(s)) return 'Payments';
  if (/slack|notion/.test(s)) return 'Productivity';
  return undefined;
}

function extractFeatureDescription(text: string, term: string): string | undefined {
  const lowerTerm = term.toLowerCase();
  const sentences = text.split(/[\.\!\?]\s+/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(lowerTerm)) {
      return sentence.trim().slice(0, 240);
    }
  }
  return undefined;
}

// Minimal HTML->text
function htmlToText(html: string) {
  try {
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<\/(p|div|h\d|li|br|section|article)>/gi, '$&\n');
    const txt = html.replace(/<[^>]+>/g, ' ');
    return txt.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  } catch {
    return html;
  }
}

async function fetchTextWithTimeout(url: string, timeoutMs = 15000): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; IntelBot/1.0; +https://example.com)',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html') || ct.includes('xml')) return await res.text();
    if (ct.includes('application/json')) return JSON.stringify(await res.json());
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

// Guardrails: basic checks; non-fatal.
async function runGuardrails(opts: { runId: string; stalenessDays: number }) {
  const issues: string[] = [];
  const sources = await prisma.source.findMany({ where: { runId: opts.runId } });
  const findings = await prisma.finding.findMany({ where: { runId: opts.runId } });
  const capabilities = await prisma.capability.findMany({ where: { runId: opts.runId } });
  const competitors = await prisma.competitor.findMany({ where: { runId: opts.runId } });

  // Missing citations
  const missing = findings.filter((f) => !f.citations || f.citations.length === 0);
  if (missing.length) issues.push(`Findings without citations: ${missing.length}`);

  // Data quality checks
  if (sources.length < 5) {
    issues.push(`Low source count: Only ${sources.length} sources found. Consider expanding search queries.`);
  }
  
  if (capabilities.length < 10) {
    issues.push(`Low capability count: Only ${capabilities.length} capabilities extracted. May indicate limited source content.`);
  }
  
  if (competitors.length === 0) {
    issues.push(`No competitors identified. Consider adding competitor names to project inputs.`);
  }

  // Check for stale sources (using notes field if available)
  const staleSources = sources.filter((s) => s.notes?.includes('Stale source'));
  if (staleSources.length > 0) {
    issues.push(`Stale sources detected: ${staleSources.length} sources are older than ${opts.stalenessDays} days`);
  }

  // Check source fetch success rate
  const failedSources = sources.filter((s) => s.status === 'ERROR');
  if (failedSources.length > sources.length * 0.3) {
    issues.push(`High source fetch failure rate: ${failedSources.length}/${sources.length} sources failed to fetch`);
  }

  return { summary: issues.length ? 'Guardrails found issues' : 'All checks passed', issues };
}

function pickAnySource(sources: { id: string }[]): string | null {
  return sources.length ? sources[0].id : null;
}