const RATE_LIMIT_STORE = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;
const MAX_BUCKET_SIZE = 1_000;

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

function pruneRateLimitStore(now: number) {
  if (RATE_LIMIT_STORE.size <= MAX_TRACKED_KEYS) return;

  const entries = [...RATE_LIMIT_STORE.entries()].sort(([, left], [, right]) => (left[0] ?? 0) - (right[0] ?? 0));
  for (const [key, bucket] of entries) {
    if (RATE_LIMIT_STORE.size <= MAX_TRACKED_KEYS) break;

    const pruned = bucket.filter((timestamp) => now - timestamp < 60_000);
    if (pruned.length === 0) {
      RATE_LIMIT_STORE.delete(key);
      continue;
    }

    RATE_LIMIT_STORE.set(key, pruned);
    if (RATE_LIMIT_STORE.size <= MAX_TRACKED_KEYS) break;
  }
}

export function checkRateLimit(headers: Headers, scope: string, options: RateLimitOptions) {
  const key = `${scope}:${getClientKey(headers)}`;
  const now = Date.now();
  const windowMs = options.windowMs;
  const maxRequests = options.maxRequests;
  const bucket = RATE_LIMIT_STORE.get(key) ?? [];
  const filtered = bucket.filter((timestamp) => now - timestamp < windowMs).slice(-MAX_BUCKET_SIZE);

  if (filtered.length === 0) {
    RATE_LIMIT_STORE.delete(key);
  } else {
    RATE_LIMIT_STORE.set(key, filtered);
  }

  pruneRateLimitStore(now);

  const allowed = filtered.length < maxRequests;
  if (allowed) {
    filtered.push(now);
    RATE_LIMIT_STORE.set(key, filtered);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const oldest = filtered[0] ?? now;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
  RATE_LIMIT_STORE.set(key, filtered);

  return { allowed: false, retryAfterSeconds };
}

export function createRateLimitResponse(request: Request, scope: string, options: RateLimitOptions) {
  const result = checkRateLimit(request.headers, scope, options);
  if (result.allowed) return null;

  return new Response(JSON.stringify({ error: 'Too many requests', retryAfterSeconds: result.retryAfterSeconds }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfterSeconds),
    },
  });
}
