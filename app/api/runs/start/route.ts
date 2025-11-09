import { prisma } from '@/lib/prisma';
import { orchestrateRun } from '@/app/api/runs/orchestrator';
import { requireAuth } from '@/lib/auth';
import { canConsume, consume } from '@/lib/credits';
import { handleError, logError, createErrorResponse, ValidationError, NotFoundError, AuthorizationError, RateLimitError } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { projectId } = await req.json();
    
    if (!projectId) {
      throw new HttpError(400, 'projectId required');
    }
    
    // Credit check
    if (!(await canConsume(user.id, 1))) {
      throw new HttpError(429, 'Insufficient credits');
    }
    
    // Rate limiting check
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const runs = await prisma.run.count({
      where: { project: { userId: user.id }, createdAt: { gte: monthStart } }
    });
    const limit = Number(process.env.RUNS_PER_MONTH ?? 10);
    if (runs >= limit) {
      throw new HttpError(429, 'Run limit reached for this month');
    }
    
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { projectInputs: true }
    });
    
    if (!project) {
      throw new HttpError(404, 'Project not found');
    }
    
    if (project.userId !== user.id) {
      throw new HttpError(403, 'Forbidden');
    }
    
    const run = await prisma.run.create({
      data: { projectId, status: 'PENDING' }
    });
    
    // Consume credit
    await consume(user.id, 1);
    
    // Start orchestration directly
    orchestrateRun(run.id).catch(async (err: any) => {
      console.error('Orchestration error:', err);
      log.error({ err, runId: run.id }, 'Run failed');
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
    
    return json({ ok: true, runId: run.id }, { status: 202 });
  } catch (error: any) {
    console.error('Error starting run:', error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, error.message || 'Internal server error');
  }
}