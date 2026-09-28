import { prisma } from '@/server/data/prisma';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { ValidationError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';

export async function changeAuthenticatedPassword(userId: string, currentPassword: string, newPassword: string) {
  const account = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!await verifyPassword(currentPassword, account.passwordHash)) {
    throw new ValidationError('Unable to change password with those details');
  }
  if (currentPassword === newPassword) {
    throw new ValidationError('Choose a new password that is different from the temporary password.');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
  await recordAuditEvent({ actorId: userId, action: 'CLIENT_PASSWORD_CHANGED', targetType: 'User', targetId: userId });
}
