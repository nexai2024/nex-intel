import { prisma } from '@/lib/prisma';
import { json, HttpError } from '@/lib/http';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserAccessibleProjects } from '@/lib/rbac';

const bodySchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  targetICP: z.string().optional(),
  region: z.string().optional(),
  inputs: z.object({
    problem: z.string().optional(),
    solution: z.string().optional(),
    platforms: z.array(z.string()).default([]),
    priceTarget: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    competitors: z.array(z.string()).default([]),
    urls: z.array(z.string().url()).default([]),
  }).optional(),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, 'Invalid payload');

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      regions: parsed.data.region ? [parsed.data.region] : [],
      userId: user.id,
      projectInputs: parsed.data.inputs ? {
        create: { ...parsed.data.inputs }
      } : undefined
    },
    include: { projectInputs: true },
  });

  return json(project, { status: 201 });
}
export async function GET(req: Request) {
    const user = await requireAuth();
    const url = new URL(req.url);
    const includeStats = url.searchParams.get('includeStats') === '1';
  
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: includeStats ? {
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, createdAt: true, completedAt: true }
        },
        _count: { select: { runs: true } }
      } : undefined
    });
  
    const mapped = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      createdAt: p.createdAt,
      runsCount: p._count?.runs ?? undefined,
      lastRun: p.runs?.[0] ?? null
    }));
  
    return NextResponse.json(mapped);
  }