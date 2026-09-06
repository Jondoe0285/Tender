import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';

const entitlementSchema = z.object({
  type: z.enum(['membership', 'subscription']),
  planId: z.string().min(1),
  active: z.boolean(),
  startDate: z.string().date().optional(),
  expiryMonths: z.union([z.literal(6), z.literal(12)]).optional(),
});

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  // Free entitlement grants bypass the payment flow, so Accountant sub-accounts must not reach this route.
  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  const parsed = entitlementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid entitlement details' }, { status: 400 });
  const input = parsed.data;
  const retailer = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } });
  if (!retailer || retailer.role !== 'USER') return NextResponse.json({ error: 'Retailer not found' }, { status: 404 });

  if (input.type === 'membership') {
    const tier = await prisma.membershipTier.findUnique({ where: { id: input.planId } });
    if (!tier) return NextResponse.json({ error: 'Membership tier not found' }, { status: 404 });
    if (input.active && (!input.startDate || !input.expiryMonths)) return NextResponse.json({ error: 'A start date and a 6 or 12 month expiry are required' }, { status: 400 });
    const startsAt = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined;
    const expiresAt = startsAt && input.expiryMonths ? addCalendarMonths(startsAt, input.expiryMonths) : undefined;
    const assignment = await prisma.retailerMembership.upsert({
      where: { retailerId_tierId: { retailerId: retailer.id, tierId: tier.id } },
      update: { active: input.active, ...(startsAt && expiresAt ? { assignedAt: startsAt, expiresAt } : {}) },
      create: { retailerId: retailer.id, tierId: tier.id, active: input.active, ...(startsAt && expiresAt ? { assignedAt: startsAt, expiresAt } : {}) },
    });
    await recordAuditEvent({ actorId: admin.id, action: input.active ? 'MEMBERSHIP_ASSIGNED' : 'MEMBERSHIP_DEACTIVATED', targetType: 'RetailerMembership', targetId: assignment.id, metadata: { retailerId: retailer.id, tierId: tier.id, assignedAt: assignment.assignedAt.toISOString(), expiresAt: assignment.expiresAt?.toISOString() } });
    return NextResponse.json({ assignment });
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: input.planId } });
  if (!plan) return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
  const assignment = await prisma.retailerSubscription.upsert({ where: { retailerId_planId: { retailerId: retailer.id, planId: plan.id } }, update: { active: input.active }, create: { retailerId: retailer.id, planId: plan.id, active: input.active } });
  await recordAuditEvent({ actorId: admin.id, action: input.active ? 'SUBSCRIPTION_ASSIGNED' : 'SUBSCRIPTION_DEACTIVATED', targetType: 'RetailerSubscription', targetId: assignment.id, metadata: { retailerId: retailer.id, planId: plan.id } });
  return NextResponse.json({ assignment });
}
