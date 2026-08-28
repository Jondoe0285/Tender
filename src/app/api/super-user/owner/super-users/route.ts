import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { hashPassword } from '@/server/auth/password';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { createSuperUserSchema } from '@/lib/schemas/owner';

export async function GET() {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const superUsers = await prisma.user.findMany({
    where: { role: 'SUPER_USER' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, contactName: true, contactPhone: true, isOwner: true, suspended: true, createdAt: true },
  });
  return NextResponse.json({ superUsers });
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const owner = await requireOwner().catch(() => null);
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const parsed = createSuperUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid account details' }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(input.password);
  const superUser = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: 'SUPER_USER',
      isOwner: input.isOwner ?? false,
      contactName: input.contactName,
      contactPhone: input.contactPhone ?? null,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
      roleMemberships: { create: { role: 'SUPER_USER' } },
    },
  });

  await recordAuditEvent({
    actorId: owner.id,
    action: 'SUPER_USER_ACCOUNT_CREATED',
    targetType: 'User',
    targetId: superUser.id,
    metadata: { email: superUser.email, isOwner: superUser.isOwner },
  });

  return NextResponse.json({ status: 'created', accountId: superUser.id }, { status: 201 });
}
