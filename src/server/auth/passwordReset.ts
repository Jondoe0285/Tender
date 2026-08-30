import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/server/data/prisma';

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const PASSWORD_RESET_EXPIRY_LABEL = '24 hours';

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Invalidates any outstanding token so only the most recent link works. */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS) },
    }),
  ]);
  return token;
}

export async function findValidPasswordResetUserId(token: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return null;
  return record.userId;
}

/**
 * Consumes the token and sets the new password in one transaction, returning the user id.
 * The conditional update means a concurrent second request cannot reuse the same token.
 */
export async function consumePasswordResetToken(token: string, passwordHash: string): Promise<string | null> {
  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return null;

  try {
    await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error('Password reset token already used');

      await transaction.user.update({
        where: { id: record.userId },
        // Completing the reset proves control of the mailbox, so the account is verified.
        data: { passwordHash, emailVerifiedAt: new Date() },
      });
    });
  } catch {
    return null;
  }
  return record.userId;
}
