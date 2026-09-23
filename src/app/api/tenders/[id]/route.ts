import { NextResponse } from 'next/server';
import { getCurrentUser, requireRole, ForbiddenError, UnauthorizedError } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { getUnlockedTenderForRetailer } from '@/server/domain/unlockService';
import { formatRetailerSummaryLocation, getUserTenderServiceProvisions, markMatchViewed, tenderProvisionPackageWhere, updateTender, userOwnsTender } from '@/server/domain/tenderService';
import { prisma } from '@/server/data/prisma';
import { getTenderUnlockFeeGbp } from '@/server/domain/platformSettings';
import { rejectCrossOrigin } from '@/server/http/origin';
import { updateTenderSchema } from '@/lib/schemas/tender';
import { assertAnyBuyerDuty } from '@/server/domain/workspacePermissions';

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
    const provisions = await getUserTenderServiceProvisions(user.id);
    const provisionWhere = tenderProvisionPackageWhere(provisions);
    const [tender, unlockFeeGbp] = await Promise.all([
      prisma.tender.findUniqueOrThrow({
        where: { id: params.id },
        select: {
          id: true, reference: true, category: true, location: true, urgency: true, closingDate: true, status: true,
          items: { where: provisionWhere, orderBy: { createdAt: 'asc' }, select: { id: true, category: true, subcategory: true, item: true, quantity: true, specJson: true } },
          packages: { where: provisionWhere, orderBy: { createdAt: 'asc' }, select: { id: true, reference: true, category: true, subcategory: true, item: true, quantity: true, specJson: true } },
        },
      }),
        getTenderUnlockFeeGbp(params.id),
    ]);
    const packageCategories = [...new Set((tender.packages ?? []).map((pkg) => pkg.category))];
    return NextResponse.json({ tender: { ...tender, category: packageCategories[0] ?? tender.category, packageCategories, packageCount: packageCategories.length, location: formatRetailerSummaryLocation(tender.location), unlockFeeGbp }, unlocked: false });
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
    await assertAnyBuyerDuty(user.id, ['RAISER', 'ESTIMATOR']);
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
