import { prisma } from '@/lib/prisma';

/**
 * Check if user has enough credits to consume
 */
export async function canConsume(userId: string, amount: number = 1): Promise<boolean> {
  const currentCredits = await getCredits(userId);
  return currentCredits >= amount;
}

/**
 * Consume credits for a user
 */
export async function consume(userId: string, amount: number = 1): Promise<void> {
  const monthKey = getMonthKey();

  const ledger = await prisma.creditLedger.upsert({
    where: {
      userId_month: {
        userId,
        month: monthKey
      }
    },
    update: {
      used: {
        increment: amount
      }
    },
    create: {
      userId,
      month: monthKey,
      used: amount,
      limit: 1000 // Default monthly limit
    }
  });

  console.log(`Consumed ${amount} credits for user ${userId}. ${ledger.limit - ledger.used} remaining.`);
}

/**
 * Get remaining credits for a user
 */
export async function getCredits(userId: string): Promise<number> {
  const monthKey = getMonthKey();

  const ledger = await prisma.creditLedger.findUnique({
    where: {
      userId_month: {
        userId,
        month: monthKey
      }
    }
  });

  if (!ledger) {
    // Create default ledger if doesn't exist
    await prisma.creditLedger.create({
      data: {
        userId,
        month: monthKey,
        used: 0,
        limit: 1000
      }
    });
    return 1000;
  }

  return Math.max(0, ledger.limit - ledger.used);
}

/**
 * Get credit usage and limit for a user
 */
export async function getCreditUsage(userId: string): Promise<{ used: number; limit: number }> {
  const monthKey = getMonthKey();

  const ledger = await prisma.creditLedger.findUnique({
    where: {
      userId_month: {
        userId,
        month: monthKey
      }
    }
  });

  if (!ledger) {
    // Create default ledger if doesn't exist
    await prisma.creditLedger.create({
      data: {
        userId,
        month: monthKey,
        used: 0,
        limit: 1000
      }
    });
    return { used: 0, limit: 1000 };
  }

  return { used: ledger.used, limit: ledger.limit };
}

/**
 * Get month key in YYYY-MM format
 */
function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
