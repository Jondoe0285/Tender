import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { getAdminSettings } from '@/server/domain/platformSettings';
import { requireOwner } from '@/server/auth/session';

const settingSchema = z.object({
  action: z.enum(['fee', 'tier', 'subscription']),
  id: z.string().optional(),
  key: z.enum(['RETAILER_UNLOCK_FEE_GBP', 'CLIENT_RELEASE_FEE_GBP', 'CLIENT_RELEASE_FEE_MODE', 'CLIENT_RELEASE_PERCENTAGE_LOW', 'CLIENT_RELEASE_PERCENTAGE_HIGH', 'SPONSORED_PLACEMENT_ACTIVE', 'SPONSORED_PLACEMENT_FEE_GBP', 'MEMBERSHIP_TIERS_ACTIVE', 'ADSPACE_ACTIVE']).optional(),
  value: z.union([z.number().nonnegative(), z.enum(['FIXED', 'PERCENTAGE']), z.boolean()]).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  annualPriceGbp: z.number().int().nonnegative().optional(),
  monthlyPriceGbp: z.number().int().nonnegative().optional(),
  freeTenderOpportunitiesPerMonth: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireRole('SUPER_USER');
    return NextResponse.json(await getAdminSettings());
  } catch {
    return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  // Fees, adspace, membership tiers, and subscriptions are critical revenue settings reserved to the Owner.
  const admin = await requireOwner().catch(() => null);
  if (!admin) return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  const parsed = settingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid setting details' }, { status: 400 });
  const input = parsed.data;

  if (input.action === 'fee') {
    if (!input.key || input.value === undefined) return NextResponse.json({ error: 'Fee key and value are required' }, { status: 400 });
    if (input.key === 'CLIENT_RELEASE_FEE_MODE' && typeof input.value !== 'string') return NextResponse.json({ error: 'A fee mode is required' }, { status: 400 });
    if (['SPONSORED_PLACEMENT_ACTIVE', 'MEMBERSHIP_TIERS_ACTIVE', 'ADSPACE_ACTIVE'].includes(input.key) && typeof input.value !== 'boolean') return NextResponse.json({ error: 'An active flag is required' }, { status: 400 });
    if (!['CLIENT_RELEASE_FEE_MODE', 'SPONSORED_PLACEMENT_ACTIVE', 'MEMBERSHIP_TIERS_ACTIVE', 'ADSPACE_ACTIVE'].includes(input.key) && typeof input.value !== 'number') return NextResponse.json({ error: 'A numeric fee value is required' }, { status: 400 });
    if (input.key.includes('PERCENTAGE') && typeof input.value === 'number' && (input.value > 100 || Math.round(input.value * 100) !== input.value * 100)) return NextResponse.json({ error: 'Percentage must be between 0 and 100 with up to two decimal places' }, { status: 400 });
    await prisma.platformSetting.upsert({ where: { key: input.key }, update: { value: String(input.value) }, create: { key: input.key, value: String(input.value) } });
    await recordAuditEvent({ actorId: admin.id, action: 'PLATFORM_FEE_UPDATED', targetType: 'PlatformSetting', targetId: input.key, metadata: { value: input.value } });
    return NextResponse.json({ status: 'updated' });
  }

  if (input.action === 'tier') {
    if (!input.name || input.monthlyPriceGbp === undefined || input.freeTenderOpportunitiesPerMonth === undefined) return NextResponse.json({ error: 'Name, monthly price, and monthly free opportunities are required' }, { status: 400 });
    const tier = input.id
      ? await prisma.membershipTier.update({ where: { id: input.id }, data: { name: input.name, description: input.description ?? '', monthlyPriceGbp: input.monthlyPriceGbp, freeTenderOpportunitiesPerMonth: input.freeTenderOpportunitiesPerMonth, ...(input.active === undefined ? {} : { active: input.active }) } })
      : await prisma.membershipTier.create({ data: { name: input.name, description: input.description ?? '', monthlyPriceGbp: input.monthlyPriceGbp, freeTenderOpportunitiesPerMonth: input.freeTenderOpportunitiesPerMonth, active: input.active ?? false } });
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
