import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { isSameOriginRequest } from '@/server/http/origin';
import { prisma } from '@/server/data/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addTeamMemberSchema = z.object({
  email: z.string().email('Invalid email'),
  permissions: z.string(), // comma-separated permission names (VIEW, EDIT, SUPER_USER, PAYMENTS)
});

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'USER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get retailer profile
    const profile = await prisma.retailerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    }

    // Get all team members for this retailer
    const teamMembers = await prisma.retailerTeamMember.findMany({
      where: { retailerId: profile.id },
      include: {
        user: {
          select: { id: true, email: true, contactName: true },
        },
      },
    });

    return NextResponse.json(teamMembers, { status: 200 });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // CSRF protection
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'USER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = addTeamMemberSchema.parse(body);

    // Get retailer profile
    const profile = await prisma.retailerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    }

    // Check if user already exists as a team member
    const existingMember = await prisma.retailerTeamMember.findFirst({
      where: {
        retailerId: profile.id,
        user: { email: parsed.email },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a team member' },
        { status: 400 }
      );
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User with this email does not exist' },
        { status: 404 }
      );
    }

    // Check if user is already a team member of another retailer
    const existingTeamMembership = await prisma.retailerTeamMember.findUnique({
      where: { userId: targetUser.id },
    });

    if (existingTeamMembership) {
      return NextResponse.json(
        { error: 'User is already a team member of another retailer' },
        { status: 400 }
      );
    }

    // Add team member
    const teamMember = await prisma.retailerTeamMember.create({
      data: {
        retailerId: profile.id,
        userId: targetUser.id,
        permissions: parsed.permissions,
      },
      include: {
        user: {
          select: { id: true, email: true, contactName: true },
        },
      },
    });

    return NextResponse.json(teamMember, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
