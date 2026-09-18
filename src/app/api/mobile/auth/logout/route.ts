import { NextResponse } from 'next/server';
import { requireMobileUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';

export async function POST() {
  try {
    const user = await requireMobileUser();
    const loggedOutAt = new Date();
    await prisma.user.update({ where: { id: user.id }, data: { lastLogoutAt: loggedOutAt } });
    await recordAuditEvent({ actorId: user.id, action: 'USER_LOGOUT', targetType: 'User', targetId: user.id, metadata: { channel: 'mobile' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}