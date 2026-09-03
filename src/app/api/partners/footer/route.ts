import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';

export const dynamic = 'force-dynamic';

/** Public, display-only partner data. No campaign or administration metadata is exposed. */
export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      where: { active: true, displayLocation: 'FOOTER' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, logoPath: true, destinationUrl: true },
    });
    return NextResponse.json({ partners }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return NextResponse.json({ partners: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}