import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { submitQuoteSchema } from '@/lib/schemas/quote';
import { submitQuote, listQuotesForClientTender } from '@/server/domain/quoteService';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('PROVIDER');
    const parsed = submitQuoteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid quote details', issues: parsed.error.flatten() }, { status: 400 });
    }
    const quote = await submitQuote(user.id, params.id, parsed.data);
    return NextResponse.json({ id: quote.id, reference: quote.reference }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await requireRole('CONTRACTOR');
    const quotes = await listQuotesForClientTender(user.id, params.id);
    return NextResponse.json({ quotes });
  } catch (error) {
    return toErrorResponse(error);
  }
}
