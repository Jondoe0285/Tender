import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
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

function getIdentifierHash(headers: Headers, scope: string): string {
  const secret = process.env.RATE_LIMIT_HASH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'development-rate-limit-secret';
  return createHash('sha256').update(`${secret}\u0000${scope}\u0000${getClientKey(headers)}`).digest('hex');
}

export async function checkRateLimit(headers: Headers, scope: string, options: RateLimitOptions) {
  if (!Number.isSafeInteger(options.maxRequests) || options.maxRequests < 1 || !Number.isSafeInteger(options.windowMs) || options.windowMs < 1) {
    throw new Error('Rate limit options must be positive integers.');
  }

  const now = new Date(Date.now());
  const windowCutoff = new Date(now.getTime() - options.windowMs);
  const expiresAt = new Date(now.getTime() + options.windowMs);
  const identifierHash = getIdentifierHash(headers, scope);
  const rows = await prisma.$queryRaw<{ windowStartedAt: Date; requestCount: number }[]>(Prisma.sql`
    WITH expired_entries AS (
      DELETE FROM "RateLimitEntry" WHERE "expiresAt" <= ${now}
    )
    INSERT INTO "RateLimitEntry" ("identifierHash", "scope", "windowStartedAt", "requestCount", "expiresAt", "createdAt", "updatedAt")
    VALUES (${identifierHash}, ${scope}, ${now}, 1, ${expiresAt}, ${now}, ${now})
    ON CONFLICT ("identifierHash") DO UPDATE SET
      "requestCount" = CASE
        WHEN "RateLimitEntry"."windowStartedAt" <= ${windowCutoff} THEN 1
        ELSE "RateLimitEntry"."requestCount" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "RateLimitEntry"."windowStartedAt" <= ${windowCutoff} THEN ${now}
        ELSE "RateLimitEntry"."windowStartedAt"
      END,
      "expiresAt" = CASE
        WHEN "RateLimitEntry"."windowStartedAt" <= ${windowCutoff} THEN ${expiresAt}
        ELSE "RateLimitEntry"."expiresAt"
      END,
      "updatedAt" = ${now}
    WHERE "RateLimitEntry"."windowStartedAt" <= ${windowCutoff}
      OR "RateLimitEntry"."requestCount" < ${options.maxRequests}
    RETURNING "windowStartedAt", "requestCount"
  `);

  if (rows.length > 0) return { allowed: true, retryAfterSeconds: 0 };

  const entry = await prisma.rateLimitEntry.findUnique({
    where: { identifierHash },
    select: { expiresAt: true },
  });
  const retryAfterSeconds = Math.max(1, Math.ceil(((entry?.expiresAt.getTime() ?? expiresAt.getTime()) - now.getTime()) / 1000));
  return { allowed: false, retryAfterSeconds };
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
