import { prisma } from '@/lib/prisma';
import { json } from '@/lib/http';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: runId } = await ctx.params;
  const findings = await prisma.finding.findMany({ where: { runId }, orderBy: { kind: 'asc' } });
  return json(findings);
}