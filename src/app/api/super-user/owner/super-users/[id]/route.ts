import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { hashPassword } from '@/server/auth/password';
import { generateTemporaryPassword } from '@/server/auth/temporaryPassword';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { superUserActionSchema } from '@/lib/schemas/owner';
import { toErrorResponse } from '@/server/http/errors';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const owner = await requireOwner().catch(() => null);
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const parsed = superUserActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid action is required' }, { status: 400 });
  }
  const { action } = parsed.data;

  try {
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target || target.role !== 'SUPER_USER') {
      return NextResponse.json({ error: 'Super User account not found' }, { status: 404 });
    }

    if ((action === 'suspend' || action === 'revoke-owner') && target.id === owner.id) {
      return NextResponse.json({ error: 'You cannot remove your own Owner or Super User access' }, { status: 400 });
    }

    if (action === 'suspend') {
      await prisma.user.update({ where: { id: target.id }, data: { suspended: true } });
      await recordAuditEvent({ actorId: owner.id, action: 'SUPER_USER_SUSPENDED', targetType: 'User', targetId: target.id, metadata: { email: target.email } });
      return NextResponse.json({ status: 'suspended' });
    }

    if (action === 'activate') {
      await prisma.user.update({ where: { id: target.id }, data: { suspended: false } });
      await recordAuditEvent({ actorId: owner.id, action: 'SUPER_USER_ACTIVATED', targetType: 'User', targetId: target.id, metadata: { email: target.email } });
      return NextResponse.json({ status: 'activated' });
    }

    if (action === 'reset-password') {
      const temporaryPassword = generateTemporaryPassword();
      await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await hashPassword(temporaryPassword), sessionVersion: { increment: 1 } } });
      await recordAuditEvent({ actorId: owner.id, action: 'SUPER_USER_PASSWORD_RESET', targetType: 'User', targetId: target.id, metadata: { email: target.email } });
      return NextResponse.json({ status: 'password-reset', temporaryPassword });
    }

    if (action === 'grant-owner') {
      await prisma.user.update({ where: { id: target.id }, data: { isOwner: true } });
      await recordAuditEvent({ actorId: owner.id, action: 'SUPER_USER_OWNER_GRANTED', targetType: 'User', targetId: target.id, metadata: { email: target.email } });
      return NextResponse.json({ status: 'owner-granted' });
    }

    // revoke-owner: keep at least one Owner account so critical settings never become unmanageable.
    const ownerCount = await prisma.user.count({ where: { role: 'SUPER_USER', isOwner: true } });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: 'At least one Owner account must remain' }, { status: 400 });
    }
    await prisma.user.update({ where: { id: target.id }, data: { isOwner: false } });
    await recordAuditEvent({ actorId: owner.id, action: 'SUPER_USER_OWNER_REVOKED', targetType: 'User', targetId: target.id, metadata: { email: target.email } });
    return NextResponse.json({ status: 'owner-revoked' });
  } catch (error) {
    return toErrorResponse(error);
  }
}
