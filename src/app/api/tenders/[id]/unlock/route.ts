import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { requestUnlock } from '@/server/domain/unlockService';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const outcome = await requestUnlock(user.id, params.id, request.headers.get('x-mobile-payment-return') ?? undefined);
    return NextResponse.json(outcome);
  } catch (error) {
    return toErrorResponse(error);
  }
}
