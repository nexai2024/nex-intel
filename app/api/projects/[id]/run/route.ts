import { prisma } from '@/lib/prisma';
import { json, HttpError } from '@/lib/http';
import { log } from '@/lib/logger';
import { orchestrateRun } from '@/app/api/runs/orchestrator';
import { requireAuth } from '@/lib/auth';
import { requireCanEditProject } from '@/lib/rbac';
import { canConsume, consume } from '@/lib/credits';

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  
  // Credit check
  if (!(await canConsume(user.id, 1))) {
    throw new HttpError(429, 'Insufficient credits');
  }
  
  // Rate limiting check
  const userId = user.id;
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const runs = await prisma.run.count({
    where: { project: { userId }, createdAt: { gte: monthStart } }
  });
  const limit = Number(process.env.RUNS_PER_MONTH ?? 10);
  if (runs >= limit) {
    throw new HttpError(429, 'Run limit reached for this month');
  }

  const projectId = (await ctx.params).id;

  // Check if user can edit this project (required to run analysis)
  await requireCanEditProject(user.id, projectId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectInputs: true }
  });
  if (!project) throw new HttpError(404, 'Project not found');

  const run = await prisma.run.create({ data: { projectId, status: 'PENDING' } });

  // Consume credit
  await consume(user.id, 1);

  // Start orchestration directly (for now - can switch to job queue later)
  orchestrateRun(run.id).catch(async (err: any) => {
    console.error('Orchestration error:', err);
    log.error({ err, runId: run.id }, 'Run failed');
    // On error, mark run as failed and log the error
    try {
      await prisma.run.update({ 
        where: { id: run.id }, 
        data: { 
          status: 'ERROR',
          lastNote: `Error: ${err?.message || String(err)}`
        } 
      });
      await prisma.runLog.create({
        data: {
          runId: run.id,
          line: `ERROR: ${err?.message || String(err)}\n${err?.stack || ''}`
        }
      }).catch(() => {});
    } catch (updateErr) {
      console.error('Failed to update run status:', updateErr);
    }
  });

  return json({ runId: run.id, status: 'PENDING' }, { status: 202 });
}