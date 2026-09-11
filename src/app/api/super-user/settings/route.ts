import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { getAdminSettings } from '@/server/domain/platformSettings';
import { requireFullSuperUser, requireOwner } from '@/server/auth/session';
import { ensureDefaultMembershipTiers } from '@/server/domain/membershipService';

const settingSchema = z.object({
  action: z.enum(['fee', 'tier', 'subscription', 'support-recipient', 'verification-document']),
  id: z.string().optional(),
  key: z.enum(['RETAILER_UNLOCK_FEE_GBP', 'RETAILER_UNLOCK_FEE_MODE', 'RETAILER_UNLOCK_PERCENTAGE_LOW', 'RETAILER_UNLOCK_PERCENTAGE_HIGH', 'RETAILER_UNLOCK_PERCENTAGE_TOP', 'CONTRACTOR_SERVICE_UNLOCK_FEE_GBP', 'PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP', 'CLIENT_RELEASE_FEE_GBP', 'CLIENT_RELEASE_FEE_MODE', 'CLIENT_RELEASE_PERCENTAGE_LOW', 'CLIENT_RELEASE_PERCENTAGE_HIGH', 'CLIENT_RELEASE_PERCENTAGE_TOP', 'QUOTE_ESTIMATE_OFFSET_PERCENTAGE', 'QUOTE_ESTIMATE_MASTER_REDUCTION_PERCENTAGE', 'VAT_PERCENTAGE', 'SPONSORED_PLACEMENT_ACTIVE', 'SPONSORED_PLACEMENT_FEE_GBP', 'MEMBERSHIP_TIERS_ACTIVE', 'RETAILER_LAUNCH_CREDITS_DEFAULT', 'ADSPACE_ACTIVE', 'INDEPENDENT_REVIEW_ACTIVE', 'INDEPENDENT_REVIEW_FEE_GBP', 'INDEPENDENT_REVIEW_RENEWAL_ACTIVE', 'INDEPENDENT_REVIEW_RENEWAL_FEE_GBP', 'DIRECT_CONTACT_ACTIVE', 'DIRECT_CONTACT_FEE_GBP', 'HUMAN_REVIEW_ACTIVE']).optional(),
  value: z.union([z.number(), z.enum(['FIXED', 'PERCENTAGE']), z.boolean()]).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  annualPriceGbp: z.number().int().nonnegative().optional(),
  monthlyPriceGbp: z.number().int().nonnegative().optional(),
  freeTenderOpportunitiesPerMonth: z.number().int().nonnegative().optional(),
  additionalCreditDiscountPercentage: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
  supportRecipientEmail: z.string().trim().toLowerCase().email().max(254).nullable().optional(),
  requirements: z.record(z.string(), z.boolean()).optional(),
});

