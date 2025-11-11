import { prisma } from '@/lib/prisma';
import { json } from '@/lib/http';

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const runId = (await ctx.params).id;
  const [competitors, features, pricing, findings, evidences, run] = await Promise.all([
    prisma.competitor.findMany({ where: { runId } }),
    prisma.feature.findMany({ where: { runId }, include: { featureDefinition: true, competitor: true } }),
    prisma.pricingPoint.findMany({ where: { runId }, include: { competitor: true } }),
    prisma.finding.findMany({ where: { runId, approved: true } }),
    prisma.evidence.findMany({ where: { runId }, include: { source: true } }),
    prisma.run.findUnique({ where: { id: runId } }).catch(() => null),
  ]);
  if (!run) return json({ error: 'Run not found' }, { status: 404 });

  const { generateMarkdown } = await import('@/lib/report');
  const md = generateMarkdown({
    headline: 'Competitive Landscape & Roadmap (Reviewed)',
    profile: (run as any).profile ?? null,
    competitors,
    pricing,
    findings,
    capabilities: (run as any).capabilities ?? [],
    compliance: (run as any).compliance ?? [],
    integrations: (run as any).integrations ?? [],
  });

  const report = await prisma.report.create({
    data: {
      projectId: run.projectId,
      runId,
      headline: 'Reviewed Competitive Analysis',
      mdContent: md,
      format: 'MARKDOWN',
      approved: true
    }
  });
  await prisma.run.update({ where: { id: runId }, data: { status: 'COMPLETE', completedAt: new Date() } });
  return json({ ok: true, reportId: report.id });
}