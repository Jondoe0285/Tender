import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';
import { createEnhancedVerificationInvitation } from '@/server/domain/enhancedVerificationInvitationService';

const inviteSchema = z.object({
  paymentId: z.string().min(1, 'Payment transaction ID is required'),
  recipientEmail: z.string().trim().toLowerCase().email('A valid recipient email address is required'),
  recipientName: z.string().trim().max(120).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const rateLimitError = await createRateLimitResponse(request, 'enhanced-verification-invite', { maxRequests: 10, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const user = await requireRole('USER');
    const body = await request.json().catch(() => null);
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid invitation details', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    const result = await createEnhancedVerificationInvitation({
      userId: user.id,
      paymentId: parsed.data.paymentId,
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
      ipAddress: clientIp,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Enhanced Verification has not been purchased')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}
