import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { getCategoryCatalog } from '@/server/domain/categoryService';

export async function GET() {
  try {
    await requireRole('CONTRACTOR');
    return NextResponse.json({ catalog: await getCategoryCatalog() });
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
}
