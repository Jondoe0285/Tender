import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { getUnlockedTenderForRetailer } from '@/server/domain/unlockService';
import { markMatchViewed } from '@/server/domain/tenderService';
import { ForbiddenError, UnauthorizedError } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    if (user.role === 'CLIENT') {
      const tender = await prisma.tender.findUnique({
        where: { id: params.id },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
      if (!tender || tender.clientId !== user.id) throw new ForbiddenError('Tender not found for this Client');
      return NextResponse.json({ tender, unlocked: true });
    }

    if (user.role === 'RETAILER') {
      const match = await prisma.tenderMatch.findUnique({
        where: { tenderId_retailerId: { tenderId: params.id, retailerId: user.id } },
      });
      if (!match) throw new ForbiddenError('Tender is not matched to this Retailer');

      await markMatchViewed(user.id, params.id);

      const unlock = await prisma.unlock.findUnique({
        where: { tenderId_retailerId: { tenderId: params.id, retailerId: user.id } },
      });

      if (unlock) {
        const tender = await getUnlockedTenderForRetailer(user.id, params.id);
        return NextResponse.json({ tender, unlocked: true });
      }

      // Pre-unlock: approved non-sensitive summary only (SEC-030/031).
      const tender = await prisma.tender.findUniqueOrThrow({
        where: { id: params.id },
        select: { id: true, reference: true, category: true, location: true, urgency: true, closingDate: true, status: true },
      });
      return NextResponse.json({ tender, unlocked: false });
    }

    throw new ForbiddenError();
  } catch (error) {
    return toErrorResponse(error);
  }
}
