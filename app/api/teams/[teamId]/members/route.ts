import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  requireCanInviteMembers,
  canAssignRole,
  getUserTeamRole,
  canRemoveMember,
  canChangeMemberRole
} from '@/lib/rbac';
import { HttpError } from '@/lib/http';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await requireAuth();
    const { teamId } = await params;

    // Check if user is a team member (any role can view member list)
    const userRole = await getUserTeamRole(user.id, teamId);
    if (!userRole) {
      throw new HttpError(403, 'You are not a member of this team');
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });

    return NextResponse.json(members);
  } catch (error: any) {
    console.error('Failed to fetch team members:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await requireAuth();
    const { teamId } = await params;
    const { email, role = 'VIEWER' } = await request.json();

    if (!email?.trim()) {
      throw new HttpError(400, 'Email is required');
    }

    // Check if user can invite members to this team
    await requireCanInviteMembers(user.id, teamId);

    // Get current user's role to validate they can assign the requested role
    const currentUserRole = await getUserTeamRole(user.id, teamId);
    if (!currentUserRole) {
      throw new HttpError(403, 'You are not a member of this team');
    }

    // Validate role assignment permissions
    if (!canAssignRole(currentUserRole, role as any)) {
      throw new HttpError(403, `You cannot assign the role "${role}"`);
    }

    // Find user by email
    let targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    // If user doesn't exist, create them
    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: email.split('@')[0], // Extract name from email
        }
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUser.id
        }
      }
    });

    if (existingMember) {
      throw new HttpError(409, 'User is already a team member');
    }

    // Add user to team
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: targetUser.id,
        role: role as any
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          }
        }
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'MEMBER_ADDED',
        message: `Added ${targetUser.name || targetUser.email} to the team as ${role}`,
        userId: user.id,
        teamId,
        metadata: {
          memberUserId: targetUser.id,
          memberEmail: targetUser.email,
          role,
          invitedBy: user.id
        }
      }
    });

    // Create notification for the new member
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: 'TEAM_INVITATION',
        title: 'Team Invitation',
        message: `You've been added to a team as ${role}`,
        metadata: {
          teamId,
          role,
          invitedBy: user.id
        }
      }
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add team member:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}