import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { demoRequestTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { supportEmail } from '@/lib/contact';

const demoRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  organisation: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(80),
  message: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  const rateLimitError = await createRateLimitResponse(request, 'demo-request', { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const parsed = demoRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter name, work email, organisation, role, and a short brief' }, { status: 400 });
  }

  const destination = supportEmail() ?? process.env.SUPPORT_EMAIL?.trim() ?? null;
  if (destination) {
    await sendTransactionalEmail(destination, demoRequestTemplate(parsed.data)).catch(() => null);
  }
  await recordAuditEvent({
    actorId: null,
    action: 'DEMO_REQUEST_SUBMITTED',
    targetType: 'DemoRequest',
    targetId: parsed.data.email,
    metadata: { organisation: parsed.data.organisation, role: parsed.data.role },
  });
  return NextResponse.json({ status: 'received' }, { status: 201 });
}
