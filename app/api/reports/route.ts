import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const format = url.searchParams.get('format');

    const where: any = {
      run: {
        project: {
          userId: user.id
        }
      }
    };

    if (format && format !== 'all') {
      where.format = format.toUpperCase();
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        run: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(reports);

  } catch (error: any) {
    console.error('Failed to fetch reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}