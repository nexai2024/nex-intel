import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  requireCanViewProject,
  requireCanEditProject,
  requireCanDeleteProject
} from '@/lib/rbac';
import { HttpError } from '@/lib/http';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    // Check if user can view this project
    await requireCanViewProject(user.id, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectInputs: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            runs: true,
            reports: true,
          },
        },
      },
    });

    if (!project) {
      throw new HttpError(404, 'Project not found');
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;
    const body = await request.json();

    // Check if user can edit this project
    await requireCanEditProject(user.id, projectId);

    // Validate input
    const { name, category, description, teamId } = body;

    if (name && typeof name !== 'string') {
      throw new HttpError(400, 'Invalid project name');
    }

    if (teamId) {
      // Verify user is member of the target team
      const userRole = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: user.id,
          },
        },
        select: { role: true },
      });

      if (!userRole) {
        throw new HttpError(403, 'You are not a member of this team');
      }
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name: name.trim() }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(teamId !== undefined && { teamId }),
      },
      include: {
        projectInputs: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'PROJECT_UPDATED',
        message: `Updated project "${project.name}"`,
        userId: user.id,
        projectId: project.id,
        teamId: project.teamId,
        metadata: {
          projectId: project.id,
          changes: Object.keys(body),
        },
      },
    });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error updating project:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    // Check if user can delete this project
    await requireCanDeleteProject(user.id, projectId);

    // Get project details for logging
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, teamId: true },
    });

    if (!project) {
      throw new HttpError(404, 'Project not found');
    }

    // Delete the project (Prisma will cascade delete related records)
    await prisma.project.delete({
      where: { id: projectId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'PROJECT_DELETED',
        message: `Deleted project "${project.name}"`,
        userId: user.id,
        teamId: project.teamId,
        metadata: {
          projectId,
          projectName: project.name,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}