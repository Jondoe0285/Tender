import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { prisma } from '@/server/data/prisma';

const PERIODS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
} as const;

type Period = keyof typeof PERIODS;

function periodStart(period: Period): Date | undefined {
  const days = PERIODS[period];
  if (days === null) return undefined;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export async function GET(request: Request) {
  try {
    const user = await requireRole('USER');
    const requested = new URL(request.url).searchParams.get('period');
    const period: Period = requested && requested in PERIODS ? requested as Period : '30d';
    const start = periodStart(period);
    const dateFilter = start ? { gte: start } : undefined;
    const [unlocks, quotesProvided, quotesAccepted, payments] = await Promise.all([
      prisma.unlock.count({ where: { retailerId: user.id, ...(dateFilter ? { unlockedAt: dateFilter } : {}) } }),
      prisma.quote.count({ where: { retailerId: user.id, ...(dateFilter ? { submittedAt: dateFilter } : {}) } }),
      prisma.quote.count({ where: { retailerId: user.id, status: 'ACCEPTED', ...(dateFilter ? { submittedAt: dateFilter } : {}) } }),
      prisma.payment.findMany({
        where: { userId: user.id, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          createdAt: true,
          type: true,
          amountGbp: true,
          vatGbp: true,
          vatPercentage: true,
          totalAmountGbp: true,
          status: true,
        },
      }),
    ]);
    return NextResponse.json({
      period,
      metrics: {
        unlocks,
        quotesProvided,
        quotesAccepted,
      },
      payments,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
