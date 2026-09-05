import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { listMatchedSummariesForRetailer } from '@/server/domain/tenderService';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const count = (await listMatchedSummariesForRetailer(user.id)).filter((match) => match.viewedAt === null).length;
    return NextResponse.json({ count });
  } catch (error) {
    return toErrorResponse(error);
  }
}