export async function GET() {
  try {
    const admin = await requireFullSuperUser();
    await ensureDefaultMembershipTiers();
    return NextResponse.json(await getAdminSettings(admin.isOwner));
  } catch {
    return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const parsed = settingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid setting details' }, { status: 400 });
  const input = parsed.data;
  const admin = input.action === 'verification-document'
    ? await requireFullSuperUser().catch(() => null)
    : await requireOwner().catch(() => null);
  if (!admin) return NextResponse.json({ error: input.action === 'verification-document' ? 'Super User access required' : 'Owner access required' }, { status: 403 });

  if (input.action === 'verification-document') {
    if (!input.requirements) return NextResponse.json({ error: 'Verification document requirements are required' }, { status: 400 });
    await prisma.platformSetting.upsert({ where: { key: 'VERIFICATION_DOCUMENT_REQUIREMENTS' }, update: { value: JSON.stringify(input.requirements) }, create: { key: 'VERIFICATION_DOCUMENT_REQUIREMENTS', value: JSON.stringify(input.requirements) } });
    await recordAuditEvent({ actorId: admin.id, action: 'VERIFICATION_DOCUMENT_REQUIREMENTS_UPDATED', targetType: 'PlatformSetting', targetId: 'VERIFICATION_DOCUMENT_REQUIREMENTS' });
    return NextResponse.json({ status: 'updated' });
  }

  if (input.action === 'support-recipient') {
    if (input.supportRecipientEmail === undefined) return NextResponse.json({ error: 'A valid support recipient email is required' }, { status: 400 });
    const current = await prisma.platformSetting.findUnique({ where: { key: 'SUPPORT_RECIPIENT_EMAIL' } });
    if (input.supportRecipientEmail === null) {
      if (current) await prisma.platformSetting.delete({ where: { key: 'SUPPORT_RECIPIENT_EMAIL' } });
    } else {
      await prisma.platformSetting.upsert({ where: { key: 'SUPPORT_RECIPIENT_EMAIL' }, update: { value: input.supportRecipientEmail }, create: { key: 'SUPPORT_RECIPIENT_EMAIL', value: input.supportRecipientEmail } });
    }
    await recordAuditEvent({ actorId: admin.id, action: 'SUPPORT_RECIPIENT_UPDATED', targetType: 'PlatformSetting', targetId: 'SUPPORT_RECIPIENT_EMAIL', metadata: { configured: input.supportRecipientEmail !== null, changed: current?.value !== input.supportRecipientEmail } });
    return NextResponse.json({ status: 'updated' });
  }

  if (input.action === 'fee') {
    if (!input.key || input.value === undefined) return NextResponse.json({ error: 'Fee key and value are required' }, { status: 400 });
    if (['RETAILER_UNLOCK_FEE_MODE', 'CLIENT_RELEASE_FEE_MODE'].includes(input.key) && typeof input.value !== 'string') return NextResponse.json({ error: 'A fee mode is required' }, { status: 400 });
    if (['SPONSORED_PLACEMENT_ACTIVE', 'MEMBERSHIP_TIERS_ACTIVE', 'ADSPACE_ACTIVE', 'INDEPENDENT_REVIEW_ACTIVE', 'INDEPENDENT_REVIEW_RENEWAL_ACTIVE', 'DIRECT_CONTACT_ACTIVE', 'HUMAN_REVIEW_ACTIVE'].includes(input.key) && typeof input.value !== 'boolean') return NextResponse.json({ error: 'An active flag is required' }, { status: 400 });
    if (!['RETAILER_UNLOCK_FEE_MODE', 'CLIENT_RELEASE_FEE_MODE', 'SPONSORED_PLACEMENT_ACTIVE', 'MEMBERSHIP_TIERS_ACTIVE', 'ADSPACE_ACTIVE', 'INDEPENDENT_REVIEW_ACTIVE', 'INDEPENDENT_REVIEW_RENEWAL_ACTIVE', 'DIRECT_CONTACT_ACTIVE', 'HUMAN_REVIEW_ACTIVE'].includes(input.key) && typeof input.value !== 'number') return NextResponse.json({ error: 'A numeric fee value is required' }, { status: 400 });
    if (input.key === 'QUOTE_ESTIMATE_OFFSET_PERCENTAGE' && typeof input.value === 'number' && (input.value < -100 || input.value > 100 || Math.round(input.value * 100) !== input.value * 100)) return NextResponse.json({ error: 'Offset percentage must be between -100 and 100 with up to two decimal places' }, { status: 400 });
    if (typeof input.value === 'number' && input.key !== 'QUOTE_ESTIMATE_OFFSET_PERCENTAGE' && input.value < 0) return NextResponse.json({ error: 'Fee values cannot be negative' }, { status: 400 });
    if ((input.key.includes('PERCENTAGE') || input.key === 'VAT_PERCENTAGE') && input.key !== 'QUOTE_ESTIMATE_OFFSET_PERCENTAGE' && typeof input.value === 'number' && (input.value > 100 || Math.round(input.value * 100) !== input.value * 100)) return NextResponse.json({ error: 'Percentage must be between 0 and 100 with up to two decimal places' }, { status: 400 });
    await prisma.platformSetting.upsert({ where: { key: input.key }, update: { value: String(input.value) }, create: { key: input.key, value: String(input.value) } });
    await recordAuditEvent({ actorId: admin.id, action: 'PLATFORM_FEE_UPDATED', targetType: 'PlatformSetting', targetId: input.key, metadata: { value: input.value } });
    return NextResponse.json({ status: 'updated' });
  }

  if (input.action === 'tier') {
    if (!input.name || input.monthlyPriceGbp === undefined || input.freeTenderOpportunitiesPerMonth === undefined || input.additionalCreditDiscountPercentage === undefined) return NextResponse.json({ error: 'Name, monthly price, monthly included credits, and additional-credit discount are required' }, { status: 400 });
    const tier = input.id
      ? await prisma.membershipTier.update({ where: { id: input.id }, data: { name: input.name, description: input.description ?? '', monthlyPriceGbp: input.monthlyPriceGbp, freeTenderOpportunitiesPerMonth: input.freeTenderOpportunitiesPerMonth, additionalCreditDiscountPercentage: input.additionalCreditDiscountPercentage, ...(input.active === undefined ? {} : { active: input.active }) } })
      : await prisma.membershipTier.create({ data: { name: input.name, description: input.description ?? '', monthlyPriceGbp: input.monthlyPriceGbp, freeTenderOpportunitiesPerMonth: input.freeTenderOpportunitiesPerMonth, additionalCreditDiscountPercentage: input.additionalCreditDiscountPercentage, active: input.active ?? false } });
    await recordAuditEvent({ actorId: admin.id, action: input.active === false ? 'MEMBERSHIP_TIER_DEACTIVATED' : 'MEMBERSHIP_TIER_UPDATED', targetType: 'MembershipTier', targetId: tier.id, metadata: { name: tier.name, active: tier.active } });
    return NextResponse.json({ tier });
  }

  if (!input.name || input.annualPriceGbp === undefined) return NextResponse.json({ error: 'Name and annual price are required' }, { status: 400 });
  const subscription = input.id
    ? await prisma.subscriptionPlan.update({ where: { id: input.id }, data: { name: input.name, description: input.description ?? '', annualPriceGbp: input.annualPriceGbp, ...(input.active === undefined ? {} : { active: input.active }) } })
    : await prisma.subscriptionPlan.create({ data: { name: input.name, description: input.description ?? '', annualPriceGbp: input.annualPriceGbp, active: input.active ?? false } });
  await recordAuditEvent({ actorId: admin.id, action: input.active === false ? 'SUBSCRIPTION_DEACTIVATED' : 'SUBSCRIPTION_UPDATED', targetType: 'SubscriptionPlan', targetId: subscription.id, metadata: { name: subscription.name, active: subscription.active } });
  return NextResponse.json({ subscription });
}
