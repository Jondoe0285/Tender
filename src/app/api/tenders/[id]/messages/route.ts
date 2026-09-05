import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { listTenderMessages, sendTenderMessage } from '@/server/domain/messageService';

const messageSchema = z.object({ body: z.string().trim().min(1).max(2000), quoteId: z.string().min(1).optional() });

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await requireRole('CONTRACTOR', 'PROVIDER');
    const actor = { id: user.id, role: user.role as 'CONTRACTOR' | 'PROVIDER' };
    const quoteId = new URL(request.url).searchParams.get('quoteId') ?? undefined;
    const messages = await listTenderMessages(params.id, actor, quoteId);
    return NextResponse.json({ messages });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('CONTRACTOR', 'PROVIDER');
    const actor = { id: user.id, role: user.role as 'CONTRACTOR' | 'PROVIDER' };
    const parsed = messageSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    const message = await sendTenderMessage(params.id, actor, parsed.data.body, parsed.data.quoteId);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}