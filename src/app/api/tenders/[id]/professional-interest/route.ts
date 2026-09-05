import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { getProfessionalInterestContact, listProfessionalInterestContacts, registerProfessionalInterest } from '@/server/domain/professionalInterestService';
import { userOwnsTender } from '@/server/domain/tenderService';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const { id } = await props.params;
    await registerProfessionalInterest(user.id, id);
    return NextResponse.json({ status: 'registered' }, { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('USER');
    const { id } = await props.params;
    if (await userOwnsTender(user.id, id)) {
      return NextResponse.json({ interests: await listProfessionalInterestContacts(user.id, id) });
    }
    return NextResponse.json({ contact: await getProfessionalInterestContact(user.id, id) });
  } catch (error) { return toErrorResponse(error); }
}