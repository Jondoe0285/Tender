import { prisma } from '@/server/data/prisma';
import { ValidationError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { parseMarketingEmailList, maskMarketingEmail } from '@/server/domain/marketingListParser';
import { marketingTemplateDownloadFileName, marketingTemplateForKey, marketingTemplateLabel } from '@/server/notifications/emailTemplates';
import { isEmailConfigured, sendTransactionalEmail } from '@/server/notifications/resend';
import { marketingUnsubscribeApiUrl, marketingUnsubscribeUrl } from '@/server/notifications/marketingUnsubscribe';
import { marketingCtaUrlSchema, marketingTemplateKeySchema } from '@/lib/schemas/marketing';
import { appUrl } from '@/server/config/appUrl';

export const MARKETING_SEND_BATCH_SIZE = 15;

const RECIPIENT_STATUS = {
  PENDING: 'PENDING',
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  SKIPPED_UNSUBSCRIBED: 'SKIPPED_UNSUBSCRIBED',
} as const;

export type MarketingCampaignSummary = {
  id: string;
  name: string;
  fileName: string;
  templateKey: string;
  templateLabel: string;
  ctaUrl: string | null;
  status: string;
  createdAt: string;
  sampleEmails: string[];
  counts: { pending: number; sent: number; failed: number; skipped: number; total: number };
};

export async function listMarketingCampaigns(): Promise<MarketingCampaignSummary[]> {
  const campaigns = await prisma.marketingCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, name: true, fileName: true, templateKey: true, ctaUrl: true, status: true, createdAt: true },
  });
  if (campaigns.length === 0) return [];

  const ids = campaigns.map((campaign) => campaign.id);
  const [grouped, samples] = await Promise.all([
    prisma.marketingCampaignRecipient.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: ids } },
      _count: { _all: true },
    }),
    Promise.all(ids.map((campaignId) => prisma.marketingCampaignRecipient.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
      take: 5,
      select: { campaignId: true, email: true },
    }))),
  ]);

  const countsByCampaign = new Map<string, MarketingCampaignSummary['counts']>();
  for (const campaign of campaigns) {
    countsByCampaign.set(campaign.id, { pending: 0, sent: 0, failed: 0, skipped: 0, total: 0 });
  }
  for (const row of grouped) {
    const counts = countsByCampaign.get(row.campaignId);
    if (!counts) continue;
    counts.total += row._count._all;
    if (row.status === RECIPIENT_STATUS.PENDING || row.status === RECIPIENT_STATUS.SENDING) counts.pending += row._count._all;
    else if (row.status === RECIPIENT_STATUS.SENT) counts.sent += row._count._all;
    else if (row.status === RECIPIENT_STATUS.FAILED) counts.failed += row._count._all;
    else counts.skipped += row._count._all;
  }

  const sampleByCampaign = new Map<string, string[]>();
  for (const rows of samples) {
    for (const row of rows) {
      const list = sampleByCampaign.get(row.campaignId) ?? [];
      if (list.length < 5) {
        list.push(maskMarketingEmail(row.email));
        sampleByCampaign.set(row.campaignId, list);
      }
    }
  }

  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    fileName: campaign.fileName,
    templateKey: campaign.templateKey,
    templateLabel: marketingTemplateLabel(campaign.templateKey),
    ctaUrl: campaign.ctaUrl,
    status: campaign.status,
    createdAt: campaign.createdAt.toISOString(),
    sampleEmails: sampleByCampaign.get(campaign.id) ?? [],
    counts: countsByCampaign.get(campaign.id) ?? { pending: 0, sent: 0, failed: 0, skipped: 0, total: 0 },
  }));
}

