import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/server/data/prisma';

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hashVerificationToken(token), expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS) },
    }),
  ]);
  return token;
}

export async function verifyEmailVerificationToken(token: string): Promise<string | null> {
  const tokenHash = hashVerificationToken(token);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt <= new Date()) return null;

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);
  return record.userId;
}