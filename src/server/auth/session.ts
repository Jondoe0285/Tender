import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/auth';
import { prisma } from '@/server/data/prisma';

export type SessionUser = { id: string; email: string; role: 'SUPER_USER' | 'CLIENT' | 'RETAILER'; roles: SessionUser['role'][]; isOwner: boolean; isAccountant: boolean };

type CurrentAccount = {
  id: string;
  email: string;
  role: SessionUser['role'];
  isOwner: boolean;
  isAccountant: boolean;
  suspended: boolean;
  roleMemberships: { role: SessionUser['role'] }[];
};

export function currentSessionUser(account: CurrentAccount, requestedRole: SessionUser['role']): SessionUser | null {
  if (account.suspended) return null;

  const roles = [...new Set([account.role, ...account.roleMemberships.map((membership) => membership.role)])];
  return {
    id: account.id,
    email: account.email,
    role: roles.includes(requestedRole) ? requestedRole : account.role,
    roles,
    isOwner: account.isOwner,
    isAccountant: account.isAccountant,
  };
}

/** Resolves current account claims from the server-side session identity; authorization never trusts stale JWT claims. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) return null;

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      isOwner: true,
      isAccountant: true,
      suspended: true,
      roleMemberships: { select: { role: true } },
    },
  });
  if (!account) return null;

  return currentSessionUser(account, session.user.role as SessionUser['role']);
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
