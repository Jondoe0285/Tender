import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { getUnlockedTenderForRetailer } from '@/server/domain/unlockService';
import { markMatchViewed } from '@/server/domain/tenderService';
import { ForbiddenError, UnauthorizedError } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { formatRetailerSummaryLocation } from '@/server/domain/tenderService';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    if (user.role === 'CONTRACTOR') {
      const tender = await prisma.tender.findUnique({
        where: { id: params.id },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
      if (!tender || tender.clientId !== user.id) throw new ForbiddenError('Tender not found for this Client');
      return NextResponse.json({ tender, unlocked: true });
    }

    if (user.role === 'PROVIDER') {
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

      // Pre-unlock: approved non-sensitive summary only (SEC-030/031). Item name/subcategory and
      // quantity are headline requirement details permitted by SEC-030; the free-text
      // description (full specification) stays hidden until unlock.
      const [tender, unlockFeeGbp] = await Promise.all([
        prisma.tender.findUniqueOrThrow({
          where: { id: params.id },
          select: {
            id: true, reference: true, category: true, location: true, urgency: true, closingDate: true, status: true,
            client: { select: { clientCompanyMembership: { select: { company: { select: { tradeTenderId: true } } } } } },
            items: { orderBy: { createdAt: 'asc' }, select: { id: true, category: true, subcategory: true, item: true, quantity: true } },
            packages: { orderBy: { createdAt: 'asc' }, select: { id: true, reference: true, category: true, subcategory: true, item: true, quantity: true } },
          },
        }),
        getPaymentFeeGbp('RETAILER_UNLOCK'),
      ]);
      const packageCategories = [...new Set((tender.packages ?? []).map((pkg) => pkg.category))];
      return NextResponse.json({
        tender: {
          ...tender,
          packageCategories,
          packageCount: packageCategories.length,
          location: formatRetailerSummaryLocation(tender.location),
          clientTradeTenderId: tender.client.clientCompanyMembership?.company.tradeTenderId ?? null,
          unlockFeeGbp,
        },
        unlocked: false,
      });
    }

    throw new ForbiddenError();
  } catch (error) {
    return toErrorResponse(error);
  }
}
