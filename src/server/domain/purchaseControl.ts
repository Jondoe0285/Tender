import { prisma } from '@/server/data/prisma';
import { ValidationError } from '@/server/auth/session';
import { getCompanyMemberIds } from '@/server/domain/tenderService';

const SPEND_CAP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function assertReleaseSpendCap(clientId: string, additionalFeeGbp: number) {
  const membership = await prisma.clientCompanyMember.findUnique({
    where: { userId: clientId },
    select: { company: { select: { id: true, releaseSpendCapGbp: true } } },
  });
  const cap = membership?.company.releaseSpendCapGbp;
  if (cap == null) return;
  const memberIds = await getCompanyMemberIds(clientId);
  const since = new Date(Date.now() - SPEND_CAP_WINDOW_MS);
  const spent = await prisma.payment.aggregate({
    where: {
      userId: { in: memberIds },
      type: 'CLIENT_RELEASE',
      status: 'CONFIRMED',
      amountGbp: { gt: 0 },
      confirmedAt: { gte: since },
    },
    _sum: { amountGbp: true },
  });
  const used = spent._sum.amountGbp ?? 0;
  if (used + additionalFeeGbp > cap) {
    throw new ValidationError(`This award would exceed the company 30-day release spend cap of £${cap.toFixed(2)} excl. VAT.`);
  }
}
