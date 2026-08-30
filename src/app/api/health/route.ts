import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Unauthenticated liveness probe for the Render health check. Exposes no application state. */
export function GET() {
  return NextResponse.json({ status: 'ok' });
}