export async function createMarketingCampaign(input: {
  actorId: string;
  fileName: string;
  bytes: Buffer;
  ctaUrl: string;
  name: string;
  templateKey: string;
}): Promise<MarketingCampaignSummary> {
  const parsedTemplate = marketingTemplateKeySchema.safeParse(input.templateKey);
  if (!parsedTemplate.success) throw new ValidationError('Choose a campaign template.');
  const templateKey = parsedTemplate.data;
  const trimmedCta = input.ctaUrl.trim();
  let ctaUrl: string | null = null;
  if (trimmedCta) {
    const parsedCta = marketingCtaUrlSchema.safeParse(trimmedCta);
    if (!parsedCta.success) throw new ValidationError('The destination link must be a valid HTTPS URL.');
    ctaUrl = parsedCta.data;
  }
  const parsed = parseMarketingEmailList({ fileName: input.fileName, bytes: input.bytes });
  const unsubscribed = new Set(
    (await prisma.marketingUnsubscribe.findMany({
      where: { email: { in: parsed.emails } },
      select: { email: true },
    })).map((row) => row.email),
  );

  const defaultName = templateKey === 'SUPPLIERS'
    ? `Trade Tender Suppliers — ${parsed.fileName}`
    : `Trade Tender — ${parsed.fileName}`;
  const name = input.name.trim().slice(0, 160) || defaultName;
  const campaign = await prisma.marketingCampaign.create({
    data: {
      name,
      fileName: parsed.fileName,
      templateKey,
      ctaUrl,
      createdById: input.actorId,
    },
    select: { id: true, createdAt: true },
  });

  for (let offset = 0; offset < parsed.emails.length; offset += 500) {
    const slice = parsed.emails.slice(offset, offset + 500);
    await prisma.marketingCampaignRecipient.createMany({
      data: slice.map((email) => ({
        campaignId: campaign.id,
        email,
        status: unsubscribed.has(email) ? RECIPIENT_STATUS.SKIPPED_UNSUBSCRIBED : RECIPIENT_STATUS.PENDING,
      })),
    });
  }

  await recordAuditEvent({
    actorId: input.actorId,
    action: 'MARKETING_CAMPAIGN_CREATED',
    targetType: 'MarketingCampaign',
    targetId: campaign.id,
    metadata: { recipientCount: parsed.emails.length, skippedUnsubscribed: unsubscribed.size, ignoredCells: parsed.ignoredCells, templateKey },
  });

  const pending = parsed.emails.length - unsubscribed.size;
  return {
    id: campaign.id,
    name,
    fileName: parsed.fileName,
    templateKey,
    templateLabel: marketingTemplateLabel(templateKey),
    ctaUrl,
    status: 'DRAFT',
    createdAt: campaign.createdAt.toISOString(),
    sampleEmails: parsed.emails.slice(0, 5).map(maskMarketingEmail),
    counts: {
      pending,
      sent: 0,
      failed: 0,
      skipped: unsubscribed.size,
      total: parsed.emails.length,
    },
  };
}

export async function previewMarketingCampaign(input: { actorId: string; actorEmail: string; campaignId: string }) {
  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: input.campaignId } });
  if (!campaign) throw new ValidationError('Campaign not found.');
  await sendTradeTenderMarketingMessage(input.actorEmail, campaign.ctaUrl, campaign.templateKey);
  await recordAuditEvent({
    actorId: input.actorId,
    action: 'MARKETING_CAMPAIGN_PREVIEWED',
    targetType: 'MarketingCampaign',
    targetId: campaign.id,
    metadata: {},
  });
}

