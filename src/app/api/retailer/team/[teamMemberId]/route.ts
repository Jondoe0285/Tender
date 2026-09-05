import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { isSameOriginRequest } from '@/server/http/origin';
import { prisma } from '@/server/data/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updatePermissionsSchema = z.object({
  permissions: z.string(), // comma-separated permission names
});

async function getUserRetailerId(userId: string): Promise<string | null> {
  const profile = await prisma.retailerProfile.findUnique({
    where: { userId },
  });
  return profile?.id ?? null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ teamMemberId: string }> }
) {
  // CSRF protection
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { teamMemberId } = await params;
    const body = await req.json();
    const parsed = updatePermissionsSchema.parse(body);

    // Get current user's retailer profile
    const userRetailerId = await getUserRetailerId(user.id);
    if (!userRetailerId) {
      return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    }

    // Verify team member belongs to this retailer
    const teamMember = await prisma.retailerTeamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!teamMember || teamMember.retailerId !== userRetailerId) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Prevent changing master user's permissions
    const retailerProfile = await prisma.retailerProfile.findUnique({
      where: { id: userRetailerId },
    });

    if (retailerProfile?.masterUserId === teamMember.userId) {
      return NextResponse.json(
        { error: 'Cannot change master user permissions' },
        { status: 400 }
      );
    }

    // Update permissions
    const updated = await prisma.retailerTeamMember.update({
      where: { id: teamMemberId },
      data: { permissions: parsed.permissions },
      include: {
        user: {
          select: { id: true, email: true, contactName: true },
        },
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamMemberId: string }> }
) {
  // CSRF protection
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { teamMemberId } = await params;

    // Get current user's retailer profile
    const userRetailerId = await getUserRetailerId(user.id);
    if (!userRetailerId) {
      return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    }

    // Verify team member belongs to this retailer
    const teamMember = await prisma.retailerTeamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!teamMember || teamMember.retailerId !== userRetailerId) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Prevent removing master user
    const retailerProfile = await prisma.retailerProfile.findUnique({
      where: { id: userRetailerId },
    });

    if (retailerProfile?.masterUserId === teamMember.userId) {
      return NextResponse.json(
        { error: 'Cannot remove master user from team' },
        { status: 400 }
      );
    }

    // Delete team member
    await prisma.retailerTeamMember.delete({
      where: { id: teamMemberId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
