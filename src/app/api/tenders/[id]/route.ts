import { NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { getUnlockedTenderForRetailer } from '@/server/domain/unlockService';
import { getUserTenderServiceCategories, markMatchViewed, userOwnsTender } from '@/server/domain/tenderService';
import { ForbiddenError, UnauthorizedError } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { formatRetailerSummaryLocation } from '@/server/domain/tenderService';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';
import { rejectCrossOrigin } from '@/server/http/origin';
import { updateTenderSchema } from '@/lib/schemas/tender';
import { updateTender } from '@/server/domain/tenderService';

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const ownsTender = await userOwnsTender(user.id, params.id);
    const ownedTender = ownsTender ? await prisma.tender.findUnique({
      where: { id: params.id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
      },
    }) : null;
    if (ownedTender) {
      return NextResponse.json({ tender: ownedTender, unlocked: true });
    }

    const match = await prisma.tenderMatch.findUnique({
      where: { tenderId_retailerId: { tenderId: params.id, retailerId: user.id } },
    });
    if (!match) throw new ForbiddenError('Tender is not available to this User');

    await markMatchViewed(user.id, params.id);

    const unlock = await prisma.unlock.findUnique({
      where: { tenderId_retailerId: { tenderId: params.id, retailerId: user.id } },
    });

    if (unlock) {
      const tender = await getUnlockedTenderForRetailer(user.id, params.id);
      return NextResponse.json({ tender, unlocked: true });
    }

    // Pre-unlock: approved non-sensitive summary only (SEC-030/031).
    const serviceCategories = await getUserTenderServiceCategories(user.id);
    const [tender, unlockFeeGbp] = await Promise.all([
      prisma.tender.findUniqueOrThrow({
        where: { id: params.id },
        select: {
          id: true, reference: true, category: true, location: true, urgency: true, closingDate: true, status: true,
          client: { select: { clientCompanyMembership: { select: { company: { select: { tradeTenderId: true } } } } } },
          items: { where: { category: { in: serviceCategories } }, orderBy: { createdAt: 'asc' }, select: { id: true, category: true, subcategory: true, item: true, quantity: true } },
          packages: { where: { category: { in: serviceCategories } }, orderBy: { createdAt: 'asc' }, select: { id: true, reference: true, category: true, subcategory: true, item: true, quantity: true } },
        },
      }),
        getPaymentFeeGbp('RETAILER_UNLOCK'),
    ]);
    const packageCategories = [...new Set((tender.packages ?? []).map((pkg) => pkg.category))];
    return NextResponse.json({ tender: { ...tender, category: packageCategories[0] ?? tender.category, packageCategories, packageCount: packageCategories.length, location: formatRetailerSummaryLocation(tender.location), clientTradeTenderId: tender.client.clientCompanyMembership?.company.tradeTenderId ?? null, unlockFeeGbp }, unlocked: false });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const parsed = updateTenderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid tender details', issues: parsed.error.flatten() }, { status: 400 });
    }
    const tender = await updateTender(user.id, params.id, parsed.data);
    return NextResponse.json({ id: tender.id, reference: tender.reference });
  } catch (error) {
    return toErrorResponse(error);
  }
}
