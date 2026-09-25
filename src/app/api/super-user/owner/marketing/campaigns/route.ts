import { NextResponse } from 'next/server';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';
import { MAX_MARKETING_LIST_BYTES } from '@/server/domain/marketingListParser';
import { createMarketingCampaign, listMarketingCampaigns } from '@/server/domain/marketingCampaignService';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireOwner();
    return NextResponse.json({ campaigns: await listMarketingCampaigns() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const rateLimitError = await createRateLimitResponse(request, 'marketing-campaign-upload', { maxRequests: 10, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  try {
    const owner = await requireOwner();
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose an Excel workbook or CSV file of email addresses.' }, { status: 400 });
    }
    if (file.size > MAX_MARKETING_LIST_BYTES) {
      return NextResponse.json({ error: 'The spreadsheet exceeds the 5 MB upload limit.' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const campaign = await createMarketingCampaign({
      actorId: owner.id,
      fileName: file.name || 'contacts.xlsx',
      bytes,
      ctaUrl: String(form.get('ctaUrl') ?? ''),
      name: String(form.get('name') ?? ''),
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
