import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { requireRole } from '@/server/auth/session';
import { buildMfaEnrollment, consumeRecoveryCode, encryptMfaSecret, generateRecoveryCodes, hashRecoveryCode, decryptMfaSecret, verifyMfaCode } from '@/server/auth/mfa';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';

const codeSchema = z.object({ action: z.enum(['begin', 'verify', 'disable']), code: z.string().trim().min(6).max(40).optional() });

export async function GET() {
  try {
    const user = await requireRole('SUPER_USER');
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { mfaEnabled: true, mfaVerifiedAt: true } });
    return NextResponse.json({ enabled: account?.mfaEnabled ?? false, verifiedAt: account?.mfaVerifiedAt ?? null });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole('SUPER_USER');
    const parsed = codeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid MFA request' }, { status: 400 });

    if (parsed.data.action === 'begin') {
      const enrollment = buildMfaEnrollment(user.email);
      await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecretEncrypted: encryptMfaSecret(enrollment.secret), mfaRecoveryCodesHash: null, mfaVerifiedAt: null, sessionVersion: { increment: 1 } } });
      await recordAuditEvent({ actorId: user.id, action: 'MFA_ENROLLMENT_STARTED', targetType: 'User', targetId: user.id });
      return NextResponse.json({ uri: enrollment.uri, secret: enrollment.secret, qrCodeDataUrl: await QRCode.toDataURL(enrollment.uri) });
    }

    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { mfaSecretEncrypted: true, mfaEnabled: true, mfaRecoveryCodesHash: true } });
    if (!account?.mfaSecretEncrypted || !parsed.data.code) return NextResponse.json({ error: 'Start MFA enrollment and provide a code' }, { status: 400 });
    const secret = decryptMfaSecret(account.mfaSecretEncrypted);

    if (parsed.data.action === 'verify') {
      if (!await verifyMfaCode(secret, parsed.data.code)) return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 });
      const recoveryCodes = generateRecoveryCodes();
      await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true, mfaRecoveryCodesHash: JSON.stringify(recoveryCodes.map(hashRecoveryCode)), mfaVerifiedAt: new Date(), sessionVersion: { increment: 1 } } });
      await recordAuditEvent({ actorId: user.id, action: 'MFA_ENABLED', targetType: 'User', targetId: user.id });
      return NextResponse.json({ enabled: true, recoveryCodes });
    }

    if (account.mfaEnabled) {
      const validTotp = await verifyMfaCode(secret, parsed.data.code);
      const recovery = validTotp ? { valid: true, remaining: account.mfaRecoveryCodesHash ? JSON.parse(account.mfaRecoveryCodesHash) : null } : consumeRecoveryCode(account.mfaRecoveryCodesHash, parsed.data.code);
      if (!recovery.valid) return NextResponse.json({ error: 'Invalid MFA code' }, { status: 400 });
      await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecretEncrypted: null, mfaRecoveryCodesHash: null, mfaVerifiedAt: null, sessionVersion: { increment: 1 } } });
      await recordAuditEvent({ actorId: user.id, action: 'MFA_DISABLED', targetType: 'User', targetId: user.id });
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({ error: 'MFA is not enabled' }, { status: 400 });
  } catch (error) {
    return toErrorResponse(error);
  }
}