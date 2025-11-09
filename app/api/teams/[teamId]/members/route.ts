import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;

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
  } catch (error) {
    console.error('Failed to fetch team members:', error);
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
    const { teamId } = await params;
    const { email, role = 'VIEWER' } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    let user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    // If user doesn't exist, create them
    if (!user) {
      user = await prisma.user.create({
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
          userId: user.id
        }
      }
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a team member' },
        { status: 409 }
      );
    }

    // Add user to team
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: user.id,
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
        message: `Added ${user.name || user.email} to the team`,
        userId: user.id, // This would be the current user in a real app
        teamId,
        metadata: {
          memberUserId: user.id,
          memberEmail: user.email,
          role
        }
      }
    });

    // Create notification for the new member
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TEAM_INVITATION',
        title: 'Team Invitation',
        message: `You've been added to a team`,
        metadata: {
          teamId,
          role
        }
      }
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Failed to add team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}