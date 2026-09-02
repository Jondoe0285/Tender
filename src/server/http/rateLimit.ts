import { createHash } from 'node:crypto';
import { prisma } from '@/server/data/prisma';

export type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

function getClientKey(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim();
    if (ip) return ip;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return 'unknown';
}

function subjectHash(subject: string): string {
  return createHash('sha256').update(subject).digest('hex');
}

export function rateLimitWindow(now: Date, windowMs: number) {
  const startedAt = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  return { startedAt, expiresAt: new Date(startedAt.getTime() + windowMs) };
}

export async function checkRateLimitSubject(subject: string, scope: string, options: RateLimitOptions, now = new Date()) {
  const window = rateLimitWindow(now, options.windowMs);
  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      scope_subjectHash_windowStartedAt: {
        scope,
        subjectHash: subjectHash(subject),
        windowStartedAt: window.startedAt,
      },
    },
    create: { scope, subjectHash: subjectHash(subject), windowStartedAt: window.startedAt, expiresAt: window.expiresAt, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  const allowed = bucket.count <= options.maxRequests;
  return {
    allowed,
    count: bucket.count,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((window.expiresAt.getTime() - now.getTime()) / 1000)),
  };
}

export async function checkRateLimit(headers: Headers, scope: string, options: RateLimitOptions) {
  return checkRateLimitSubject(`ip:${getClientKey(headers)}`, scope, options);
}

export async function createRateLimitResponse(request: Request, scope: string, options: RateLimitOptions) {
  const result = await checkRateLimit(request.headers, scope, options);
  if (result.allowed) return null;

  return new Response(JSON.stringify({ error: 'Too many requests', retryAfterSeconds: result.retryAfterSeconds }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfterSeconds),
    },
  });
}

const LOGIN_LOCKOUT = { maxRequests: 10, windowMs: 15 * 60_000 };

export async function isLoginLocked(userId: string, now = new Date()): Promise<boolean> {
  const lockout = await prisma.loginLockout.findUnique({ where: { userId }, select: { lockedUntil: true } });
  return Boolean(lockout && lockout.lockedUntil > now);
}

export async function recordFailedLogin(userId: string, now = new Date()) {
  const result = await checkRateLimitSubject(`account:${userId}`, 'login-account', LOGIN_LOCKOUT, now);
  if (result.count < LOGIN_LOCKOUT.maxRequests) return false;

  await prisma.loginLockout.upsert({
    where: { userId },
    create: { userId, lockedUntil: new Date(now.getTime() + LOGIN_LOCKOUT.windowMs) },
    update: { lockedUntil: new Date(now.getTime() + LOGIN_LOCKOUT.windowMs) },
  });
  return true;
}

export async function clearLoginFailures(userId: string) {
  const accountHash = subjectHash(`account:${userId}`);
  await prisma.$transaction([
    prisma.loginLockout.deleteMany({ where: { userId } }),
    prisma.rateLimitBucket.deleteMany({ where: { scope: 'login-account', subjectHash: accountHash } }),
  ]);
}

export async function purgeExpiredRateLimitBuckets(now = new Date()): Promise<number> {
  const result = await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  return result.count;
}
