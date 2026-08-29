import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { isManagedAccountRole } from '@/lib/admin-permissions';
import { hashPassword } from '@/server/auth/password';
import { recordAuditEvent } from '@/server/audit/auditLog';

function generateTemporaryPassword(): string {
  return `TT-${Math.random().toString(36).slice(2, 10).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const admin = await requireRole('SUPER_USER').catch(() => null);
  if (!admin) {
    return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  if (user.role === 'SUPER_USER') {
    return NextResponse.json({ error: 'Super User accounts cannot be modified through this endpoint' }, { status: 400 });
  }

  if (!isManagedAccountRole(user.role)) {
    return NextResponse.json({ error: 'This endpoint only manages Client and Retailer accounts' }, { status: 400 });
  }

  if (action === 'suspend') {
    await prisma.user.update({
      where: { id: user.id },
      data: { suspended: true },
    });
    await recordAuditEvent({
      actorId: admin.id,
      action: 'USER_SUSPENDED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email },
    });
    return NextResponse.json({ status: 'suspended' });
  }

  if (action === 'activate') {
    await prisma.user.update({
      where: { id: user.id },
      data: { suspended: false },
    });
    await recordAuditEvent({
      actorId: admin.id,
      action: 'USER_ACTIVATED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email },
    });
    return NextResponse.json({ status: 'activated' });
  }

  if (action === 'reset-password') {
    const temporaryPassword = generateTemporaryPassword();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(temporaryPassword) },
    });
    await recordAuditEvent({
      actorId: admin.id,
      action: 'USER_PASSWORD_RESET',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email },
    });
    return NextResponse.json({ status: 'password-reset', temporaryPassword });
  }

  if (action === 'set-release-credits') {
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Release credits only apply to Client accounts' }, { status: 400 });
    }
    const releaseCreditsLeft = Number(body?.releaseCreditsLeft);
    if (!Number.isInteger(releaseCreditsLeft) || releaseCreditsLeft < 0) {
      return NextResponse.json({ error: 'releaseCreditsLeft must be a non-negative integer' }, { status: 400 });
    }

    const membership = await prisma.clientCompanyMember.findUnique({
      where: { userId: user.id },
      include: { company: { select: { id: true, releaseCreditsLeft: true } } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Client company record not found' }, { status: 404 });
    }

    await prisma.clientCompany.update({
      where: { id: membership.company.id },
      data: { releaseCreditsLeft },
    });
    await recordAuditEvent({
      actorId: admin.id,
      action: 'CLIENT_RELEASE_CREDITS_UPDATED',
      targetType: 'ClientCompany',
      targetId: membership.company.id,
      metadata: { email: user.email, previous: membership.company.releaseCreditsLeft, next: releaseCreditsLeft },
    });
    return NextResponse.json({ status: 'release-credits-updated', releaseCreditsLeft });
  }

  if (action === 'set-launch-credits') {
    if (user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Launch credits only apply to Retailer accounts' }, { status: 400 });
    }
    const launchCreditsLeft = Number(body?.launchCreditsLeft);
    if (!Number.isInteger(launchCreditsLeft) || launchCreditsLeft < 0) {
      return NextResponse.json({ error: 'launchCreditsLeft must be a non-negative integer' }, { status: 400 });
    }

    const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { launchCreditsLeft: true } });
    if (!profile) {
      return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    }

    await prisma.retailerProfile.update({ where: { userId: user.id }, data: { launchCreditsLeft } });
    await recordAuditEvent({
      actorId: admin.id,
      action: 'RETAILER_LAUNCH_CREDITS_UPDATED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email, previous: profile.launchCreditsLeft, next: launchCreditsLeft },
    });
    return NextResponse.json({ status: 'launch-credits-updated', launchCreditsLeft });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
