import { NextResponse } from 'next/server';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { releaseLegalHoldSchema } from '@/lib/schemas/legalHold';
import { releaseLegalHold } from '@/server/domain/legalHoldService';
import { toErrorResponse } from '@/server/http/errors';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) return NextResponse.json({ error: 'Super User access required' }, { status: 403 });

  const parsed = releaseLegalHoldSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A release reason is required' }, { status: 400 });

  try {
    const hold = await releaseLegalHold(admin.id, params.id, parsed.data.reason);
    return NextResponse.json({ hold });
  } catch (error) {
    return toErrorResponse(error);
  }
}