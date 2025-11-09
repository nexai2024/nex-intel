import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireCanViewProject } from '@/lib/rbac';
import { HttpError } from '@/lib/http';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: reportId, shareId } = await params;

    // Get the share to verify ownership
    const share = await prisma.reportShare.findUnique({
      where: { id: shareId },
      include: {
        report: {
          select: {
            id: true,
            projectId: true,
          },
        },
      },
    });

    if (!share) {
      throw new HttpError(404, 'Share not found');
    }

    if (share.reportId !== reportId) {
      throw new HttpError(404, 'Share does not belong to this report');
    }

    // Check if user can view this project
    await requireCanViewProject(user.id, share.report.projectId);

    // Only the share creator or project owner can delete shares
    if (share.createdById !== user.id) {
      // Check if user is the project owner
      const project = await prisma.project.findUnique({
        where: { id: share.report.projectId },
        select: { userId: true },
      });

      if (project?.userId !== user.id) {
        throw new HttpError(403, 'You can only delete shares you created');
      }
    }

    // Delete the share
    await prisma.reportShare.delete({
      where: { id: shareId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'REPORT_SHARE_DELETED',
        message: `Deleted share link for report`,
        userId: user.id,
        projectId: share.report.projectId,
        reportId: share.reportId,
        metadata: {
          shareId,
          shareToken: share.token,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting report share:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete report share' },
      { status: 500 }
    );
  }
}