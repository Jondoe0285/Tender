import { NextResponse } from 'next/server';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createLegalHoldSchema } from '@/lib/schemas/legalHold';
import { createLegalHold } from '@/server/domain/legalHoldService';
import { toErrorResponse } from '@/server/http/errors';

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) return NextResponse.json({ error: 'Super User access required' }, { status: 403 });

  const parsed = createLegalHoldSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Valid legal hold details are required' }, { status: 400 });

  try {
    const hold = await createLegalHold(admin.id, parsed.data);
    return NextResponse.json({ hold }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}