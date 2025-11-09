import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCreditUsage } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await requireAuth();

    // Get basic project and run counts
    const [totalProjects, totalRuns, completedRuns, failedRuns] = await Promise.all([
      prisma.project.count({
        where: { userId: user.id }
      }),
      prisma.run.count({
        where: { project: { userId: user.id } }
      }),
      prisma.run.count({
        where: {
          project: { userId: user.id },
          status: 'COMPLETE'
        }
      }),
      prisma.run.count({
        where: {
          project: { userId: user.id },
          status: 'FAILED'
        }
      })
    ]);

    // Get average run time (in minutes)
    const runTimes = await prisma.run.findMany({
      where: {
        project: { userId: user.id },
        status: 'COMPLETE',
        startedAt: { not: null },
        completedAt: { not: null }
      },
      select: {
        startedAt: true,
        completedAt: true
      }
    });

    const avgRunTime = runTimes.length > 0
      ? Math.round(runTimes.reduce((acc, run) => {
          const duration = (run.completedAt!.getTime() - run.startedAt!.getTime()) / (1000 * 60);
          return acc + duration;
        }, 0) / runTimes.length)
      : 0;

    // Get credit usage
    const creditUsage = await getCreditUsage(user.id);

    // Get recent runs (last 10)
    const recentRuns = await prisma.run.findMany({
      where: { project: { userId: user.id } },
      include: {
        project: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get top projects by run count
    const topProjects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { runs: true } },
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, createdAt: true }
        }
      },
      orderBy: {
        runs: {
          _count: 'desc'
        }
      },
      take: 5
    });

    const formattedTopProjects = topProjects.map(project => ({
      id: project.id,
      name: project.name,
      runCount: project._count.runs,
      lastRunStatus: project.runs[0]?.status || 'NO_RUNS',
      lastRunDate: project.runs[0]?.createdAt || project.createdAt
    }));

    const formattedRecentRuns = recentRuns.map(run => ({
      id: run.id,
      projectName: run.project.name,
      status: run.status,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString()
    }));

    return NextResponse.json({
      totalProjects,
      totalRuns,
      completedRuns,
      failedRuns,
      avgRunTime,
      creditsUsed: creditUsage.used,
      creditsLimit: creditUsage.limit,
      recentRuns: formattedRecentRuns,
      topProjects: formattedTopProjects
    });

  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}