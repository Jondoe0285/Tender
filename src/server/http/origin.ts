import { NextResponse } from 'next/server';

function requestOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost && forwardedProto) {
    return `${forwardedProto.split(',')[0].trim()}://${forwardedHost.split(',')[0].trim()}`;
  }

  return new URL(request.url).origin;
}

function permittedOrigins(request: Request): string[] {
  return [...new Set([new URL(request.url).origin, requestOrigin(request)])];
}

function isConfiguredApplicationOrigin(origin: string): boolean {
  const applicationUrl = process.env.NEXTAUTH_URL;
  if (!applicationUrl) return false;

  try {
    return new URL(applicationUrl).origin === origin;
  } catch {
    return false;
  }
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    return permittedOrigins(request).includes(origin)
      || isConfiguredApplicationOrigin(origin)
      || isLocalDevelopmentOrigin(origin);
  }

  const referer = request.headers.get('referer');
  if (referer) {
    const refererOrigin = new URL(referer).origin;
    return permittedOrigins(request).includes(refererOrigin)
      || isConfiguredApplicationOrigin(refererOrigin)
      || isLocalDevelopmentOrigin(refererOrigin);
  }

  // Non-browser clients may omit both headers; authentication and authorization still apply.
  return true;
}

export function rejectCrossOrigin(request: Request): NextResponse | null {
  return isSameOriginRequest(request)
    ? null
    : NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
}
