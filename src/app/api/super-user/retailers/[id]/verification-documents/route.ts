import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireFullSuperUser } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { listVerificationDocumentsForReview } from '@/server/domain/verificationDocumentService';

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireFullSuperUser();
    const profile = await prisma.retailerProfile.findUnique({ where: { userId: params.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    const documents = await listVerificationDocumentsForReview(profile.id);
    return NextResponse.json({ documents });
  } catch (error) {
    return toErrorResponse(error);
  }
}
