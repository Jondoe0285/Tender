import { NextResponse } from 'next/server';
import { getCurrentMobileUser } from '@/server/auth/session';
import { revokeMobileDevice } from '@/server/auth/mobileDevice';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { deviceId?: unknown; refreshToken?: unknown } | null;
    const user = await getCurrentMobileUser();
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : undefined;
    if (refreshToken) {
      await revokeMobileDevice({ refreshToken, actorId: user?.id, reason: 'logout' });
    } else if (user && deviceId) {
      await revokeMobileDevice({ actorId: user.id, deviceId, reason: 'logout' });
    }
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { lastLogoutAt: new Date() } });
      await recordAuditEvent({ actorId: user.id, action: 'USER_LOGOUT', targetType: 'User', targetId: user.id, metadata: { channel: 'mobile' } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
