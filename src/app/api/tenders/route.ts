import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createTenderSchema } from '@/lib/schemas/tender';
import { createTender, listTendersForClient } from '@/server/domain/tenderService';

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('CLIENT');
    const body = await request.json().catch(() => null);
    const parsed = createTenderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid tender details', issues: parsed.error.flatten() }, { status: 400 });
    }
    const tender = await createTender(user.id, parsed.data);
    return NextResponse.json({ id: tender.id, reference: tender.reference }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET() {
  try {
    const user = await requireRole('CLIENT');
    const tenders = await listTendersForClient(user.id);
    return NextResponse.json({ tenders });
  } catch (error) {
    return toErrorResponse(error);
  }
}
