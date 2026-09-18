import { NextResponse } from 'next/server';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { issueTenderWarningSchema } from '@/lib/schemas/tenderWarning';
import { issueTenderWarning } from '@/server/domain/tenderWarningService';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const admin = await requireFullSuperUser();
    const parsed = issueTenderWarningSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A reason and review note are required' }, { status: 400 });
    const { id } = await props.params;
    const warning = await issueTenderWarning(admin.id, id, parsed.data);
    return NextResponse.json({ status: 'issued', warningId: warning.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}