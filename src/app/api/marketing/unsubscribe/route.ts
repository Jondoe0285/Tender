import { NextResponse } from 'next/server';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';
import { readUnsubscribeToken } from '@/server/notifications/marketingUnsubscribe';
import { unsubscribeMarketingEmail } from '@/server/domain/marketingCampaignService';

export async function POST(request: Request) {
  const rateLimitError = await createRateLimitResponse(request, 'marketing-unsubscribe', { maxRequests: 30, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  try {
    const url = new URL(request.url);
    const form = await request.formData().catch(() => null);
    const token = url.searchParams.get('token') ?? (typeof form?.get('token') === 'string' ? String(form.get('token')) : null);
    const email = readUnsubscribeToken(token);
    if (!email) return NextResponse.json({ error: 'This unsubscribe link is not valid.' }, { status: 400 });
    const source = form?.get('List-Unsubscribe') === 'One-Click' ? 'one-click' : 'link';
    await unsubscribeMarketingEmail(email, source);
    return NextResponse.json({ status: 'unsubscribed' });
  } catch (error) {
    return toErrorResponse(error);
  }
}
