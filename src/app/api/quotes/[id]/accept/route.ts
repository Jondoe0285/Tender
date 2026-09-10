import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { acceptQuote } from '@/server/domain/contactReleaseService';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const body = await request.json().catch(() => null);
    const declarationAccepted = body?.declarationAccepted === true;
    const outcome = await acceptQuote(user.id, params.id, request.headers.get('x-mobile-payment-return') ?? undefined, declarationAccepted);
    return NextResponse.json(outcome);
  } catch (error) {
    return toErrorResponse(error);
  }
}
