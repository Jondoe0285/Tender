import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { getBuyerCapabilities } from '@/server/domain/workspacePermissions';

export async function GET() {
  try {
    const user = await requireRole('USER');
    return NextResponse.json(await getBuyerCapabilities(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
