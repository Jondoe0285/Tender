import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/auth';
import { prisma } from '@/server/data/prisma';

export type SessionUser = { id: string; email: string; role: 'SUPER_USER' | 'USER' | 'USER'; roles: SessionUser['role'][]; isOwner: boolean; isAccountant: boolean };

/** Resolves the authenticated user from the server-side session only — never trust client-supplied identity. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) return null;

  // JWT claims are only a session hint. Reload access-critical account state so suspensions and
  // Super User permission changes take effect immediately instead of waiting for token expiry.
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      suspended: true,
      isOwner: true,
      isAccountant: true,
      sessionVersion: true,
      roleMemberships: { select: { role: true } },
    },
  });
  if (!current || current.suspended) return null;
  if ((session.user as typeof session.user & { sessionVersion?: number }).sessionVersion !== current.sessionVersion) return null;

  const roles = current.roleMemberships.length > 0
    ? current.roleMemberships.map((membership) => membership.role)
    : [current.role];
  const selectedRole = session.user.role as SessionUser['role'];
  if (!roles.includes(selectedRole)) return null;

  return {
    id: current.id,
    email: current.email,
    role: selectedRole,
    roles,
    isOwner: current.isOwner,
    isAccountant: current.isAccountant,
  };
}

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Not permitted') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Invalid request') {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Throws if there is no authenticated session, or the session role is not permitted. Fails closed. */
export async function requireRole(...roles: SessionUser['role'][]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (roles.length > 0 && !roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** Owner-gated actions require Super User plus the Owner flag. Fails closed. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireRole('SUPER_USER');
  if (!user.isOwner) throw new ForbiddenError();
  return user;
}

/** Full Super User access excludes restricted Accountant sub-accounts. Fails closed. */
export async function requireFullSuperUser(): Promise<SessionUser> {
  const user = await requireRole('SUPER_USER');
  if (user.isAccountant) throw new ForbiddenError();
  return user;
}
