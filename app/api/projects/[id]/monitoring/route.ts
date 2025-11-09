import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { scheduleProjectMonitoring, cancelProjectMonitoring, scheduler } from '@/lib/scheduler';
import { handleError, createErrorResponse, NotFoundError, ValidationError } from '@/lib/errors';
import { sendMonitoringSetupNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.userId !== user.id) {
      throw new ValidationError('Access denied: You do not own this project');
    }

    // Schedule monitoring
    const taskId = await scheduleProjectMonitoring(projectId, user.id);

    // Send confirmation email
    try {
      const nextRun = scheduler.getNextTaskTime();
      if (nextRun && user.email) {
        await sendMonitoringSetupNotification(
          user.email,
          user.name || 'User',
          project.name,
          nextRun.toISOString()
        );
      }
    } catch (emailError) {
      console.error('Failed to send monitoring confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Project monitoring scheduled',
      taskId,
      nextRun: scheduler.getNextTaskTime()?.toISOString()
    });

  } catch (error: any) {
    const intelError = handleError(error);
    return createErrorResponse(intelError);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.userId !== user.id) {
      throw new ValidationError('Access denied: You do not own this project');
    }

    // Cancel monitoring
    const cancelledCount = cancelProjectMonitoring(projectId);

    return NextResponse.json({
      success: true,
      message: `Cancelled ${cancelledCount} scheduled monitoring tasks`,
      cancelledCount
    });

  } catch (error: any) {
    const intelError = handleError(error);
    return createErrorResponse(intelError);
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.userId !== user.id) {
      throw new ValidationError('Access denied: You do not own this project');
    }

    // Check if project has scheduled monitoring
    const scheduledTasks = scheduler.tasks.filter(
      task => task.type === 'AUTO_RERUN' && task.projectId === projectId
    );

    const isMonitored = scheduledTasks.length > 0;
    const nextRun = isMonitored ? Math.min(...scheduledTasks.map(t => t.scheduledFor.getTime())) : null;

    return NextResponse.json({
      isMonitored,
      scheduledTasks: scheduledTasks.length,
      nextRun: nextRun ? new Date(nextRun).toISOString() : null,
      upcomingRuns: scheduledTasks
        .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
        .slice(0, 5)
        .map(task => ({
          id: task.id,
          scheduledFor: task.scheduledFor.toISOString(),
          priority: task.priority
        }))
    });

  } catch (error: any) {
    const intelError = handleError(error);
    return createErrorResponse(intelError);
  }
}