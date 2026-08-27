import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { acceptQuote } from '@/server/domain/contactReleaseService';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const originError = rejectCrossOrigin(_request);
    if (originError) return originError;
    const user = await requireRole('CLIENT');
    const outcome = await acceptQuote(user.id, params.id);
    return NextResponse.json(outcome);
  } catch (error) {
    return toErrorResponse(error);
  }
}
