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
      throw new HttpError(400, 'Unsubscribe token is required');
    }

    // Find the email preferences by unsubscribe token
    const preferences = await prisma.emailPreferences.findUnique({
      where: { unsubscribeToken: token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!preferences) {
      throw new HttpError(404, 'Invalid unsubscribe token');
    }

    return NextResponse.json({
      user: preferences.user,
      preferences: {
        reportCompletions: preferences.reportCompletions,
        monitoringAlerts: preferences.monitoringAlerts,
        teamInvitations: preferences.teamInvitations,
        roleChanges: preferences.roleChanges,
        memberRemovals: preferences.memberRemovals,
        mentions: preferences.mentions,
        commentReplies: preferences.commentReplies,
        approvalRequests: preferences.approvalRequests,
        weeklyDigest: preferences.weeklyDigest,
        monthlySummary: preferences.monthlySummary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching unsubscribe preferences:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch unsubscribe preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    if (!token) {
      throw new HttpError(400, 'Unsubscribe token is required');
    }

    // Validate the request body
    const validFields = [
      'reportCompletions',
      'monitoringAlerts',
      'teamInvitations',
      'roleChanges',
      'memberRemovals',
      'mentions',
      'commentReplies',
      'approvalRequests',
      'weeklyDigest',
      'monthlySummary',
    ];

    const updateData: any = {};
    for (const field of validFields) {
      if (field in body) {
        if (typeof body[field] !== 'boolean') {
          throw new HttpError(400, `Field ${field} must be a boolean`);
        }
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new HttpError(400, 'No valid fields provided for update');
    }

    // Update the preferences using the unsubscribe token
    const preferences = await prisma.emailPreferences.update({
      where: { unsubscribeToken: token },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Email preferences updated successfully',
      user: preferences.user,
      preferences: {
        reportCompletions: preferences.reportCompletions,
        monitoringAlerts: preferences.monitoringAlerts,
        teamInvitations: preferences.teamInvitations,
        roleChanges: preferences.roleChanges,
        memberRemovals: preferences.memberRemovals,
        mentions: preferences.mentions,
        commentReplies: preferences.commentReplies,
        approvalRequests: preferences.approvalRequests,
        weeklyDigest: preferences.weeklyDigest,
        monthlySummary: preferences.monthlySummary,
      },
    });
  } catch (error: any) {
    console.error('Error updating unsubscribe preferences:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update email preferences' },
      { status: 500 }
    );
  }
}