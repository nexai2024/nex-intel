import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCreditUsage } from '@/lib/credits';

export async function GET() {
  try {
    const user = await requireAuth();

    const usage = await getCreditUsage(user.id);

    return NextResponse.json(usage);
  } catch (error: any) {
    return NextResponse.json({ used: 0, limit: 1000 }, { status: 200 });
  }
}
