import { orchestrateRun } from '@/app/api/runs/orchestrator';
import { getCreditUsage, consume } from '@/lib/credits';
import { logError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * Scheduled monitoring system for automatic re-runs.
 */

export interface ScheduledTask {
  id: string;
  type: 'AUTO_RERUN' | 'EMAIL_NOTIFICATION' | 'CLEANUP';
  projectId?: string;
  runId?: string;
  scheduledFor: Date;
  priority: number;
  data?: Record<string, unknown>;
}

class TaskScheduler {
  private tasks: ScheduledTask[] = [];
  private isRunning = false;

  listScheduledTasks(): ScheduledTask[] {
    return [...this.tasks];
  }

  schedule(task: Omit<ScheduledTask, 'id'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const scheduledTask: ScheduledTask = { id, ...task };

    this.tasks.push(scheduledTask);
    this.tasks.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

    console.log(`[Scheduler] Scheduled task ${id} for ${scheduledTask.scheduledFor.toISOString()}`);

    if (!this.isRunning) {
      this.start();
    }

    return id;
  }

  cancel(taskId: string): boolean {
    const index = this.tasks.findIndex(task => task.id === taskId);
    if (index === -1) return false;

    this.tasks.splice(index, 1);
    console.log(`[Scheduler] Cancelled task ${taskId}`);
    return true;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Scheduler] Starting task scheduler');
    void this.process();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    console.log('[Scheduler] Stopping task scheduler');
  }

  getTasksCount(): number {
    return this.tasks.length;
  }

  getNextTaskTime(): Date | null {
    return this.tasks.length > 0 ? this.tasks[0].scheduledFor : null;
  }

  private async process() {
    while (this.isRunning) {
      try {
        const now = new Date();
        const readyTasks = this.tasks.filter(task => task.scheduledFor <= now);

        if (readyTasks.length > 0) {
          console.log(`[Scheduler] Processing ${readyTasks.length} ready tasks`);

          this.tasks = this.tasks.filter(task => task.scheduledFor > now);

          const concurrency = 3;
          for (let i = 0; i < readyTasks.length; i += concurrency) {
            const batch = readyTasks.slice(i, i + concurrency);
            await Promise.allSettled(batch.map(task => this.executeTask(task)));
          }
        }

        await this.sleep(30000);
      } catch (error) {
        console.error('[Scheduler] Error in processing loop:', error);
        await this.sleep(60000);
      }
    }
  }

  private async executeTask(task: ScheduledTask) {
    try {
      console.log(`[Scheduler] Executing task ${task.id} (${task.type})`);

      switch (task.type) {
        case 'AUTO_RERUN':
          await this.handleAutoRerun(task);
          break;
        case 'EMAIL_NOTIFICATION':
          await this.handleEmailNotification(task);
          break;
        case 'CLEANUP':
          await this.handleCleanup(task);
          break;
        default:
          console.warn(`[Scheduler] Unknown task type ${task.type}`);
      }
    } catch (error) {
      console.error(`[Scheduler] Error executing task ${task.id}:`, error);
      if (error instanceof Error) {
        logError(error as any, { taskId: task.id, taskType: task.type });
      } else {
        logError(
          {
            name: 'UnknownError',
            message: `Unknown error executing task ${task.id}`,
            statusCode: 500
          },
          { taskId: task.id, taskType: task.type }
        );
      }
    }
  }

  private async handleAutoRerun(task: ScheduledTask) {
    const projectId = task.projectId;
    const userId = typeof task.data?.userId === 'string' ? task.data.userId : undefined;

    if (!projectId || !userId) {
      console.warn(`[Scheduler] AUTO_RERUN missing projectId or userId (task ${task.id})`);
      return;
    }

    const creditUsage = await getCreditUsage(userId);
    if (creditUsage.used >= creditUsage.limit) {
      console.log(`[Scheduler] User ${userId} has insufficient credits for auto-rerun`);
      return;
    }

    const latestRun = await prisma.run.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { project: true }
    });

    if (!latestRun) {
      console.log(`[Scheduler] No previous runs for project ${projectId}`);
      return;
    }

    const daysSinceLastRun = (Date.now() - latestRun.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastRun < 7) {
      console.log(
        `[Scheduler] Skipping auto-rerun for project ${projectId} - last run was ${daysSinceLastRun.toFixed(1)} days ago`
      );
      return;
    }

    const newRun = await prisma.run.create({
      data: {
        projectId,
        status: 'PENDING'
      }
    });

    await consume(userId, 1);

    orchestrateRun(newRun.id).catch(async (err: any) => {
      console.error(`[Scheduler] Auto-rerun failed for project ${projectId}:`, err);
      await prisma.run.update({
        where: { id: newRun.id },
        data: {
          status: 'ERROR',
          lastNote: `Auto-rerun failed: ${err?.message ?? 'Unknown error'}`
        }
      });
    });

    console.log(`[Scheduler] Started auto-rerun for project ${projectId} (run ${newRun.id})`);
  }

  private async handleEmailNotification(task: ScheduledTask) {
    console.log(`[Scheduler] Email notification task ${task.id} - not implemented`);
  }

  private async handleCleanup(_: ScheduledTask) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedLogs = await prisma.runLog.deleteMany({
      where: {
        run: { createdAt: { lt: thirtyDaysAgo } }
      }
    });

    console.log(`[Scheduler] Cleaned up ${deletedLogs.count} old run logs`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const scheduler = new TaskScheduler();

export async function scheduleAutoReruns() {
  const projects = await prisma.project.findMany({
    include: {
      user: { select: { id: true } }
    }
  });

  const now = new Date();

  for (const project of projects) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    scheduler.schedule({
      type: 'AUTO_RERUN',
      projectId: project.id,
      scheduledFor: tomorrow,
      priority: 1,
      data: { userId: project.user?.id ?? null }
    });

    for (let i = 1; i <= 4; i++) {
      const nextRun = new Date(tomorrow);
      nextRun.setDate(nextRun.getDate() + i * 7);

      scheduler.schedule({
        type: 'AUTO_RERUN',
        projectId: project.id,
        scheduledFor: nextRun,
        priority: 1,
        data: { userId: project.user?.id ?? null }
      });
    }
  }

  console.log(`[Scheduler] Scheduled auto-reruns for ${projects.length} projects`);
}

export function scheduleProjectMonitoring(projectId: string, userId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  return scheduler.schedule({
    type: 'AUTO_RERUN',
    projectId,
    scheduledFor: tomorrow,
    priority: 1,
    data: { userId }
  });
}

export function cancelProjectMonitoring(projectId: string): number {
  const tasks = scheduler
    .listScheduledTasks()
    .filter(task => task.type === 'AUTO_RERUN' && task.projectId === projectId);

  tasks.forEach(task => scheduler.cancel(task.id));

  return tasks.length;
}