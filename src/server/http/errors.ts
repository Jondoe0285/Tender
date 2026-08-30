import { NextResponse } from 'next/server';
import { ForbiddenError, UnauthorizedError, ValidationError } from '@/server/auth/session';
import { ContentModerationError } from '@/server/moderation/contentModeration';

/** Converts domain errors to safe, non-revealing HTTP responses (SEC-019/026). */
export function toErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof ContentModerationError) {
    return NextResponse.json({ error: 'Content requires changes before it can be shared', decision: error.result.decision, reasons: error.result.reasons }, { status: 400 });
  }
  return NextResponse.json({ error: 'Unable to process request' }, { status: 500 });
}
