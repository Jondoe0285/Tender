import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { confirmControlChange, rejectControlChange } from '@/server/domain/controlChangeService';

const bodySchema = z.object({ action: z.enum(['confirm', 'reject']) });

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  try {
    const owner = await requireOwner();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Confirm or reject is required' }, { status: 400 });
    const { id } = await props.params;
    if (parsed.data.action === 'confirm') await confirmControlChange(owner.id, id);
    else await rejectControlChange(owner.id, id);
    return NextResponse.json({ status: parsed.data.action === 'confirm' ? 'confirmed' : 'rejected' });
  } catch (error) {
    return toErrorResponse(error);
  }
}
