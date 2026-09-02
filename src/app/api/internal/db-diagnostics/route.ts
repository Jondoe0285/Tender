import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { toErrorResponse } from '@/server/http/errors';

// Temporary read-only diagnostic route to inspect migration history on a deployed environment
// where a SQL console is unavailable. Remove once the RateLimitEntry migration drift is confirmed and resolved.
function hasValidJobSecret(request: Request): boolean {
  const expected = process.env.RETENTION_JOB_SECRET;
  const authorization = request.headers.get('authorization');
  if (!expected || !authorization?.startsWith('Bearer ')) return false;

  const provided = Buffer.from(authorization.slice('Bearer '.length));
  const configured = Buffer.from(expected);
  return provided.length === configured.length && timingSafeEqual(provided, configured);
}

export async function GET(request: Request) {
  if (!hasValidJobSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const migrations = await prisma.$queryRawUnsafe<
      { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
    >('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 10');

    const tables = await prisma.$queryRawUnsafe<{ table_name: string; exists: boolean }[]>(
      `SELECT t.name AS table_name, (to_regclass('"' || t.name || '"') IS NOT NULL) AS exists
       FROM (VALUES ('RateLimitEntry'), ('AuditLog')) AS t(name)`
    );

    return NextResponse.json({ migrations, tables });
  } catch (error) {
    return toErrorResponse(error);
  }
}
