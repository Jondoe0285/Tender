import { NextResponse } from 'next/server';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';
import { sendMarketingCampaignBatch } from '@/server/domain/marketingCampaignService';
import { marketingSendSchema } from '@/lib/schemas/marketing';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const rateLimitError = await createRateLimitResponse(request, 'marketing-campaign-send', { maxRequests: 40, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  try {
    const owner = await requireOwner();
    const { id } = await props.params;
    const body = await request.json().catch(() => null);
    const parsed = marketingSendSchema.safeParse(body);
    const result = await sendMarketingCampaignBatch({
      actorId: owner.id,
      campaignId: id,
      confirmLawfulBasis: parsed.success,
    });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
