import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { supportRequestSchema } from '@/lib/schemas/supportRequest';
import { createSupportRequest, listSupportRequestsForRequester } from '@/server/domain/supportRequestService';

export async function GET() {
  try {
    const user = await requireRole('USER', 'SUPER_USER');
    return NextResponse.json({ requests: await listSupportRequestsForRequester(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER', 'SUPER_USER');
    const parsed = supportRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request details' }, { status: 400 });
    const supportRequest = await createSupportRequest(user.id, parsed.data);
    return NextResponse.json({ request: supportRequest }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}