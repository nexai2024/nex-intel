import { prisma } from '@/lib/prisma';
import { orchestrateRun } from '@/app/api/runs/orchestrator';
import { getCreditUsage } from '@/lib/credits';
import { logError } from '@/lib/errors';

/**
 * Scheduled monitoring system for automatic re-runs
 */

interface ScheduledTask {
  id: string;
  type: 'AUTO_RERUN' | 'EMAIL_NOTIFICATION' | 'CLEANUP';
  projectId?: string;
  runId?: string;
  scheduledFor: Date;
  priority: number;
  data?: any;
}

class TaskScheduler {
  private tasks: ScheduledTask[] = [];
  private isRunning = false;

  /**
   * Schedule a task for future execution
   */
  schedule(task: Omit<ScheduledTask, 'id'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scheduledTask: ScheduledTask = {
      id,
      ...task
    };

    this.tasks.push(scheduledTask);
    this.tasks.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

    console.log(`[Scheduler] Scheduled task ${id} for ${scheduledTask.scheduledFor.toISOString()}`);
    return id;
  }

  /**
   * Cancel a scheduled task
   */
  cancel(taskId: string): boolean {
    const index = this.tasks.findIndex(task => task.id === taskId);
    if (index > -1) {
      this.tasks.splice(index, 1);
      console.log(`[Scheduler] Cancelled task ${taskId}`);
      return true;
    }
    return false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[Scheduler] Starting task scheduler');
    this.process();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.isRunning = false;
    console.log('[Scheduler] Stopping task scheduler');
  }

  /**
   * Main processing loop
   */
  private async process() {
    while (this.isRunning) {
      try {
        const now = new Date();
        const readyTasks = this.tasks.filter(task => task.scheduledFor <= now);

        if (readyTasks.length > 0) {
          console.log(`[Scheduler] Processing ${readyTasks.length} ready tasks`);

          // Remove ready tasks from queue
          this.tasks = this.tasks.filter(task => task.scheduledFor > now);

          // Process tasks in parallel with limited concurrency
          const concurrencyLimit = 3;
          for (let i = 0; i < readyTasks.length; i += concurrencyLimit) {
            const batch = readyTasks.slice(i, i + concurrencyLimit);
            await Promise.allSettled(
              batch.map(task => this.executeTask(task))
            );
          }
        }

        // Sleep for 30 seconds before next check
        await this.sleep(30000);
      } catch (error) {
        console.error('[Scheduler] Error in processing loop:', error);
        await this.sleep(60000); // Wait longer on error
      }
    }
  }

  /**
   * Execute a single task
   */
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
          console.warn(`[Scheduler] Unknown task type: ${task.type}`);
      }
    } catch (error) {
      console.error(`[Scheduler] Error executing task ${task.id}:`, error);
      logError(error, { taskId: task.id, taskType: task.type });
    }
  }

  /**
   * Handle automatic re-run task
   */
  private async handleAutoRerun(task: ScheduledTask) {
    if (!task.projectId || !task.data?.userId) return;

    // Check user has enough credits
    const creditUsage = await getCreditUsage(task.data.userId);
    if (creditUsage.used >= creditUsage.limit) {
      console.log(`[Scheduler] User ${task.data.userId} has insufficient credits for auto-rerun`);
      return;
    }

    // Get the latest run for this project
    const latestRun = await prisma.run.findFirst({
      where: { projectId: task.projectId },
      orderBy: { createdAt: 'desc' },
      include: { project: true }
    });

    if (!latestRun) return;

    // Don't re-run if the latest run is less than 7 days old
    const daysSinceLastRun = (Date.now() - latestRun.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastRun < 7) {
      console.log(`[Scheduler] Skipping auto-rerun for project ${task.projectId} - last run was ${daysSinceLastRun.toFixed(1)} days ago`);
      return;
    }

    // Create new run
    const newRun = await prisma.run.create({
      data: {
        projectId: task.projectId,
        status: 'PENDING'
      }
    });

    // Consume credit
    const { consume } = await import('@/lib/credits');
    await consume(task.data.userId, 1);

    // Start orchestration
    orchestrateRun(newRun.id).catch(async (err: any) => {
      console.error(`[Scheduler] Auto-rerun failed for project ${task.projectId}:`, err);
      await prisma.run.update({
        where: { id: newRun.id },
        data: {
          status: 'ERROR',
          lastNote: `Auto-rerun failed: ${err.message}`
        }
      });
    });

    console.log(`[Scheduler] Started auto-rerun for project ${task.projectId} (run ${newRun.id})`);
  }

  /**
   * Handle email notification task
   */
  private async handleEmailNotification(task: ScheduledTask) {
    // TODO: Implement email notification system
    console.log(`[Scheduler] Email notification task ${task.id} - Not implemented yet`);
  }

  /**
   * Handle cleanup task
   */
  private async handleCleanup(task: ScheduledTask) {
    // Clean up old logs, temporary data, etc.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Clean up old run logs
    const deletedLogs = await prisma.runLog.deleteMany({
      where: {
        run: {
          createdAt: { lt: thirtyDaysAgo }
        }
      }
    });

    console.log(`[Scheduler] Cleaned up ${deletedLogs.count} old run logs`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scheduled tasks count
   */
  getTasksCount(): number {
    return this.tasks.length;
  }

  /**
   * Get next task time
   */
  getNextTaskTime(): Date | null {
    return this.tasks.length > 0 ? this.tasks[0].scheduledFor : null;
  }
}

// Global scheduler instance
export const scheduler = new TaskScheduler();

/**
 * Schedule automatic re-runs for projects
 */
export async function scheduleAutoReruns() {
  // Get projects that should be auto-monitored
  const projects = await prisma.project.findMany({
    where: {
      // Add criteria for auto-monitoring here
      // For now, we'll get all projects
    },
    include: {
      user: {
        select: { id: true }
      }
    }
  });

  const now = new Date();

  for (const project of projects) {
    // Schedule first re-run for tomorrow at 9 AM
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    scheduler.schedule({
      type: 'AUTO_RERUN',
      projectId: project.id,
      scheduledFor: tomorrow,
      priority: 1,
      data: {
        userId: project.user.id
      }
    });

    // Schedule weekly re-runs
    for (let i = 1; i <= 4; i++) {
      const nextRun = new Date(tomorrow);
      nextRun.setDate(nextRun.getDate() + (i * 7));

      scheduler.schedule({
        type: 'AUTO_RERUN',
        projectId: project.id,
        scheduledFor: nextRun,
        priority: 1,
        data: {
          userId: project.user.id
        }
      });
    }
  }

  console.log(`[Scheduler] Scheduled auto-reruns for ${projects.length} projects`);
}

/**
 * Schedule project for monitoring
 */
export async function scheduleProjectMonitoring(projectId: string, userId: string) {
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

/**
 * Cancel project monitoring
 */
export function cancelProjectMonitoring(projectId: string) {
  // Find and cancel all scheduled auto-reruns for this project
  const tasksToRemove = scheduler.tasks.filter(
    task => task.type === 'AUTO_RERUN' && task.projectId === projectId
  );

  tasksToRemove.forEach(task => {
    scheduler.cancel(task.id);
  });

  return tasksToRemove.length;
}