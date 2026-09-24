import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds } from '@/server/domain/tenderService';
import { hydrateEnterpriseRecords } from '@/server/domain/enterpriseRecordRepair';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const memberIds = await getCompanyMemberIds(user.id);
    await hydrateEnterpriseRecords(memberIds);
    const awards = await prisma.award.findMany({
      where: { tender: { clientId: { in: memberIds } } },
      orderBy: { awardedAt: 'desc' },
      include: {
        project: { select: { name: true } },
        quote: { select: { id: true, reference: true, priceGbp: true } },
        tender: { select: { id: true, reference: true, subcategory: true, category: true, location: true } },
      },
    });
    return NextResponse.json({ awards });
  } catch (error) {
    return toErrorResponse(error);
  }
}
