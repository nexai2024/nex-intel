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
      throw new ValidationError('projectId is required');
    }

    // Credit check
    if (!(await canConsume(user.id, 1))) {
      throw new RateLimitError('Insufficient credits');
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
      throw new RateLimitError(`Run limit reached for this month (${limit} runs)`);
    }

    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { projectInputs: true }
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.userId !== user.id) {
      throw new AuthorizationError('Access denied: You do not own this project');
    }

    const run = await prisma.run.create({
      data: { projectId, status: 'PENDING' }
    });

    // Consume credit
    await consume(user.id, 1);

    // Start orchestration directly
    orchestrateRun(run.id).catch(async (err: any) => {
      const error = handleError(err);
      logError(error, { runId: run.id, userId: user.id });

      try {
        await prisma.run.update({
          where: { id: run.id },
          data: {
            status: 'ERROR',
            lastNote: `Error: ${error.message}`
          }
        });
        await prisma.runLog.create({
          data: {
            runId: run.id,
            line: `ERROR: ${error.message}\n${error.stack || ''}`
          }
        }).catch(() => {});
      } catch (updateErr) {
        console.error('Failed to update run status:', updateErr);
      }
    });

    return new Response(
      JSON.stringify({ ok: true, runId: run.id }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    const intelError = handleError(error);
    logError(intelError, { endpoint: '/api/runs/start' });
    return createErrorResponse(intelError);
  }
}