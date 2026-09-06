import { NextResponse } from 'next/server';
import { authenticateCredentials } from '@/server/auth/auth';
import { issueMobileToken } from '@/server/auth/mobileToken';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';

export async function POST(request: Request) {
  const limited = await createRateLimitResponse(request, 'mobile-login', { maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const user = await authenticateCredentials(body as Record<string, unknown>);
  if (!user) return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  const role = user.role;
  if (role !== 'USER' && role !== 'SUPER_USER') return NextResponse.json({ error: 'Mobile access is unavailable.' }, { status: 403 });
  try {
    const accessToken = await issueMobileToken({ userId: user.id, role: role as 'USER' | 'SUPER_USER', authVersion: user.sessionVersion });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await recordAuditEvent({ actorId: user.id, action: 'USER_LOGIN', targetType: 'User', targetId: user.id, metadata: { channel: 'mobile' } });
    return NextResponse.json({ accessToken, expiresIn: 28800, user: { email: user.email, role: user.role, roles: user.roles } });
  } catch {
    return NextResponse.json({ error: 'Mobile access is unavailable.' }, { status: 503 });
  }
}