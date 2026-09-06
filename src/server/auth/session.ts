import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { authOptions } from '@/server/auth/auth';
import { prisma } from '@/server/data/prisma';
import { verifyMobileToken } from '@/server/auth/mobileToken';

export type SessionUser = { id: string; email: string; role: 'SUPER_USER' | 'USER' | 'USER'; roles: SessionUser['role'][]; isOwner: boolean; isAccountant: boolean };

export type CurrentAccount = { id: string; email: string; role: SessionUser['role']; suspended: boolean; isOwner: boolean; isAccountant: boolean; sessionVersion: number; roleMemberships: { role: SessionUser['role'] }[] };

export function resolveCurrentUser(identity: { requestedRole: SessionUser['role'] }, current: CurrentAccount | null): SessionUser | null {
  if (!current || current.suspended) return null;
  const roles = current.roleMemberships.length > 0 ? current.roleMemberships.map((membership) => membership.role) : [current.role];
  if (!roles.includes(identity.requestedRole)) return null;
  return { id: current.id, email: current.email, role: identity.requestedRole, roles, isOwner: current.isOwner, isAccountant: current.isAccountant };
}

/** Resolves the authenticated user from the server-side session only — never trust client-supplied identity. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const authorization = (await headers()).get('authorization');
  const bearerToken = authorization?.match(/^Bearer (.+)$/i)?.[1];
  const mobileIdentity = bearerToken ? await verifyMobileToken(bearerToken) : null;
  const session = await getServerSession(authOptions);
  const userId = mobileIdentity?.userId ?? session?.user?.id;
  const requestedRole = mobileIdentity?.role ?? session?.user?.role;
  if (!userId || !requestedRole) return null;

  // JWT claims are only a session hint. Reload access-critical account state so suspensions and
  // Super User permission changes take effect immediately instead of waiting for token expiry.
  const current = await prisma.user.findUnique({
    where: { id: userId },
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
  if (mobileIdentity && current.sessionVersion !== mobileIdentity.authVersion) return null;
  const sessionVersion = (session?.user as { sessionVersion?: number } | undefined)?.sessionVersion;
  if (!mobileIdentity && sessionVersion !== current.sessionVersion) return null;

  const roles = current.roleMemberships.length > 0
    ? current.roleMemberships.map((membership) => membership.role)
    : [current.role];
  const selectedRole = requestedRole as SessionUser['role'];
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

export async function getCurrentMobileUser(): Promise<SessionUser | null> {
  const authorization = (await headers()).get('authorization');
  const bearerToken = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearerToken) return null;
  const identity = await verifyMobileToken(bearerToken);
  if (!identity) return null;
  const current = await prisma.user.findUnique({ where: { id: identity.userId }, select: { id: true, email: true, role: true, suspended: true, isOwner: true, isAccountant: true, sessionVersion: true, roleMemberships: { select: { role: true } } } });
  if (!current || current.sessionVersion !== identity.authVersion) return null;
  return resolveCurrentUser({ requestedRole: identity.role }, current);
}

export async function requireMobileUser(): Promise<SessionUser> {
  const user = await getCurrentMobileUser();
  if (!user) throw new UnauthorizedError();
  return user;
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
