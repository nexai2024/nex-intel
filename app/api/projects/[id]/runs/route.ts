import { prisma } from '@/lib/prisma';
import { json, HttpError } from '@/lib/http';
import { requireAuth } from '@/lib/auth';
import { requireCanViewProject } from '@/lib/rbac';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await ctx.params;
    
    // Check if user can view this project
    await requireCanViewProject(user.id, projectId);
    
    // Get all runs for this project
    const runs = await prisma.run.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true
      }
    });
    
    return json(runs);
  } catch (error: any) {
    console.error('Error fetching project runs:', error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, error.message || 'Internal server error');
  }
}
