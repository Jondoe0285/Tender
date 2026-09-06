import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'trade-tender-api';
const AUDIENCE = 'trade-tender-mobile';
const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

type MobileRole = 'SUPER_USER' | 'USER';

export type MobileTokenIdentity = {
  userId: string;
  role: MobileRole;
  authVersion: number;
  issuedAt: number;
};

function tokenKey() {
  const secret = process.env.MOBILE_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('MOBILE_AUTH_SECRET must be configured with at least 32 characters.');
  return new TextEncoder().encode(secret);
}

export async function issueMobileToken(identity: Omit<MobileTokenIdentity, 'issuedAt'>) {
  return new SignJWT({ role: identity.role, authVersion: identity.authVersion, tokenUse: 'mobile-access' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(identity.userId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_LIFETIME_SECONDS}s`)
    .sign(tokenKey());
}

export async function verifyMobileToken(token: string): Promise<MobileTokenIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, tokenKey(), { issuer: ISSUER, audience: AUDIENCE });
    if (payload.tokenUse !== 'mobile-access' || !payload.sub || typeof payload.iat !== 'number' || typeof payload.authVersion !== 'number' || !Number.isSafeInteger(payload.authVersion) || payload.authVersion < 0 || (payload.role !== 'SUPER_USER' && payload.role !== 'USER')) return null;
    return { userId: payload.sub, role: payload.role, authVersion: payload.authVersion, issuedAt: payload.iat * 1000 };
  } catch {
    return null;
  }
}