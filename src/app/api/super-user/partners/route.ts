import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { partnerRequestSchema } from '@/lib/schemas/partners';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { requireFullSuperUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { rejectCrossOrigin } from '@/server/http/origin';

const partnerSelect = {
  id: true,
  name: true,
  logoPath: true,
  destinationUrl: true,
  displayLocation: true,
  campaignSource: true,
  sortOrder: true,
  active: true,
} as const;

export async function GET() {
  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) return NextResponse.json({ error: 'Super User access required' }, { status: 403 });

  try {
    const partners = await prisma.partner.findMany({ select: partnerSelect, orderBy: [{ displayLocation: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] });
    return NextResponse.json({ partners });
  } catch {
    return NextResponse.json({ error: 'Unable to load partners' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) return NextResponse.json({ error: 'Super User access required' }, { status: 403 });

  const parsed = partnerRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid partner details' }, { status: 400 });

  try {
    const input = parsed.data;
    if (input.action === 'create') {
      const partner = await prisma.$transaction(async (transaction) => {
        const highestOrder = await transaction.partner.aggregate({ where: { displayLocation: input.partner.displayLocation }, _max: { sortOrder: true } });
        const created = await transaction.partner.create({ data: { ...input.partner, destinationUrl: input.partner.destinationUrl ?? null, campaignSource: input.partner.campaignSource ?? null, sortOrder: (highestOrder._max.sortOrder ?? -1) + 1 }, select: partnerSelect });
        await recordAuditEvent({ actorId: admin.id, action: 'PARTNER_CREATED', targetType: 'Partner', targetId: created.id, metadata: partnerMetadata(created) }, transaction);
        return created;
      });
      return NextResponse.json({ partner });
    }

    if (input.action === 'update') {
      const partner = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.partner.update({ where: { id: input.id }, data: { ...input.partner, destinationUrl: input.partner.destinationUrl ?? null, campaignSource: input.partner.campaignSource ?? null }, select: partnerSelect });
        await recordAuditEvent({ actorId: admin.id, action: 'PARTNER_UPDATED', targetType: 'Partner', targetId: updated.id, metadata: partnerMetadata(updated) }, transaction);
        return updated;
      });
      return NextResponse.json({ partner });
    }

    if (input.action === 'toggle') {
      const partner = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.partner.update({ where: { id: input.id }, data: { active: input.active }, select: partnerSelect });
        await recordAuditEvent({ actorId: admin.id, action: input.active ? 'PARTNER_ACTIVATED' : 'PARTNER_DEACTIVATED', targetType: 'Partner', targetId: updated.id, metadata: partnerMetadata(updated) }, transaction);
        return updated;
      });
      return NextResponse.json({ partner });
    }

    await prisma.$transaction(async (transaction) => {
      const current = await transaction.partner.findMany({ where: { displayLocation: input.displayLocation }, select: { id: true } });
      if (current.length !== input.orderedIds.length || current.some((partner) => !input.orderedIds.includes(partner.id))) {
        throw new InvalidPartnerOrderError();
      }
      await Promise.all(input.orderedIds.map((id, sortOrder) => transaction.partner.update({ where: { id }, data: { sortOrder } })));
      await recordAuditEvent({ actorId: admin.id, action: 'PARTNER_REORDERED', targetType: 'Partner', targetId: 'partner-order', metadata: { displayLocation: input.displayLocation, orderedIds: input.orderedIds } }, transaction);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvalidPartnerOrderError) return NextResponse.json({ error: 'Partner order no longer matches the selected location' }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2025')) {
      return NextResponse.json({ error: error.code === 'P2002' ? 'A partner with that name already exists' : 'Partner not found' }, { status: error.code === 'P2002' ? 409 : 404 });
    }
    return NextResponse.json({ error: 'Unable to save partner changes' }, { status: 500 });
  }
}

class InvalidPartnerOrderError extends Error {}

function partnerMetadata(partner: { name: string; displayLocation: string; campaignSource: string | null; active: boolean; sortOrder: number }) {
  return { name: partner.name, displayLocation: partner.displayLocation, campaignSource: partner.campaignSource, active: partner.active, sortOrder: partner.sortOrder };
}