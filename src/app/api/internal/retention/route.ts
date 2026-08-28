import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { purgeExpiredUnpurchasedQuotes } from '@/server/domain/retentionService';
import { toErrorResponse } from '@/server/http/errors';

function hasValidJobSecret(request: Request): boolean {
  const expected = process.env.RETENTION_JOB_SECRET;
  const authorization = request.headers.get('authorization');
  if (!expected || !authorization?.startsWith('Bearer ')) return false;

  const provided = Buffer.from(authorization.slice('Bearer '.length));
  const configured = Buffer.from(expected);
  return provided.length === configured.length && timingSafeEqual(provided, configured);
}

export async function POST(request: Request) {
  if (!hasValidJobSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deletedCount = await purgeExpiredUnpurchasedQuotes();
    return NextResponse.json({ deletedCount });
  } catch (error) {
    return toErrorResponse(error);
  }
}