export async function sendMarketingCampaignBatch(input: {
  actorId: string;
  campaignId: string;
  confirmLawfulBasis: boolean;
}) {
  if (!isEmailConfigured()) {
    throw new ValidationError('Email is not configured. Set RESEND_API_KEY and EMAIL_FROM for this environment.');
  }

  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: input.campaignId } });
  if (!campaign) throw new ValidationError('Campaign not found.');
  if (campaign.status === 'CANCELLED') throw new ValidationError('This campaign was cancelled.');
  if (campaign.status === 'COMPLETED') {
    return { status: 'completed' as const, remaining: 0, sent: 0, failed: 0, skipped: 0 };
  }
  if (!campaign.lawfulBasisConfirmedAt) {
    if (!input.confirmLawfulBasis) {
      throw new ValidationError('Confirm you have a lawful basis to email these addresses before sending.');
    }
    await prisma.marketingCampaign.update({
      where: { id: campaign.id },
      data: { lawfulBasisConfirmedAt: new Date(), status: 'SENDING', startedAt: campaign.startedAt ?? new Date() },
    });
  } else if (campaign.status === 'DRAFT') {
    await prisma.marketingCampaign.update({
      where: { id: campaign.id },
      data: { status: 'SENDING', startedAt: campaign.startedAt ?? new Date() },
    });
  }

  const pending = await prisma.marketingCampaignRecipient.findMany({
    where: { campaignId: campaign.id, status: RECIPIENT_STATUS.PENDING },
    orderBy: { id: 'asc' },
    take: MARKETING_SEND_BATCH_SIZE,
    select: { id: true, email: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const recipient of pending) {
    const claimed = await prisma.marketingCampaignRecipient.updateMany({
      where: { id: recipient.id, status: RECIPIENT_STATUS.PENDING },
      data: { status: RECIPIENT_STATUS.SENDING },
    });
    if (claimed.count !== 1) continue;

    const unsubscribed = await prisma.marketingUnsubscribe.findUnique({ where: { email: recipient.email } });
    if (unsubscribed) {
      await prisma.marketingCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: RECIPIENT_STATUS.SKIPPED_UNSUBSCRIBED, error: null },
      });
      skipped += 1;
      continue;
    }

    const result = await sendTradeTenderMarketingMessage(recipient.email, campaign.ctaUrl, campaign.templateKey);
    if (result.sent) {
      await prisma.marketingCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: RECIPIENT_STATUS.SENT, sentAt: new Date(), error: null },
      });
      sent += 1;
    } else {
      await prisma.marketingCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: RECIPIENT_STATUS.FAILED, error: result.reason.slice(0, 300) },
      });
      failed += 1;
    }
  }

  const remaining = await prisma.marketingCampaignRecipient.count({
    where: { campaignId: campaign.id, status: { in: [RECIPIENT_STATUS.PENDING, RECIPIENT_STATUS.SENDING] } },
  });
  if (remaining === 0) {
    await prisma.marketingCampaign.update({
      where: { id: campaign.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  await recordAuditEvent({
    actorId: input.actorId,
    action: remaining === 0 ? 'MARKETING_CAMPAIGN_COMPLETED' : 'MARKETING_CAMPAIGN_BATCH_SENT',
    targetType: 'MarketingCampaign',
    targetId: campaign.id,
    metadata: { sent, failed, skipped, remaining },
  });

  return { status: remaining === 0 ? 'completed' as const : 'sending' as const, remaining, sent, failed, skipped };
}

export function buildMarketingTemplateDownload(templateKey: string, ctaUrl?: string | null): {
  templateKey: 'MARKETPLACE' | 'SUPPLIERS';
  filename: string;
  subject: string;
  html: string;
} {
  const parsed = marketingTemplateKeySchema.safeParse(templateKey);
  if (!parsed.success) throw new ValidationError('Choose a campaign template.');
  const key = parsed.data;
  const template = marketingTemplateForKey(key, {
    unsubscribeUrl: appUrl('/unsubscribe/marketing'),
    ctaUrl: sanitiseDownloadCta(ctaUrl),
  });
  const safeSubject = template.subject.replace(/--/g, ' ');
  const html = template.html
    .replace('<!doctype html>', `<!doctype html>\n<!-- Subject: ${safeSubject} -->`)
    .replace('<head>', `<head><title>${safeSubject}</title>`);
  return {
    templateKey: key,
    filename: marketingTemplateDownloadFileName(key),
    subject: template.subject,
    html,
  };
}

function sanitiseDownloadCta(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return trimmed;
  } catch {
    return null;
  }
}

export async function unsubscribeMarketingEmail(email: string, source: 'link' | 'one-click') {
  await prisma.marketingUnsubscribe.upsert({
    where: { email },
    update: { unsubscribedAt: new Date(), source },
    create: { email, source },
  });
  await recordAuditEvent({
    actorId: null,
    action: 'MARKETING_UNSUBSCRIBED',
    targetType: 'MarketingUnsubscribe',
    targetId: email.slice(email.indexOf('@') + 1) || 'unknown',
    metadata: { source },
  });
}

async function sendTradeTenderMarketingMessage(to: string, ctaUrl: string | null, templateKey: string) {
  const template = marketingTemplateForKey(templateKey, {
    unsubscribeUrl: marketingUnsubscribeUrl(to),
    ctaUrl,
  });
  return sendTransactionalEmail(to, template, {
    headers: {
      'List-Unsubscribe': `<${marketingUnsubscribeApiUrl(to)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    tags: [{ name: 'category', value: templateKey === 'SUPPLIERS' ? 'trade-tender-supplier-marketing' : 'trade-tender-marketing' }],
  });
}
