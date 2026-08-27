import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { hashPassword } from '@/server/auth/password';
import { registerSchema } from '@/lib/schemas/register';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration details' }, { status: 400 });
  }
  const input = parsed.data;

  if (input.role === 'RETAILER' && !input.companyName) {
    return NextResponse.json({ error: 'Company name is required for Retailer accounts' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    // Do not reveal whether the account exists (SEC-016).
    return NextResponse.json({ error: 'Unable to complete registration with those details' }, { status: 400 });
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: input.role,
      contactName: input.contactName,
      contactPhone: input.contactPhone ?? null,
      termsAcceptedAt: new Date(),
      ...(input.role === 'RETAILER'
        ? {
            retailerProfile: {
              create: {
                companyName: input.companyName ?? '',
                categories: (input.categories ?? []).join(','),
                coverageAreas: input.coverageAreas ?? '',
              },
            },
          }
        : {}),
    },
  });

  await recordAuditEvent({
    actorId: user.id,
    action: 'ACCOUNT_REGISTERED',
    targetType: 'User',
    targetId: user.id,
    metadata: { role: user.role },
  });

  return NextResponse.json({ status: 'ok' });
}
