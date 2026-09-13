import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { prisma } from '@/server/data/prisma';
import { hashInvitationToken, verifyAndConsumeInvitationToken, verifyInvitationToken } from '@/server/domain/enhancedVerificationInvitationService';

const verifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function GET(request: Request) {
  try {
    const rateLimitError = await createRateLimitResponse(request, 'verify-invitation-get', { maxRequests: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const token = new URL(request.url).searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    const payload = verifyInvitationToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired invitation token' }, { status: 400 });
    }

    const tokenHash = hashInvitationToken(token);
    const dbRecord = await prisma.enhancedVerificationInvitation.findUnique({
      where: { tokenHash },
      select: { status: true, expiresAt: true },
    });

    if (!dbRecord || dbRecord.status !== 'PENDING' || dbRecord.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Invitation token is invalid, expired, or already used' }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      email: payload.Email,
      module: payload.Module,
      product: payload.Product,
      expiresAt: payload.ExpiresAt,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitError = await createRateLimitResponse(request, 'verify-invitation-post', { maxRequests: 10, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const body = await request.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const consumed = await verifyAndConsumeInvitationToken(parsed.data.token, user?.id);

    if (!consumed) {
      return NextResponse.json({ error: 'Invitation token is invalid, expired, or already used' }, { status: 400 });
    }

    return NextResponse.json({
      status: 'SUCCESS',
      invitationId: consumed.id,
      consumed: true,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
