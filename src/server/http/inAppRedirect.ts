import { NextResponse } from 'next/server';

/**
 * In-app navigation must stay on the host the browser already used.
 * Absolute NEXTAUTH_URL redirects send Owners (and everyone else) back to a
 * previous Render hostname after a custom domain or service URL change.
 */
export function inAppRedirect(path: string, status = 307) {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('inAppRedirect expects a root-relative path beginning with a single "/".');
  }
  return new NextResponse(null, { status, headers: { Location: path } });
}
