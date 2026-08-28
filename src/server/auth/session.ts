import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/auth';

export type SessionUser = { id: string; email: string; role: 'SUPER_USER' | 'CLIENT' | 'RETAILER'; roles: SessionUser['role'][]; isOwner: boolean; isAccountant: boolean };

/** Resolves the authenticated user from the server-side session only — never trust client-supplied identity. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role: session.user.role as SessionUser['role'],
    roles: (session.user.roles ?? [session.user.role]) as SessionUser['role'][],
    isOwner: Boolean(session.user.isOwner),
    isAccountant: Boolean(session.user.isAccountant),
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
