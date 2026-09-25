import { NextResponse } from 'next/server';
import { requireOwner } from '@/server/auth/session';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { buildMarketingTemplateDownload } from '@/server/domain/marketingCampaignService';

export const runtime = 'nodejs';

export async function GET(request: Request, props: { params: Promise<{ templateKey: string }> }) {
  const rateLimitError = await createRateLimitResponse(request, 'marketing-template-download', { maxRequests: 20, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  try {
    const owner = await requireOwner();
    const { templateKey } = await props.params;
    const ctaUrl = new URL(request.url).searchParams.get('ctaUrl');
    const file = buildMarketingTemplateDownload(templateKey, ctaUrl);
    await recordAuditEvent({
      actorId: owner.id,
      action: 'MARKETING_TEMPLATE_DOWNLOADED',
      targetType: 'MarketingTemplate',
      targetId: file.templateKey,
      metadata: { filename: file.filename },
    });
    return new NextResponse(file.html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
