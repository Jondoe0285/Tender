import { NextResponse } from 'next/server';
import { ForbiddenError, UnauthorizedError } from '@/server/auth/session';

/** Converts domain errors to safe, non-revealing HTTP responses (SEC-019/026). */
export function toErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  return NextResponse.json({ error: 'Unable to process request' }, { status: 500 });
}
