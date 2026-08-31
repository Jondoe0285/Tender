import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { getCurrentUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { pageViewSchema } from '@/lib/schemas/pageView';

/** Records the in-app route a user visited, so a Super User can review "locations visited" on a profile. */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const rateLimitError = createRateLimitResponse(request, 'page-view', { maxRequests: 120, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const parsed = pageViewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid page view' }, { status: 400 });

  await prisma.pageView.create({ data: { userId: user.id, path: parsed.data.path } });

  return NextResponse.json({ status: 'recorded' });
}
