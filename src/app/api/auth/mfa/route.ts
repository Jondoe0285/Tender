import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { ForbiddenError, requireOwnerAccount, requireRole } from '@/server/auth/session';
import { isPlatformMfaActive } from '@/server/auth/platformMfa';
import { buildMfaEnrollment, consumeRecoveryCode, encryptMfaSecret, generateRecoveryCodes, hashRecoveryCode, decryptMfaSecret, verifyMfaCode } from '@/server/auth/mfa';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';

const codeSchema = z.object({ action: z.enum(['begin', 'verify', 'disable']), code: z.string().trim().min(6).max(40).optional() });

async function requireMfaEnrollmentAccount() {
  const user = await requireRole('SUPER_USER');
  if (user.isOwner || await isPlatformMfaActive()) return user;
  throw new ForbiddenError();
}

export async function GET() {
  try {
    const user = await requireMfaEnrollmentAccount();
    const [account, enrolledCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { mfaEnabled: true, mfaVerifiedAt: true } }),
      prisma.user.count({ where: { mfaEnabled: true } }),
    ]);
    return NextResponse.json({
      enabled: account?.mfaEnabled ?? false,
      verifiedAt: account?.mfaVerifiedAt ?? null,
      enrolledCount,
      canDeactivate: user.isOwner,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  try {
    const parsed = codeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid MFA request' }, { status: 400 });

    if (parsed.data.action === 'disable') {
      const user = await requireOwnerAccount();
      return disablePlatformMfa(user.id, parsed.data.code);
    }

    const user = await requireMfaEnrollmentAccount();

    if (parsed.data.action === 'begin') {
      const account = await prisma.user.findUnique({ where: { id: user.id }, select: { mfaEnabled: true } });
      if (account?.mfaEnabled) return NextResponse.json({ error: 'Disable MFA before starting a new enrollment' }, { status: 409 });
      const enrollment = buildMfaEnrollment(user.email);
      await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecretEncrypted: encryptMfaSecret(enrollment.secret), mfaRecoveryCodesHash: null, mfaVerifiedAt: null } });
      await recordAuditEvent({ actorId: user.id, action: 'MFA_ENROLLMENT_STARTED', targetType: 'User', targetId: user.id });
      return NextResponse.json({ uri: enrollment.uri, secret: enrollment.secret, qrCodeDataUrl: await QRCode.toDataURL(enrollment.uri) });
    }

    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { mfaSecretEncrypted: true, mfaEnabled: true, mfaRecoveryCodesHash: true } });
    if (!account?.mfaSecretEncrypted || !parsed.data.code) return NextResponse.json({ error: 'Start MFA enrollment and provide a code' }, { status: 400 });
    const secret = decryptMfaSecret(account.mfaSecretEncrypted);

    if (!await verifyMfaCode(secret, parsed.data.code)) return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 });
    const recoveryCodes = generateRecoveryCodes();
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true, mfaRecoveryCodesHash: JSON.stringify(recoveryCodes.map(hashRecoveryCode)), mfaVerifiedAt: new Date(), sessionVersion: { increment: 1 } } });
    if (user.isOwner) {
      await prisma.user.updateMany({
        where: { role: 'SUPER_USER', mfaEnabled: false },
        data: { sessionVersion: { increment: 1 } },
      });
    }
    await recordAuditEvent({ actorId: user.id, action: 'MFA_ENABLED', targetType: 'User', targetId: user.id });
    return NextResponse.json({ enabled: true, recoveryCodes });
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function disablePlatformMfa(actorId: string, code: string | undefined) {
  const account = await prisma.user.findUnique({ where: { id: actorId }, select: { mfaSecretEncrypted: true, mfaEnabled: true, mfaRecoveryCodesHash: true } });
  if (!account?.mfaSecretEncrypted || !account.mfaEnabled || !code) {
    return NextResponse.json({ error: 'Start MFA enrollment and provide a code' }, { status: 400 });
  }

  const secret = decryptMfaSecret(account.mfaSecretEncrypted);
  const validTotp = await verifyMfaCode(secret, code);
  if (!validTotp) {
    const recovery = consumeRecoveryCode(account.mfaRecoveryCodesHash, code);
    if (!recovery.valid) return NextResponse.json({ error: 'Invalid MFA code' }, { status: 400 });
    const consumed = await prisma.user.updateMany({
      where: { id: actorId, mfaEnabled: true, mfaRecoveryCodesHash: account.mfaRecoveryCodesHash },
      data: { mfaRecoveryCodesHash: JSON.stringify(recovery.remaining) },
    });
    if (consumed.count !== 1) return NextResponse.json({ error: 'Invalid MFA code' }, { status: 400 });
  }

  const disabled = await prisma.user.updateMany({
    where: { mfaEnabled: true },
    data: { mfaEnabled: false, mfaSecretEncrypted: null, mfaRecoveryCodesHash: null, mfaVerifiedAt: null, sessionVersion: { increment: 1 } },
  });
  if (disabled.count < 1) return NextResponse.json({ error: 'Invalid MFA code' }, { status: 400 });
  await recordAuditEvent({
    actorId,
    action: 'MFA_DISABLED',
    targetType: 'User',
    targetId: actorId,
    metadata: { deactivatedCount: disabled.count },
  });
  return NextResponse.json({ enabled: false, deactivatedCount: disabled.count });
}
