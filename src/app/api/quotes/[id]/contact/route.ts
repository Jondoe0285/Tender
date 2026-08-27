import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { getReleasedContact } from '@/server/domain/contactReleaseService';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('CLIENT', 'RETAILER');
    const contact = await getReleasedContact(user.id, params.id);
    return NextResponse.json({ contact });
  } catch (error) {
    return toErrorResponse(error);
  }
}
