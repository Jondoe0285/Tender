import { NextResponse } from 'next/server';
import { requireFullSuperUser } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { listSupportRequestsForSuperUser } from '@/server/domain/supportRequestService';

export async function GET() {
  try {
    await requireFullSuperUser();
    return NextResponse.json({ requests: await listSupportRequestsForSuperUser() });
  } catch (error) {
    return toErrorResponse(error);
  }
}