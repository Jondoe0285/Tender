import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { acceptQuote } from '@/server/domain/contactReleaseService';

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const originError = rejectCrossOrigin(_request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const outcome = await acceptQuote(user.id, params.id);
    return NextResponse.json(outcome);
  } catch (error) {
    return toErrorResponse(error);
  }
}
