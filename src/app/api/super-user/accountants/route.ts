import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { hashPassword } from '@/server/auth/password';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { createAccountantSchema } from '@/lib/schemas/accountant';

export async function GET() {
  try {
    await requireFullSuperUser();
  } catch {
    return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  }

  const accountants = await prisma.user.findMany({
    where: { role: 'SUPER_USER', isAccountant: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, contactName: true, contactPhone: true, suspended: true, createdAt: true },
  });
  return NextResponse.json({ accountants });
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  // Accountant sub-accounts are created by full Super Users only, never by other accountants.
  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) {
    return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  }

  const parsed = createAccountantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid account details' }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(input.password);
  const accountant = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: 'SUPER_USER',
      isAccountant: true,
      contactName: input.contactName,
      contactPhone: input.contactPhone ?? null,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
      roleMemberships: { create: { role: 'SUPER_USER' } },
    },
  });

  await recordAuditEvent({
    actorId: admin.id,
    action: 'ACCOUNTANT_ACCOUNT_CREATED',
    targetType: 'User',
    targetId: accountant.id,
    metadata: { email: accountant.email },
  });

  return NextResponse.json({ status: 'created', accountId: accountant.id }, { status: 201 });
}
