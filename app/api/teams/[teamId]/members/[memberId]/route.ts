import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  getUserTeamRole,
  canRemoveMember,
  canChangeMemberRole
} from '@/lib/rbac';
import { HttpError } from '@/lib/http';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  try {
    const user = await requireAuth();
    const { teamId, memberId } = await params;
    const { role } = await request.json();

    if (!Object.values(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']).includes(role)) {
      throw new HttpError(400, 'Invalid role');
    }

    // Check if user can change this member's role
    const canChange = await canChangeMemberRole(user.id, teamId, memberId, role);
    if (!canChange) {
      throw new HttpError(403, 'You cannot change this member\'s role');
    }

    // Get member details for logging
    const targetMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: memberId,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!targetMember) {
      throw new HttpError(404, 'Team member not found');
    }

    // Update the member's role
    const updatedMember = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId: memberId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'MEMBER_ROLE_CHANGED',
        message: `Changed ${targetMember.user.name || targetMember.user.email}'s role from ${targetMember.role} to ${role}`,
        userId: user.id,
        teamId,
        metadata: {
          memberUserId: memberId,
          memberEmail: targetMember.user.email,
          oldRole: targetMember.role,
          newRole: role,
          changedBy: user.id,
        },
      },
    });

    // Create notification for the member whose role was changed
    await prisma.notification.create({
      data: {
        userId: memberId,
        type: 'ROLE_CHANGED',
        title: 'Role Changed',
        message: `Your role in the team has been changed to ${role}`,
        metadata: {
          teamId,
          oldRole: targetMember.role,
          newRole: role,
          changedBy: user.id,
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error: any) {
    console.error('Failed to update team member role:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update team member role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  try {
    const user = await requireAuth();
    const { teamId, memberId } = await params;

    // Check if user can remove this member
    const canRemove = await canRemoveMember(user.id, teamId, memberId);
    if (!canRemove) {
      throw new HttpError(403, 'You cannot remove this team member');
    }

    // Get member details for logging
    const targetMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: memberId,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!targetMember) {
      throw new HttpError(404, 'Team member not found');
    }

    // Remove the member
    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: memberId,
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'MEMBER_REMOVED',
        message: `Removed ${targetMember.user.name || targetMember.user.email} from the team`,
        userId: user.id,
        teamId,
        metadata: {
          memberUserId: memberId,
          memberEmail: targetMember.user.email,
          removedBy: user.id,
        },
      },
    });

    // Create notification for the removed member
    await prisma.notification.create({
      data: {
        userId: memberId,
        type: 'REMOVED_FROM_TEAM',
        title: 'Removed from Team',
        message: `You have been removed from a team`,
        metadata: {
          teamId,
          removedBy: user.id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to remove team member:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}