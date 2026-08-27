import { NextResponse } from 'next/server';

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin === new URL(request.url).origin;

  const referer = request.headers.get('referer');
  if (referer) return new URL(referer).origin === new URL(request.url).origin;

  // Non-browser clients may omit both headers; authentication and authorization still apply.
  return true;
}

export function rejectCrossOrigin(request: Request): NextResponse | null {
  return isSameOriginRequest(request)
    ? null
    : NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
}
