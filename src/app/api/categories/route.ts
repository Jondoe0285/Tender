import { NextResponse } from 'next/server';
import { getPublishedCatalog } from '@/server/domain/categoryService';

export async function GET() {
  const published = await getPublishedCatalog();
  return NextResponse.json(published);
}
