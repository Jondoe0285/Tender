import { prisma } from '@/server/data/prisma';

/** MFA is on for operators once at least one active Owner has enrolled. */
export async function isPlatformMfaActive(): Promise<boolean> {
  const enrolledOwners = await prisma.user.count({
    where: { isOwner: true, suspended: false, mfaEnabled: true },
  });
  return enrolledOwners > 0;
}

/** Super Users must enrol TOTP while Owner MFA is active. Marketplace users never do. */
export function superUserMfaSatisfied(
  account: { role: string; mfaEnabled: boolean },
  platformMfaActive: boolean,
): boolean {
  if (account.role !== 'SUPER_USER') return true;
  if (!platformMfaActive) return true;
  return account.mfaEnabled;
}
