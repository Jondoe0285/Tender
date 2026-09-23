import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { countUnreadMatchedOpportunities } from '@/server/domain/tenderService';

export async function GET() {
  try {
    const user = await requireRole('USER');
    return NextResponse.json({ count: await countUnreadMatchedOpportunities(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}