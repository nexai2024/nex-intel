import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      throw new HttpError(400, 'Share token is required');
    }

    // Find the share record
    const share = await prisma.reportShare.findUnique({
      where: { token },
      include: {
        report: {
          select: {
            id: true,
            headline: true,
            mdContent: true,
            format: true,
            createdAt: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!share) {
      throw new HttpError(404, 'Share not found');
    }

    // Check if share has expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new HttpError(410, 'Share link has expired');
    }

    // If password protected, return 401 to trigger password prompt
    if (share.password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 401 }
      );
    }

    // Return the report data
    return NextResponse.json({
      report: share.report,
      project: share.project,
      share: {
        id: share.id,
        token: share.token,
        expiresAt: share.expiresAt,
        hasPassword: !!share.password,
        allowDownload: share.allowDownload,
        createdAt: share.createdAt,
      },
      createdBy: share.createdBy,
    });
  } catch (error: any) {
    console.error('Error accessing shared report:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to access shared report' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { password } = await request.json();

    if (!token) {
      throw new HttpError(400, 'Share token is required');
    }

    if (!password) {
      throw new HttpError(400, 'Password is required');
    }

    // Find the share record
    const share = await prisma.reportShare.findUnique({
      where: { token },
      include: {
        report: {
          select: {
            id: true,
            headline: true,
            mdContent: true,
            format: true,
            createdAt: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!share) {
      throw new HttpError(404, 'Share not found');
    }

    // Check if share has expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new HttpError(410, 'Share link has expired');
    }

    // Check if share is password protected
    if (!share.password) {
      // No password required, return the data
      return NextResponse.json({
        report: share.report,
        project: share.project,
        share: {
          id: share.id,
          token: share.token,
          expiresAt: share.expiresAt,
          hasPassword: false,
          allowDownload: share.allowDownload,
          createdAt: share.createdAt,
        },
        createdBy: share.createdBy,
      });
    }

    // Verify the password (simple string comparison for now)
    // In production, you should use proper password hashing
    const passwordMatch = password === share.password;
    if (!passwordMatch) {
      throw new HttpError(401, 'Invalid password');
    }

    // Password is correct, return the report data
    return NextResponse.json({
      report: share.report,
      project: share.project,
      share: {
        id: share.id,
        token: share.token,
        expiresAt: share.expiresAt,
        hasPassword: true,
        allowDownload: share.allowDownload,
        createdAt: share.createdAt,
      },
      createdBy: share.createdBy,
    });
  } catch (error: any) {
    console.error('Error accessing shared report with password:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to access shared report' },
      { status: 500 }
    );
  }
}