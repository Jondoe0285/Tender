import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';

const reviewSchema = z.object({ note: z.string().trim().min(3).max(500) });

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const admin = await requireFullSuperUser();
    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A review note is required' }, { status: 400 });

    const event = await prisma.moderationEvent.findUnique({ where: { id: params.id } });
    if (!event) return NextResponse.json({ error: 'Moderation event not found' }, { status: 404 });

    const reviewed = await prisma.moderationEvent.update({
      where: { id: params.id },
      data: { reviewedAt: new Date(), reviewedById: admin.id, reviewNote: parsed.data.note },
    });

    await recordAuditEvent({
      actorId: admin.id,
      action: 'MODERATION_EVENT_REVIEWED',
      targetType: 'ModerationEvent',
      targetId: reviewed.id,
      metadata: { decision: reviewed.decision, contentType: reviewed.contentType, subjectId: reviewed.actorId },
    });

    return NextResponse.json({ status: 'reviewed' });
  } catch (error) {
    return toErrorResponse(error);
  }
}
