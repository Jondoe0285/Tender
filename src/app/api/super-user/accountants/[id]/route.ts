import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { hashPassword } from '@/server/auth/password';
import { generateTemporaryPassword } from '@/server/auth/temporaryPassword';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { accountantActionSchema } from '@/lib/schemas/accountant';
import { toErrorResponse } from '@/server/http/errors';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) {
    return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  }

  const parsed = accountantActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid action is required' }, { status: 400 });
  }
  const { action } = parsed.data;

  try {
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target || target.role !== 'SUPER_USER' || !target.isAccountant) {
      return NextResponse.json({ error: 'Accountant account not found' }, { status: 404 });
    }

    if (action === 'suspend') {
      await prisma.user.update({ where: { id: target.id }, data: { suspended: true } });
      await recordAuditEvent({ actorId: admin.id, action: 'ACCOUNTANT_SUSPENDED', targetType: 'User', targetId: target.id, metadata: { email: target.email } });
      return NextResponse.json({ status: 'suspended' });
    }

    if (action === 'activate') {
      await prisma.user.update({ where: { id: target.id }, data: { suspended: false } });
      await recordAuditEvent({ actorId: admin.id, action: 'ACCOUNTANT_ACTIVATED', targetType: 'User', targetId: target.id, metadata: { email: target.email } });
      return NextResponse.json({ status: 'activated' });
    }

    const temporaryPassword = generateTemporaryPassword();
    await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await hashPassword(temporaryPassword) } });
    await recordAuditEvent({ actorId: admin.id, action: 'ACCOUNTANT_PASSWORD_RESET', targetType: 'User', targetId: target.id, metadata: { email: target.email } });
    return NextResponse.json({ status: 'password-reset', temporaryPassword });
  } catch (error) {
    return toErrorResponse(error);
  }
}
