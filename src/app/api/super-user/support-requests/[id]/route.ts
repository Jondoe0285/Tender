import { NextResponse } from 'next/server';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { supportRequestReviewSchema } from '@/lib/schemas/supportRequest';
import { reviewSupportRequest } from '@/server/domain/supportRequestService';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const reviewer = await requireFullSuperUser();
    const parsed = supportRequestReviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A valid action and review note are required' }, { status: 400 });
    const { id } = await props.params;
    const supportRequest = await reviewSupportRequest(reviewer, id, parsed.data.action, parsed.data.note, parsed.data.resolutionEvidence);
    return NextResponse.json({ request: supportRequest });
  } catch (error) {
    return toErrorResponse(error);
  }
}