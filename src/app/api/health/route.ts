import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';

export const dynamic = 'force-dynamic';

/** Unauthenticated liveness probe for uptime monitoring. Returns no business or account data. */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'ok', database: 'ok', latencyMs: Date.now() - startedAt, checkedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', database: 'unavailable', latencyMs: Date.now() - startedAt, checkedAt: new Date().toISOString() },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
