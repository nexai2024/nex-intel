import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { requireCanViewProject } from '@/lib/rbac';
import { HttpError } from '@/lib/http';
import { randomBytes } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: reportId } = await params;
    const { expiresAt, password, allowDownload = true } = await request.json();

    // Get the report to validate access
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        project: {
          select: {
            id: true,
            teamId: true,
            userId: true,
          },
        },
      },
    });

    if (!report) {
      throw new HttpError(404, 'Report not found');
    }

    // Check if user can view this project (required to share)
    await requireCanViewProject(user.id, report.projectId);

    // Validate expiration date
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (expiryDate <= new Date()) {
        throw new HttpError(400, 'Expiration date must be in the future');
      }
    }

    // Generate secure share token
    const shareToken = randomBytes(32).toString('hex');

    // Create the share record
    const share = await prisma.reportShare.create({
      data: {
        reportId,
        projectId: report.projectId,
        token: shareToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        password: password || null,
        allowDownload,
        createdById: user.id,
      },
      include: {
        report: {
          select: {
            id: true,
            headline: true,
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
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'REPORT_SHARED',
        message: `Shared report "${report.headline}"`,
        userId: user.id,
        projectId: report.projectId,
        reportId,
        metadata: {
          shareId: share.id,
          shareToken: share.token,
          expiresAt: share.expiresAt,
          hasPassword: !!password,
          allowDownload: share.allowDownload,
        },
      },
    });

    return NextResponse.json({
      id: share.id,
      token: share.token,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/${share.token}`,
      expiresAt: share.expiresAt,
      hasPassword: !!share.password,
      allowDownload: share.allowDownload,
      createdAt: share.createdAt,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating report share:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create report share' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: reportId } = await params;

    // Get the report to validate access
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        projectId: true,
        headline: true,
        createdAt: true,
      },
    });

    if (!report) {
      throw new HttpError(404, 'Report not found');
    }

    // Check if user can view this project
    await requireCanViewProject(user.id, report.projectId);

    // Get existing shares for this report
    const shares = await prisma.reportShare.findMany({
      where: { reportId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format shares with URLs and check if expired
    const formattedShares = shares.map(share => ({
      id: share.id,
      token: share.token,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/${share.token}`,
      expiresAt: share.expiresAt,
      hasPassword: !!share.password,
      allowDownload: share.allowDownload,
      isExpired: share.expiresAt ? share.expiresAt < new Date() : false,
      createdAt: share.createdAt,
      createdBy: share.createdBy,
    }));

    return NextResponse.json({
      report: {
        id: report.id,
        headline: report.headline,
        createdAt: report.createdAt,
      },
      shares: formattedShares,
    });
  } catch (error: any) {
    console.error('Error fetching report shares:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch report shares' },
      { status: 500 }
    );
  }
}