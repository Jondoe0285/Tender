import { NextResponse } from 'next/server';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';
import { previewMarketingCampaign } from '@/server/domain/marketingCampaignService';
import { isEmailConfigured } from '@/server/notifications/resend';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const rateLimitError = await createRateLimitResponse(request, 'marketing-campaign-preview', { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  try {
    const owner = await requireOwner();
    if (!isEmailConfigured()) {
      return NextResponse.json({ error: 'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM for this environment.' }, { status: 503 });
    }
    const { id } = await props.params;
    await previewMarketingCampaign({ actorId: owner.id, actorEmail: owner.email, campaignId: id });
    return NextResponse.json({ status: 'sent', recipient: owner.email });
  } catch (error) {
    return toErrorResponse(error);
  }
}
