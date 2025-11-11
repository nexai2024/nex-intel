import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { HttpError } from '@/lib/http';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    let preferences = await prisma.emailPreferences.findUnique({
      where: { userId: user.id },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.emailPreferences.create({
        data: {
          userId: user.id,
          unsubscribeToken: randomBytes(32).toString('hex'),
        },
      });
    }

    return NextResponse.json(preferences);
  } catch (error: any) {
    console.error('Error fetching email preferences:', error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch email preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

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

    // Upsert the preferences
    const preferences = await prisma.emailPreferences.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        unsubscribeToken: randomBytes(32).toString('hex'),
        ...updateData,
      },
    });

    return NextResponse.json(preferences);
  } catch (error: any) {
    console.error('Error updating email preferences:', error);
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