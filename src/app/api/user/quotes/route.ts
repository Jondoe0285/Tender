import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { prisma } from '@/server/data/prisma';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const quotes = await prisma.quote.findMany({
      where: { retailerId: user.id },
      orderBy: { submittedAt: 'desc' },
      include: { tender: { select: { id: true, reference: true, subcategory: true } } },
    });
    return NextResponse.json({ quotes });
  } catch (error) {
    return toErrorResponse(error);
  }
}
