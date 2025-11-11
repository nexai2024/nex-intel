import { prisma } from '@/lib/prisma';
import { json } from '@/lib/http';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const sources = await prisma.source.findMany({ where: { runId: id } });
  return json(sources);
}