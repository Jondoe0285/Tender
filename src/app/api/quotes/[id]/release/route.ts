import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { finalizeContactRelease } from '@/server/domain/contactReleaseService';

const bodySchema = z.object({ paymentId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('CONTRACTOR');
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const release = await finalizeContactRelease(user.id, params.id, parsed.data.paymentId);
    return NextResponse.json({ status: 'released', releaseId: release.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
